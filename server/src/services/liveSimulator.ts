import { v4 as uuid } from 'uuid';
import knex from '../db/knex';
import { getChatsForCategory, genericChats } from '../chat-templates';
import { analyzeChatBatch, generateInsight, recommendScript } from './llmService';

interface ProductSKU {
  product_id: string;
  product_name: string;
  sale_price: number;
  sku_id: string;
  sku_name: string;
}

interface SimulatorState {
  liveId: string;
  running: boolean;
  interval: NodeJS.Timeout | null;
  online: number;
  baseOnline: number;
  totalOrders: number;
  gmv: number;
  peakOnline: number;
  startTime: Date;
  pendingChats: { id: string; content: string }[];
  lastAnalysisTime: number;
  lastInsightTime: number;
  sentimentCounts: { positive: number; neutral: number; negative: number };
  category: string;
  productSkus: ProductSKU[];  // Pre-loaded SKUs for this session's category
  currentProduct: ProductSKU;
  productIndex: number;
  productSwitchTime: number;
  recentChats: string[];
}

const sessions: Map<string, SimulatorState> = new Map();
const sseClients: Map<string, Set<any>> = new Map();

export function getSimulator(liveId: string) {
  return sessions.get(liveId);
}

export function addSSEClient(liveId: string, res: any) {
  if (!sseClients.has(liveId)) sseClients.set(liveId, new Set());
  sseClients.get(liveId)!.add(res);
}

export function removeSSEClient(liveId: string, res: any) {
  sseClients.get(liveId)?.delete(res);
}

function broadcast(liveId: string, event: string, data: any) {
  const clients = sseClients.get(liveId);
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) {
    try { res.write(payload); } catch { /* client disconnected */ }
  }
}

async function loadSessionSKUs(liveId: string, category: string): Promise<ProductSKU[]> {
  const rows = await knex('SKU')
    .join('Product', 'SKU.product_id', 'Product.product_id')
    .select(
      'SKU.sku_id',
      'SKU.sku_name',
      'Product.product_id',
      'Product.product_name',
      'Product.sale_price'
    )
    .where('Product.category', category || '女装')
    .where('Product.product_status', '在售')
    .where('SKU.sku_status', '在售')
    .limit(100);

  if (rows.length === 0) {
    // Fallback: any products
    const fallback = await knex('SKU')
      .join('Product', 'SKU.product_id', 'Product.product_id')
      .select(
        'SKU.sku_id',
        'SKU.sku_name',
        'Product.product_id',
        'Product.product_name',
        'Product.sale_price'
      )
      .where('Product.product_status', '在售')
      .where('SKU.sku_status', '在售')
      .limit(100);
    return fallback;
  }
  return rows;
}

export async function startSimulation(liveId: string) {
  if (sessions.has(liveId)) return;

  const session = await knex('LiveSession').where('live_id', liveId).first();
  if (!session) throw new Error('Session not found');

  const category = session.live_category || '女装';
  const productSkus = await loadSessionSKUs(liveId, category);
  const firstProduct = productSkus[Math.floor(Math.random() * productSkus.length)];

  const state: SimulatorState = {
    liveId,
    running: true,
    interval: null,
    online: 500 + Math.floor(Math.random() * 2000),
    baseOnline: 500 + Math.floor(Math.random() * 2000),
    totalOrders: 0,
    gmv: 0,
    peakOnline: 0,
    startTime: new Date(),
    pendingChats: [],
    lastAnalysisTime: Date.now(),
    lastInsightTime: Date.now(),
    sentimentCounts: { positive: 0, neutral: 0, negative: 0 },
    category,
    productSkus,
    currentProduct: firstProduct,
    productIndex: 0,
    productSwitchTime: Date.now() + 30000 + Math.random() * 60000,
    recentChats: [],
  };

  await knex('LiveSession').where('live_id', liveId).update({
    live_status: '进行中',
    start_time: new Date(),
  });

  sessions.set(liveId, state);

  // Send initial current product
  broadcast(liveId, 'current_product', {
    product_name: firstProduct?.product_name || '热卖商品',
    price: firstProduct?.sale_price || 99,
  });

  state.interval = setInterval(() => tick(state), 2000 + Math.random() * 3000);
}

export async function stopSimulation(liveId: string) {
  const state = sessions.get(liveId);
  if (!state) return;

  state.running = false;
  if (state.interval) clearInterval(state.interval);
  sessions.delete(liveId);

  const orderStats = await knex('[Order]')
    .where('live_id', liveId)
    .sum('order_amount as total')
    .count('* as count')
    .first();

  await knex('LiveSession').where('live_id', liveId).update({
    live_status: '已结束',
    end_time: new Date(),
    online_peak: state.peakOnline || state.online,
    total_sales: orderStats?.total || state.gmv,
  });
}

async function tick(state: SimulatorState) {
  if (!state.running) return;

  // 1. Product rotation (every 30-90 seconds)
  const now = Date.now();
  if (now > state.productSwitchTime && state.productSkus.length > 1) {
    state.productIndex = (state.productIndex + 1) % state.productSkus.length;
    state.currentProduct = state.productSkus[state.productIndex];
    state.productSwitchTime = now + 30000 + Math.random() * 60000;

    broadcast(state.liveId, 'current_product', {
      product_name: state.currentProduct.product_name,
      price: state.currentProduct.sale_price,
    });
  }

  // 2. Online number walk
  const walk = Math.floor((Math.random() - 0.45) * 200);
  state.online = Math.max(50, state.online + walk);
  if (state.online > state.peakOnline) state.peakOnline = state.online;

  // 3. Generate orders — pick from session's actual SKUs
  const orderProb = 0.0008 * state.online;
  if (Math.random() < orderProb) {
    const user = await knex('User').orderByRaw('NEWID()').first();
    // Pick a random SKU from our session's product list
    const sku = state.productSkus[Math.floor(Math.random() * state.productSkus.length)];
    if (user && sku) {
      const orderId = uuid().replace(/-/g, '').substring(0, 16);
      const salePrice = parseFloat(String(sku.sale_price)) || 99;
      const discount = Math.random() > 0.7 ? Math.floor(Math.random() * Math.min(30, salePrice * 0.15)) : 0;
      const amount = salePrice - discount;

      await knex('[Order]').insert({
        order_id: orderId,
        user_id: user.user_id,
        live_id: state.liveId,
        sku_id: sku.sku_id,
        original_price: salePrice,
        discount_amount: discount,
        order_quantity: 1,
        order_amount: amount > 0 ? amount : salePrice,
        payment_status: '已支付',
        order_status: '已完成',
        order_time: new Date(),
      });
      state.totalOrders++;
      state.gmv += amount > 0 ? amount : salePrice;

      await knex('SKU').where('sku_id', sku.sku_id).decrement('stock_quantity', 1);
      await knex('SKU').where('sku_id', sku.sku_id).increment('sales_volume', 1);

      broadcast(state.liveId, 'order', {
        orderId,
        userId: user.user_id,
        nickname: user.nickname,
        productName: sku.product_name?.substring(0, 10),
        skuName: sku.sku_name?.substring(0, 10),
        amount: amount > 0 ? amount : salePrice,
        time: new Date().toISOString(),
      });
    }
  }

  // 4. Generate chats — include current product name for context
  const chatCount = Math.floor(Math.random() * 5) + 1;
  for (let i = 0; i < chatCount; i++) {
    const categoryChats = getChatsForCategory(state.category);
    const allChats = [...categoryChats, ...genericChats];
    let content = allChats[Math.floor(Math.random() * allChats.length)];

    // Inject product name occasionally
    if (Math.random() < 0.15 && state.currentProduct) {
      content = content.replace(/这个|产品/g, state.currentProduct.product_name?.substring(0, 6) || '这个');
    }

    const chatId = uuid().replace(/-/g, '').substring(0, 16);
    const user = await knex('User').orderByRaw('NEWID()').first();

    await knex('InteractionLog').insert({
      interaction_id: chatId,
      live_id: state.liveId,
      user_id: user?.user_id || null,
      interaction_type: '弹幕',
      interaction_content: content,
      interaction_time: new Date(),
      analysis_status: '待分析',
    });

    state.pendingChats.push({ id: chatId, content });
    state.recentChats.push(content);
    if (state.recentChats.length > 20) state.recentChats.shift();

    broadcast(state.liveId, 'chat', {
      id: chatId,
      userId: user?.user_id || '',
      nickname: user?.nickname || '匿名用户',
      content,
      type: '弹幕',
      sentiment: null,
      time: new Date().toISOString(),
    });
  }

  // 5. Trigger LLM analysis
  if (state.pendingChats.length >= 20 || (state.pendingChats.length > 0 && now - state.lastAnalysisTime > 15000)) {
    const batch = state.pendingChats.splice(0, state.pendingChats.length);
    const results = await analyzeChatBatch(batch);

    for (const r of results) {
      if (r.sentiment === '正面') state.sentimentCounts.positive++;
      else if (r.sentiment === '负面') state.sentimentCounts.negative++;
      else state.sentimentCounts.neutral++;

      await knex('InteractionLog').where('interaction_id', r.id).update({
        sentiment_label: r.sentiment,
        semantic_label: r.semantic_label,
        purchase_intention: r.purchase_intention,
        confidence_score: r.confidence,
        analysis_status: '已分析',
      });
    }

    const total = state.sentimentCounts.positive + state.sentimentCounts.neutral + state.sentimentCounts.negative || 1;
    const sentimentStats = {
      positive: Math.round((state.sentimentCounts.positive / total) * 100),
      neutral: Math.round((state.sentimentCounts.neutral / total) * 100),
      negative: Math.round((state.sentimentCounts.negative / total) * 100),
    };

    state.lastAnalysisTime = now;
    broadcast(state.liveId, 'sentiment', sentimentStats);

    // Check signal triggers
    const recentText = state.recentChats.join('; ');
    if (recentText.includes('贵') || recentText.includes('便宜') || recentText.includes('价格')) {
      const script = await recommendScript('价格质疑', state.currentProduct?.product_name || '热卖商品', state.currentProduct?.sale_price || 99, recentText, sentimentStats);
      if (script) broadcast(state.liveId, 'script_recommendation', { trigger: '价格质疑', scriptSnippet: script, reason: '检测到价格相关讨论增多' });
    } else if (sentimentStats.negative > 35) {
      const script = await recommendScript('负面情绪', state.currentProduct?.product_name || '热卖商品', state.currentProduct?.sale_price || 99, recentText, sentimentStats);
      if (script) broadcast(state.liveId, 'script_recommendation', { trigger: '负面情绪', scriptSnippet: script, reason: '负面情绪占比超过35%' });
    }
  }

  // 6. Generate insights every ~2 minutes
  if (now - state.lastInsightTime > 120000) {
    const total = state.sentimentCounts.positive + state.sentimentCounts.neutral + state.sentimentCounts.negative || 1;
    const summary = state.recentChats.slice(-10).join('; ');
    const insight = await generateInsight(summary, {
      positive: Math.round((state.sentimentCounts.positive / total) * 100),
      neutral: Math.round((state.sentimentCounts.neutral / total) * 100),
      negative: Math.round((state.sentimentCounts.negative / total) * 100),
    });
    state.lastInsightTime = now;
    broadcast(state.liveId, 'llm_insight', { ...insight, timestamp: new Date().toISOString() });
  }

  // 7. Push metrics
  broadcast(state.liveId, 'metrics', {
    online: state.online,
    totalOrders: state.totalOrders,
    gmv: Math.round(state.gmv * 100) / 100,
    peakOnline: state.peakOnline,
    duration: Math.floor((now - state.startTime.getTime()) / 1000),
  });
}
