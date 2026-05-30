import dotenv from 'dotenv';
import path from 'path';
import knex from 'knex';
import knexConfig from './src/db/knexfile';
import OpenAI from 'openai';
import * as fs from 'fs';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const db = knex(knexConfig);
const openai = new OpenAI({
  apiKey: process.env.LLM_API_KEY || 'sk-xxx',
  baseURL: process.env.LLM_BASE_URL || 'https://api.deepseek.com/v1',
});
const MODEL = process.env.LLM_MODEL || 'deepseek-chat';
const DATA_DIR = path.resolve(__dirname, 'src/db/seeds');

const CATEGORIES = ['女装', '美妆', '箱包', '运动户外', '零食', '家居用品', '母婴', '数码', '食品饮料'];
const SCRIPT_TYPES = ['开场', '讲解', '促单', '答疑', '结尾'];
const CATEGORY_SPECS: Record<string, { priceRange: [number, number]; costRatio: number; colors: string[]; sizes: string[]; keywords: string }> = {
  '女装': { priceRange: [59, 499], costRatio: 0.25, colors: ['黑色','白色','杏色','雾霾蓝','焦糖','奶白','藏青','墨绿','酒红','燕麦色'], sizes: ['S','M','L','XL','XXL'], keywords: '显瘦、高级感、通勤、约会、法式、复古、设计感' },
  '美妆': { priceRange: [29, 399], costRatio: 0.20, colors: ['#01自然色','#02象牙白','#03暖肤色'], sizes: ['30ml','50ml','100ml','正装','小样'], keywords: '持妆、水润、哑光、养肤、温和' },
  '箱包': { priceRange: [79, 899], costRatio: 0.30, colors: ['黑色','棕色','米白','酒红','卡其','灰色','驼色'], sizes: ['小号','中号','大号','mini'], keywords: '真皮、轻便、通勤、百搭、质感、大容量' },
  '运动户外': { priceRange: [39, 699], costRatio: 0.35, colors: ['黑色','灰色','军绿','藏青','荧光绿','橙色'], sizes: ['S','M','L','XL','均码'], keywords: '速干、防泼水、透气、轻量、减震、防滑' },
  '零食': { priceRange: [9.9, 89], costRatio: 0.40, colors: [], sizes: ['100g','200g','500g','礼盒装','分享装'], keywords: '酥脆、爆浆、0添加、低卡、解馋、追剧必备' },
  '家居用品': { priceRange: [19, 499], costRatio: 0.30, colors: ['白色','灰色','米色','原木色','莫兰迪色系'], sizes: ['小号','中号','大号','标准'], keywords: '北欧风、ins风、收纳、高颜值、实用、省空间' },
  '母婴': { priceRange: [29, 599], costRatio: 0.28, colors: ['粉色','蓝色','米白','淡黄','浅绿'], sizes: ['S','M','L','新生儿','均码'], keywords: 'A类纯棉、无荧光剂、安全、柔软、亲肤、加厚' },
  '数码': { priceRange: [49, 999], costRatio: 0.45, colors: ['黑色','白色','深空灰','银色'], sizes: ['标准','Pro','lite'], keywords: '快充、降噪、高清、稳定、便携、智能' },
  '食品饮料': { priceRange: [19.9, 199], costRatio: 0.35, colors: [], sizes: ['250ml','500ml','礼盒装','箱装','袋装'], keywords: '0添加、有机、鲜榨、醇香、健康、送礼' },
};

const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
const randomId = () => Array.from({ length: 16 }, () => '0123456789abcdef'[Math.floor(Math.random() * 16)]).join('');
function randomDate(from: string, to: string): Date {
  const f = new Date(from).getTime(), t = new Date(to).getTime();
  return new Date(f + Math.random() * (t - f));
}
function rd(from: string, to: string): string { return randomDate(from, to).toISOString(); }
function pick<T>(arr: T[]): T { return arr[Math.floor(Math.random() * arr.length)]; }

// Progress bar
function bar(current: number, total: number, label: string = '', width: number = 30): string {
  const pct = total > 0 ? current / total : 0;
  const filled = Math.round(pct * width);
  const empty = width - filled;
  const pctStr = (pct * 100).toFixed(0).padStart(3);
  const cntStr = `${current}/${total}`.padStart(String(total).length * 2 + 1);
  return `  [${'█'.repeat(filled)}${'░'.repeat(empty)}] ${pctStr}% ${cntStr} ${label}`;
}

// ===== LLM call with retry =====
async function llm(prompt: string, maxTokens = 4096): Promise<string> {
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const resp = await openai.chat.completions.create({
        model: MODEL, messages: [{ role: 'user', content: prompt }],
        temperature: 0.85, max_tokens: maxTokens,
      });
      return resp.choices[0].message.content || '';
    } catch (e: any) {
      if (attempt === 2) throw e;
      console.error(`    LLM retry ${attempt + 1}: ${e.message}`);
      await delay(2000);
    }
  }
  return '';
}

function parseJSON(raw: string): any {
  let s = raw.replace(/```json\s*/g, '').replace(/```\s*/g, '').trim();
  const start = Math.min(
    s.indexOf('[') === -1 ? Infinity : s.indexOf('['),
    s.indexOf('{') === -1 ? Infinity : s.indexOf('{')
  );
  if (start === Infinity) throw new Error('No JSON found');
  return JSON.parse(s.substring(start));
}

// Extract string values from LLM response (handles both ["str"] and [{name:"str"}] formats)
function extractStrings(arr: any[], field: string): string[] {
  const result: string[] = [];
  for (const item of arr) {
    if (typeof item === 'string') {
      const s = item.trim();
      if (s.length >= 2 && s.length <= 120) result.push(s);
    } else if (typeof item === 'object' && item !== null) {
      // Try field first, then common name fields
      const val = item[field] || item.name || item.title || item.content || item.text || '';
      if (typeof val === 'string' && val.trim().length >= 2) result.push(val.trim());
    }
  }
  return result;
}

// Validate object arrays for description/selling_points style fields
function validateObjects(arr: any[], field: string, minLen: number): any[] {
  return arr.filter(item => {
    if (typeof item === 'object' && item !== null && item[field]) {
      return String(item[field]).length >= minLen;
    }
    return false;
  });
}

// ===== Phase 1: LLM 商品名称 =====
async function genProductNames(): Promise<Record<string, string[]>> {
  console.log('\n[Phase 1] LLM 商品名称');
  const cachePath = path.join(DATA_DIR, 'llm-products.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const count = Object.values(cached).reduce((s: number, a: any) => s + (Array.isArray(a) ? a.length : 0), 0);
    console.log(`  ✓ 从缓存加载 ${count} 个商品名`);
    return cached as Record<string, string[]>;
  }
  const result: Record<string, string[]> = {};
  let catIdx = 0;
  for (const cat of CATEGORIES) {
    const spec = CATEGORY_SPECS[cat];
    const prompt = `你是直播电商选品专家。为"${cat}"品类生成25个直播带货商品名称。价格¥${spec.priceRange[0]}~${spec.priceRange[1]}，关键词:${spec.keywords}。要求：具体有吸引力，如"法式复古碎花连衣裙""持妆控油粉底液SPF50"。返回JSON数组：["商品名1","商品名2",...]`;
    try {
      const raw = await llm(prompt);
      const arr: any[] = parseJSON(raw);
      const names = extractStrings(arr, '');
      result[cat] = names.slice(0, 25);
      catIdx++;
      console.log(`  ${bar(catIdx, CATEGORIES.length, `${cat}`)} ${result[cat].length}个`);
    } catch (e: any) { catIdx++; console.error(`  ${bar(catIdx, CATEGORIES.length, `${cat}`)} ✗ ${e.message}`); result[cat] = []; }
    await delay(500);
  }
  fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf-8');
  return result;
}

// ===== Phase 2: LLM 供应商名 =====
async function genSuppliers(): Promise<string[]> {
  console.log('\n[Phase 2] LLM 供应商企业名');
  const cachePath = path.join(DATA_DIR, 'llm-suppliers.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    console.log(`  从缓存加载 ${cached.length} 个`);
    return cached as string[];
  }
  const prompt = `生成30个真实风格的中国供应商企业全称。覆盖女装(7家/xx服饰)、美妆(5家/xx生物科技)、箱包(4家/xx皮具)、运动户外(3家)、零食(4家/xx食品)、家居(2家)、母婴(2家)、数码(3家/xx电子)。地名含广州深圳杭州义乌南通泉州东莞佛山。返回JSON数组`;
  const raw = await llm(prompt);
  const arr: any[] = parseJSON(raw);
  const names = extractStrings(arr, '');
  console.log(`  ${names.length} 个`);
  fs.writeFileSync(cachePath, JSON.stringify(names, null, 2), 'utf-8');
  return names;
}

// ===== Phase 3: LLM 弹幕模板 =====
async function genChatTemplates(): Promise<Record<string, string[]>> {
  console.log('\n[Phase 3] LLM 分品类弹幕模板');
  const cachePath = path.join(DATA_DIR, 'llm-chats.json');
  if (fs.existsSync(cachePath)) {
    const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
    const count = Object.values(cached).reduce((s: number, a: any) => s + (Array.isArray(a) ? a.length : 0), 0);
    console.log(`  ✓ 从缓存加载 ${count} 条弹幕`);
    return cached as Record<string, string[]>;
  }
  const result: Record<string, string[]> = {};
  let catIdx = 0;
  for (const cat of CATEGORIES) {
    const spec = CATEGORY_SPECS[cat];
    const prompt = `你是直播运营。为"${cat}"品类直播间生成100条真实弹幕。价格¥${spec.priceRange[0]}~${spec.priceRange[1]}。涵盖：产品咨询、价格讨论、购买信号、品质反馈、直播互动、负面投诉。每条10~35字口语化带emoji。返回JSON字符串数组：["弹幕1","弹幕2",...]`;
    try {
      const raw = await llm(prompt, 6000);
      const arr: any[] = parseJSON(raw);
      const msgs = extractStrings(arr, '');
      result[cat] = msgs.slice(0, 100);
      catIdx++;
      console.log(`  ${bar(catIdx, CATEGORIES.length, `${cat}`)} ${result[cat].length}条`);
    } catch (e: any) { catIdx++; console.error(`  ${bar(catIdx, CATEGORIES.length, `${cat}`)} ✗`); result[cat] = []; }
    await delay(500);
  }
  fs.writeFileSync(cachePath, JSON.stringify(result, null, 2), 'utf-8');
  return result;
}

// ===== Phase 4: 重建 Product + SKU（LLM 名称 + 程序化属性）=====
async function rebuildProducts(
  productNames: Record<string, string[]>, supplierNames: string[]
): Promise<{ products: any[]; skus: any[] }> {
  console.log('\n[Phase 4] 重建商品和SKU');

  const suppliers = await db('Supplier').select('supplier_id');
  const sids = suppliers.map(s => s.supplier_id);

  // Clean dependent data
  await db('UserBehaviorStat').del();
  await db('ProductPerformance').del();
  await db('AnchorPerformance').del();
  await db('PurchaseSuggestion').del();
  await db('AfterSale').del();
  await db('InteractionLog').del();
  await db('[Order]').del();
  await db('Script').del();
  await db('PurchaseOrder').del();
  await db('Inventory').del();
  await db('SKU').del();
  await db('Product').del();

  const products: any[] = [], skus: any[] = [];
  let pc = 0, sc = 0;

  for (const cat of CATEGORIES) {
    const names = productNames[cat] || [];
    const spec = CATEGORY_SPECS[cat];
    for (const name of names) {
      const pid = randomId();
      const cost = +(spec.priceRange[0] + Math.random() * (spec.priceRange[1] - spec.priceRange[0]) * spec.costRatio).toFixed(2);
      const sale = +(cost / spec.costRatio * (0.88 + Math.random() * 0.24)).toFixed(2);
      const gp = +(((sale - cost) / sale) * 100).toFixed(2);
      products.push({
        product_id: pid, product_name: name, category: cat,
        brand: pick(supplierNames),
        cost_price: cost, sale_price: sale,
        gross_profit_rate: Math.min(gp, 85),
        product_status: Math.random() > 0.12 ? '在售' : '下架',
        supplier_id: pick(sids),
        description: '', selling_points: '',
        create_time: rd('2024-06-01', '2025-05-01'),
      });
      pc++;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let s = 0; s < n; s++) {
        const color = spec.colors.length > 0 ? pick(spec.colors) : '均色';
        const size = spec.sizes.length > 0 ? pick(spec.sizes) : '均码';
        skus.push({
          sku_id: randomId(), product_id: pid,
          sku_name: `${name} (${color}/${size})`,
          color, size, specification: `${color} ${size}`,
          stock_quantity: 20 + Math.floor(Math.random() * 480),
          warning_threshold: 30 + Math.floor(Math.random() * 70),
          sales_volume: Math.floor(Math.random() * 1500),
          sku_status: '在售',
        });
        sc++;
      }
    }
  }
  // MSSQL max 2100 params: Product 12 cols × 170 = 2040, SKU 10 cols × 200 = 2000
  await db.batchInsert('Product', products, 170);
  await db.batchInsert('SKU', skus, 200);
  console.log(`  ✓ ${pc} 商品, ${sc} SKU`);
  return { products, skus };
}

// ===== Phase 5: LLM 商品描述+卖点 =====
async function genProductDescriptions() {
  console.log('\n[Phase 5] LLM 商品描述和卖点');
  const products = await db('Product').select('*');
  let done = 0, batchNum = 0;
  const B = 15;
  for (let i = 0; i < products.length; i += B) {
    batchNum++;
    const batch = products.slice(i, i + B);
    const list = batch.map(p => `[${p.product_id}] ${p.product_name}|品类:${p.category}|售价:¥${p.sale_price}`).join('\n');
    const prompt = `你是选品专家。为以下商品生成描述和卖点。\n${list}\n要求：description(100~180字专业描述)、selling_points(4~6条卖点逗号分隔)。返回JSON:[{"id":"商品ID","description":"...","selling_points":"卖点1，卖点2"},...]`;
    try {
      const raw = await llm(prompt, 6000);
      const results: any[] = parseJSON(raw);
      for (const r of validateObjects(results, 'description', 20)) {
        await db('Product').where('product_id', r.id).update({ description: r.description, selling_points: r.selling_points });
        done++;
      }
    } catch (e: any) { console.error(`  批${batchNum} ✗: ${e.message}`); }
    const current = Math.min(i + B, products.length);
    console.log(`  ${bar(current, products.length, '描述')} ${done}完成`);
    await delay(600);
  }
  console.log(`  ✓ 共 ${done} 条`);
}

// ===== Phase 6: 创建脚本框架 + LLM 内容 =====
async function genScripts(products: any[]) {
  console.log('\n[Phase 6] LLM 带货脚本');
  const anchors = await db('Anchor').select('anchor_id');
  const aids = anchors.map(a => a.anchor_id);

  // Create script records
  const scripts: any[] = [];
  for (const p of products.slice(0, 200)) { // ~200 products get scripts
    const count = 1 + Math.floor(Math.random() * 4); // 1-5 scripts per product
    for (let i = 0; i < count; i++) {
      scripts.push({
        script_id: randomId(), product_id: p.product_id, live_id: null,
        anchor_id: pick(aids),
        script_title: `${p.product_name}${pick(SCRIPT_TYPES)}脚本`,
        script_content: '', // LLM fills
        script_type: pick(SCRIPT_TYPES),
        tags: pick(['高转化', '标准', '热门', '新品']),
        conversion_rate: +(Math.random() * 5 + 1).toFixed(2),
        recommendation_level: pick(['高', '中', '低']),
        create_time: rd('2024-08-01', '2025-05-01'),
      });
    }
  }

  // Delete old + insert new
  await db('Script').del();
  await db.batchInsert('Script', scripts, 150);
  console.log(`  ✓ 创建 ${scripts.length} 条脚本框架`);

  // Now enhance with LLM
  console.log('  LLM 生成脚本内容...');
  const allScripts = await db('Script')
    .join('Product', 'Script.product_id', 'Product.product_id')
    .select('Script.script_id', 'Script.script_type', 'Product.product_name', 'Product.category', 'Product.sale_price', 'Product.cost_price');
  let done = 0;
  const B2 = 5;
  for (let i = 0; i < allScripts.length; i += B2) {
    const batch = allScripts.slice(i, i + B2);
    const items = batch.map(s =>
      `[ID:${s.script_id}] 商品:"${s.product_name}"(${s.category})|售价:¥${s.sale_price}|类型:${s.script_type}`
    ).join('\n');
    const prompt = `你是头部带货主播文案。为以下每个[ID]写可直口播的逐字稿。\n${items}\n类型要求：开场(60~80秒欢迎+福利预告)、讲解(90~120秒痛点+展示+卖点逐一击破)、促单(30~50秒库存紧迫+限时优惠逼单)、答疑(60~80秒打消顾虑建立信任)、结尾(30~50秒回顾+关注引导)。口语化、用"家人们/姐妹们"、适当emoji和感叹号。返回JSON:[{"id":"脚本ID","content":"逐字稿..."},...]`;
    try {
      const raw = await llm(prompt, 6000);
      const results: any[] = parseJSON(raw);
      for (const r of results) {
        if (r.id && r.content && r.content.length > 40) {
          await db('Script').where('script_id', r.id).update({ script_content: r.content });
          done++;
        }
      }
    } catch (e: any) { /* individual retries on next batch */ }
    console.log(`  ${bar(Math.min(i + B2, allScripts.length), allScripts.length, '脚本')} ${done}完成`);
    await delay(600);
  }
  console.log(`  ✓ 脚本内容 ${done} 条`);
}

// ===== Phase 7: 重建订单 =====
async function rebuildOrders(skus: any[], products: any[]) {
  console.log('\n[Phase 7] 重建订单');
  const sessions = await db('LiveSession').select('*').whereNot('live_status', '已排期');
  const urows = await db('User').select('user_id').limit(2000);
  const uids = urows.map((u: any) => u.user_id);
  const prodMap = new Map(products.map(p => [p.product_id, p]));
  const skuByProd = new Map<string, any[]>();
  for (const s of skus) { const l = skuByProd.get(s.product_id) || []; l.push(s); skuByProd.set(s.product_id, l); }
  await db('[Order]').del();
  let total = 0, batch: any[] = [], sessDone = 0;
  for (const sess of sessions) {
    sessDone++;
    const st = new Date(sess.start_time), et = sess.end_time ? new Date(sess.end_time) : new Date(st.getTime() + 4 * 3600000);
    const dur = et.getTime() - st.getTime();
    const count = sess.live_status === '已结束' ? 80 + Math.floor(Math.random() * 220) : 20 + Math.floor(Math.random() * 80);
    const catProds = products.filter(p => !sess.live_category || p.category === sess.live_category || Math.random() < 0.15);
    if (catProds.length === 0) continue;
    for (let o = 0; o < count; o++) {
      const prod = pick(catProds);
      const pskus = skuByProd.get(prod.product_id);
      if (!pskus || pskus.length === 0) continue;
      const sku = pick(pskus);
      const op = parseFloat(prod.sale_price) || 50;
      const disc = Math.random() > 0.72 ? +(op * Math.random() * 0.25).toFixed(2) : 0;
      const qty = 1 + (Math.random() > 0.82 ? (Math.random() > 0.5 ? 1 : 2) : 0);
      const amt = +((op - disc) * qty).toFixed(2); // FIXED: multiply by qty
      const t = (Math.random() * 0.6 + 0.2); // middle 60% of session
      const otime = new Date(st.getTime() + t * dur);
      batch.push({
        order_id: randomId(), user_id: pick(uids), live_id: sess.live_id, sku_id: sku.sku_id,
        original_price: op, discount_amount: disc, order_quantity: qty, order_amount: amt,
        payment_status: '已支付',
        order_status: Math.random() > 0.05 ? '已完成' : (Math.random() > 0.5 ? '已发货' : '已退货'),
        order_time: otime,
      });
      if (batch.length >= 150) { await db.batchInsert('[Order]', batch, 150); total += batch.length; batch = []; }
    }
    if (sessDone % 50 === 0) console.log(`  ${bar(sessDone, sessions.length, '订单')} ${total}条`);
  }
  if (batch.length > 0) { await db.batchInsert('[Order]', batch, 150); total += batch.length; }
  console.log(`  ${bar(sessions.length, sessions.length, '订单')} ✓ ${total} 条`);
}

// ===== Phase 8: 重建互动日志 =====
async function rebuildInteractions(chatTemplates: Record<string, string[]>) {
  console.log('\n[Phase 8] 重建互动日志');
  const sessions = await db('LiveSession').select('live_id', 'live_category', 'start_time', 'end_time').whereNot('live_status', '已排期');
  const urows = await db('User').select('user_id').limit(1000);
  const uids = urows.map((u: any) => u.user_id);
  await db('InteractionLog').del();
  let total = 0, batch: any[] = [], sessDone = 0;
  for (const sess of sessions) {
    sessDone++;
    const cat = sess.live_category || '女装';
    const temps = chatTemplates[cat];
    if (!temps || temps.length === 0) continue;
    const count = 400 + Math.floor(Math.random() * 1100);
    const st = new Date(sess.start_time), et = sess.end_time ? new Date(sess.end_time) : new Date(st.getTime() + 4 * 3600000);
    const dur = et.getTime() - st.getTime();
    for (let i = 0; i < count; i++) {
      batch.push({
        interaction_id: randomId(), live_id: sess.live_id,
        user_id: pick(uids),
        interaction_type: Math.random() > 0.12 ? '弹幕' : (['点赞', '分享', '关注'] as const)[Math.floor(Math.random() * 3)],
        interaction_content: pick(temps),
        interaction_time: new Date(st.getTime() + Math.random() * dur),
        sentiment_label: null, semantic_label: null, confidence_score: null, purchase_intention: null,
        analysis_status: '待分析',
      });
      if (batch.length >= 200) { await db.batchInsert('InteractionLog', batch, 150); total += batch.length; batch = []; }
    }
    if (sessDone % 50 === 0) console.log(`  ${bar(sessDone, sessions.length, '弹幕')} ${total}条`);
  }
  if (batch.length > 0) { await db.batchInsert('InteractionLog', batch, 150); total += batch.length; }
  console.log(`  ${bar(sessions.length, sessions.length, '弹幕')} ✓ ${total} 条`);
}

// ===== Phase 9: 重建库存 =====
async function rebuildInventory(skus: any[]) {
  console.log('\n[Phase 9] 重建库存');
  await db('Inventory').del();
  const warehouses = ['北京仓', '上海仓', '广州仓', '成都仓'];
  let count = 0, batch: any[] = [];
  for (const sku of skus) {
    const n = 1 + Math.floor(Math.random() * 2);
    for (let i = 0; i < n; i++) {
      const stock = 5 + Math.floor(Math.random() * sku.stock_quantity);
      batch.push({
        inventory_id: randomId(), sku_id: sku.sku_id,
        warehouse_name: pick(warehouses),
        batch_number: `B${randomId().substring(0, 8).toUpperCase()}`,
        production_date: rd('2024-06-01', '2025-04-01').split('T')[0],
        expiration_date: rd('2026-01-01', '2027-12-31').split('T')[0],
        current_stock: stock, inbound_quantity: 50 + Math.floor(Math.random() * 450),
        outbound_quantity: 10 + Math.floor(Math.random() * 290),
        safety_stock: 10 + Math.floor(Math.random() * 40),
        inventory_status: stock < 20 ? '不足' : '正常',
        last_update_time: rd('2025-05-01', '2025-05-26'),
      });
      count++;
      if (batch.length >= 200) { await db.batchInsert('Inventory', batch, 150); batch = []; }
    }
  }
  if (batch.length > 0) { await db.batchInsert('Inventory', batch, 150); }
  console.log(`  ✓ ${count} 条`);
}

// ===== Phase 10: 采购单 + 采购建议 =====
async function genPurchases(skus: any[], products: any[]) {
  console.log('\n[Phase 10] 采购单和采购建议');
  await db('PurchaseOrder').del();
  await db('PurchaseSuggestion').del();
  const sids = (await db('Supplier').select('supplier_id')).map(s => s.supplier_id);
  const prodMap = new Map(products.map(p => [p.product_id, p]));

  // Purchase orders
  const pos: any[] = [];
  for (let i = 0; i < 400; i++) {
    const sku = pick(skus);
    const prod = prodMap.get(sku.product_id);
    const cost = prod ? parseFloat(prod.cost_price) : 50;
    const qty = 50 + Math.floor(Math.random() * 450);
    pos.push({
      purchase_id: randomId(), supplier_id: pick(sids), sku_id: sku.sku_id,
      purchase_quantity: qty,
      purchase_price: +(cost * (0.82 + Math.random() * 0.28)).toFixed(2), // FIXED: based on cost
      purchase_status: pick(['待审核', '已审核', '已发货', '已入库', '已完成']),
      expected_arrival_time: rd('2025-01-01', '2025-06-30'),
      actual_arrival_time: rd('2025-01-05', '2025-06-30'),
      purchaser_id: 'EMP003', create_time: rd('2024-12-01', '2025-04-01'),
    });
  }
  await db.batchInsert('PurchaseOrder', pos, 150);

  // Purchase suggestions (for low-stock SKUs)
  const lowStock = skus.filter(s => s.stock_quantity <= s.warning_threshold).slice(0, 80);
  const suggs: any[] = [];
  for (const sku of lowStock) {
    suggs.push({
      suggestion_id: randomId(), sku_id: sku.sku_id,
      predicted_sales: 50 + Math.floor(Math.random() * 450),
      suggested_quantity: 100 + Math.floor(Math.random() * 200),
      stock_risk_level: pick(['低', '中', '高', '紧急']),
      suggestion_reason: `库存${sku.stock_quantity}件低于预警值${sku.warning_threshold}件，建议补货`,
      generate_time: rd('2025-05-01', '2025-05-26'),
    });
  }
  if (suggs.length > 0) await db('PurchaseSuggestion').insert(suggs);
  console.log(`  ✓ ${pos.length} 采购单, ${suggs.length} 采购建议`);
}

// ===== Phase 11: 售后工单 =====
async function genAfterSales() {
  console.log('\n[Phase 11] 售后工单');
  await db('AfterSale').del();
  const oids = (await db('[Order]').select('order_id').limit(2500)).map((o: any) => o.order_id);
  const sampled = oids.sort(() => Math.random() - 0.5).slice(0, 2000);
  const batch: any[] = [];
  for (const oid of sampled) {
    const atype = pick(['退货退款', '换货', '仅退款', '补发']);
    batch.push({
      aftersale_id: randomId(), order_id: oid,
      aftersale_type: atype,
      problem_description: pick(['商品与描述不符', '尺码不合适', '收到商品有瑕疵', '物流太慢', '发错颜色/款式', '质量不满意', '不想买了']),
      process_status: pick(['待处理', '处理中', '已完成', '已关闭']),
      refund_amount: atype.includes('退款') ? +(Math.random() * 200 + 10).toFixed(2) : 0,
      complaint_level: pick(['普通', '紧急', '重大']),
      create_time: rd('2025-01-01', '2025-05-26'),
    });
  }
  await db.batchInsert('AfterSale', batch, 150);
  console.log(`  ✓ ${batch.length} 条`);
}

// ===== Phase 12: 绩效数据 =====
async function genPerformances() {
  console.log('\n[Phase 12] 主播和商品绩效');
  await db('AnchorPerformance').del();
  await db('ProductPerformance').del();
  await db('UserBehaviorStat').del();

  const finishedSessions = await db('LiveSession').select('*').where('live_status', '已结束');
  const products = await db('Product').select('product_id', 'category');
  let apCount = 0, ppCount = 0, ubCount = 0;

  const apBatch: any[] = [], ppBatch: any[] = [], ubBatch: any[] = [];

  for (const sess of finishedSessions) {
    // Anchor performance
    apBatch.push({
      performance_id: randomId(), anchor_id: sess.anchor_id, live_id: sess.live_id,
      conversion_rate: +(Math.random() * 8 + 1).toFixed(2),
      average_watch_time: +(Math.random() * 600 + 120).toFixed(2),
      interaction_rate: +(Math.random() * 10 + 2).toFixed(2),
      script_execution_score: +(Math.random() * 40 + 60).toFixed(2),
      performance_score: +(Math.random() * 30 + 65).toFixed(2),
      evaluation_time: sess.end_time || new Date(),
    });
    apCount++;

    // Product performance (5-15 products per session)
    const catProds = products.filter(p => p.category === sess.live_category || Math.random() < 0.3);
    const sample = catProds.sort(() => Math.random() - 0.5).slice(0, 5 + Math.floor(Math.random() * 11));
    for (const prod of sample) {
      ppBatch.push({
        performance_id: randomId(), product_id: prod.product_id, live_id: sess.live_id,
        click_rate: +(Math.random() * 15 + 1).toFixed(2),
        conversion_rate: +(Math.random() * 8 + 0.5).toFixed(2),
        refund_rate: +(Math.random() * 5).toFixed(2),
        interaction_heat: +(Math.random() * 100).toFixed(2),
        sales_volume: 10 + Math.floor(Math.random() * 490),
        gmv: +(Math.random() * 30000 + 500).toFixed(2),
      });
      ppCount++;
    }

    // User behavior stat
    ubBatch.push({
      stat_id: randomId(), live_id: sess.live_id,
      click_rate: +(Math.random() * 12 + 1).toFixed(2),
      conversion_rate: +(Math.random() * 6 + 1).toFixed(2),
      average_stay_time: +(Math.random() * 400 + 80).toFixed(2),
      bounce_rate: +(Math.random() * 30 + 10).toFixed(2),
      active_user_count: 200 + Math.floor(Math.random() * 49800),
      statistical_time: sess.end_time || new Date(),
    });
    ubCount++;

    if (apBatch.length >= 150) { await db.batchInsert('AnchorPerformance', apBatch, 150); apBatch.length = 0; }
    if (ppBatch.length >= 150) { await db.batchInsert('ProductPerformance', ppBatch, 150); ppBatch.length = 0; }
    if (ubBatch.length >= 150) { await db.batchInsert('UserBehaviorStat', ubBatch, 150); ubBatch.length = 0; }
  }
  if (apBatch.length > 0) { await db.batchInsert('AnchorPerformance', apBatch, 150); }
  if (ppBatch.length > 0) { await db.batchInsert('ProductPerformance', ppBatch, 150); }
  if (ubBatch.length > 0) { await db.batchInsert('UserBehaviorStat', ubBatch, 150); }

  console.log(`  ✓ 主播绩效 ${apCount}, 商品表现 ${ppCount}, 用户行为 ${ubCount}`);
}

// ===== Phase 13: LLM 运营报告 =====
async function genReports() {
  console.log('\n[Phase 13] LLM 运营报告内容');
  const reports = await db('OperationReport').select('*');
  let done = 0, idx = 0;
  for (const r of reports) {
    idx++;
    if (idx % 3 === 0) process.stdout.write(`\r  ${bar(idx, reports.length, '报告')} ${done}完成`);
    const prompt = `你是直播电商数据分析师。撰写运营报告。标题:${r.report_title}|类型:${r.report_type}|周期:${r.statistical_period || '近期'}|ID:${r.report_id}。要求：600~1000字，结构含一周期概览、二核心指标、三亮点、四问题风险、五改进建议。用具体模拟数据让报告真实可信。返回JSON:{"id":"${r.report_id}","content":"报告全文..."}`;
    try {
      const raw = await llm(prompt, 3000);
      const result = parseJSON(raw);
      if (result.id && result.content && result.content.length > 100) {
        await db('OperationReport').where('report_id', result.id).update({ report_content: result.content });
        done++;
      }
    } catch (e: any) { /* skip individual failures */ }
    await delay(300);
  }
  process.stdout.write(`\r  ${bar(reports.length, reports.length, '报告')} ✓ ${done} 条\n`);
}

// ===== Phase 14: 更新供应商 =====
async function updateSuppliers(names: string[]) {
  console.log('\n[Phase 14] 更新供应商名称');
  const rows = await db('Supplier').select('supplier_id');
  for (let i = 0; i < Math.min(names.length, rows.length); i++) {
    await db('Supplier').where('supplier_id', rows[i].supplier_id).update({ supplier_name: names[i] });
  }
  console.log(`  ✓ ${Math.min(names.length, rows.length)} 个`);
}

// ===== Validate data integrity =====
async function validateData() {
  console.log('\n━━━ 数据校验 ━━━');
  const checks: [string, string, number, number][] = [
    ['Product', 'Product', 150, 250],
    ['SKU', 'SKU', 400, 800],
    ['Script', 'Script', 200, 800],
    ['[Order]', 'Order', 20000, 60000],
    ['InteractionLog', 'InteractionLog', 50000, 200000],
    ['Inventory', 'Inventory', 400, 3000],
    ['AfterSale', 'AfterSale', 1500, 2500],
    ['PurchaseOrder', 'PurchaseOrder', 300, 500],
    ['AnchorPerformance', 'AnchorPerformance', 200, 350],
    ['ProductPerformance', 'ProductPerformance', 3000, 15000],
    ['UserBehaviorStat', 'UserBehaviorStat', 200, 350],
  ];

  let ok = true;
  for (const [table, label, min, max] of checks) {
    const r = await db(table).count('* as cnt');
    const cnt = Number(r[0]?.cnt || 0);
    const status = cnt >= min && cnt <= max ? '✓' : '⚠';
    if (status === '⚠') ok = false;
    console.log(`  ${status} ${label}: ${cnt} 条 (期望 ${min}~${max})`);
  }

  // Check order_amount = (price - discount) * qty for a sample
  const sample = await db('[Order]').select('original_price', 'discount_amount', 'order_quantity', 'order_amount').limit(100);
  const badOrders = sample.filter((o: any) => {
    const expected = +((parseFloat(o.original_price) - parseFloat(o.discount_amount)) * o.order_quantity).toFixed(2);
    return Math.abs(expected - parseFloat(o.order_amount)) > 0.02;
  });
  if (badOrders.length > 0) {
    console.log(`  ⚠ 订单金额校验: ${badOrders.length}/${sample.length} 不符（bug未修复）`);
    ok = false;
  } else {
    console.log('  ✓ 订单金额校验通过');
  }

  // Check script content is not empty
  const emptyScripts = await db('Script').where('script_content', '').orWhereNull('script_content').count('* as cnt');
  if (Number(emptyScripts[0]?.cnt) > 0) {
    console.log(`  ⚠ 空白脚本: ${emptyScripts[0].cnt} 条（LLM未填充）`);
    ok = false;
  } else {
    console.log('  ✓ 脚本内容校验通过');
  }

  // Check product descriptions
  const emptyDescs = await db('Product').where('description', '').orWhereNull('description').count('* as cnt');
  if (Number(emptyDescs[0]?.cnt) > 10) {
    console.log(`  ⚠ 空白商品描述: ${emptyDescs[0].cnt} 条`);
    ok = false;
  } else {
    console.log(`  ✓ 商品描述校验 (${emptyDescs[0].cnt} 条空白)`);
  }

  return ok;
}

// ===== Main =====
async function main() {
  console.log('═══════════════════════════════════════');
  console.log('  LLM 全量业务数据生成引擎');
  console.log(`  模型: ${MODEL}  时间: ${new Date().toLocaleString()}`);
  console.log('═══════════════════════════════════════');

  const t0 = Date.now();

  // Step 1-3: LLM generate content pools
  const productNames = await genProductNames();
  const supplierNames = await genSuppliers();
  const chatTemplates = await genChatTemplates();

  // Step 4-9: Rebuild DB with LLM + programmatic data
  const { products, skus } = await rebuildProducts(productNames, supplierNames);
  await updateSuppliers(supplierNames);
  await genProductDescriptions();
  await genScripts(products);
  await rebuildOrders(skus, products);
  await rebuildInteractions(chatTemplates);
  await rebuildInventory(skus);

  // Step 10-12: Generate remaining business data
  await genPurchases(skus, products);
  await genAfterSales();
  await genPerformances();

  // Step 13: LLM reports
  await genReports();

  // Validate
  await validateData();

  const elapsed = ((Date.now() - t0) / 60000).toFixed(1);
  console.log(`\n═══════════════════════════════════════`);
  console.log(`  ✓ 完成! 耗时 ${elapsed} 分钟`);
  await db.destroy();
}

main().catch(async (e) => {
  console.error('\n✗ 失败:', e.message);
  await db.destroy();
  process.exit(1);
});
