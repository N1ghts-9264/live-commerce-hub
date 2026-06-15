import { v4 as uuid } from 'uuid';
import knex from '../db/knex';
import {
  buildAnchorProductFit,
  buildLivePlanItems,
  type AnchorFitInput,
  type AnchorProductFitResult,
  type ProductFitInput,
} from './anchorProductFitEngine';

function id(prefix: string) {
  return `${prefix}${uuid().replace(/-/g, '').substring(0, 12)}`;
}

function n(value: any) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function parseJson(value: any, fallback: any) {
  if (!value) return fallback;
  try {
    return typeof value === 'string' ? JSON.parse(value) : value;
  } catch {
    return fallback;
  }
}

async function getAnchorInput(anchorId: string, category?: string): Promise<AnchorFitInput> {
  const anchor = await knex('Anchor').where('anchor_id', anchorId).first();
  if (!anchor) throw new Error('主播不存在');

  const performance = await knex('AnchorPerformance')
    .where('anchor_id', anchorId)
    .avg('conversion_rate as avg_conversion_rate')
    .avg('interaction_rate as avg_interaction_rate')
    .avg('average_watch_time as avg_watch_time')
    .avg('script_execution_score as avg_script_score')
    .avg('performance_score as avg_performance_score')
    .first();

  const categorySales = await knex('LiveSession')
    .where('anchor_id', anchorId)
    .modify((builder) => {
      if (category) builder.where('live_category', category);
    })
    .sum('total_sales as category_gmv')
    .first();

  return {
    anchor_id: anchor.anchor_id,
    anchor_name: anchor.anchor_name,
    specialization: anchor.specialization,
    anchor_level: anchor.anchor_level,
    fan_count: n(anchor.fan_count),
    avg_conversion_rate: n(performance?.avg_conversion_rate),
    avg_interaction_rate: n(performance?.avg_interaction_rate),
    avg_watch_time: n(performance?.avg_watch_time),
    avg_script_score: n(performance?.avg_script_score),
    avg_performance_score: n(performance?.avg_performance_score),
    category_gmv: n(categorySales?.category_gmv),
  };
}

async function getProductInput(productId: string): Promise<ProductFitInput> {
  const product = await knex('Product').where('product_id', productId).first();
  if (!product) throw new Error('商品不存在');

  const skuStats = await knex('SKU')
    .where('product_id', productId)
    .sum('stock_quantity as stock_quantity')
    .avg('warning_threshold as warning_threshold')
    .first();

  const performance = await knex('ProductPerformance')
    .where('product_id', productId)
    .avg('conversion_rate as avg_conversion_rate')
    .avg('refund_rate as avg_refund_rate')
    .avg('interaction_heat as avg_interaction_heat')
    .sum('gmv as total_gmv')
    .count('* as performance_count')
    .first();

  const performanceCount = n(performance?.performance_count);
  const totalGmv = n(performance?.total_gmv);
  const statusText = String(product.product_status || '');

  return {
    product_id: product.product_id,
    product_name: product.product_name,
    category: product.category,
    gross_profit_rate: n(product.gross_profit_rate),
    sale_price: n(product.sale_price),
    stock_quantity: n(skuStats?.stock_quantity),
    warning_threshold: n(skuStats?.warning_threshold),
    is_cold_start: performanceCount < 2 || totalGmv < 1000 || statusText.includes('待'),
    avg_conversion_rate: n(performance?.avg_conversion_rate),
    avg_refund_rate: n(performance?.avg_refund_rate),
    avg_interaction_heat: n(performance?.avg_interaction_heat),
    total_gmv: totalGmv,
  };
}

async function saveFit(fit: AnchorProductFitResult) {
  const now = new Date();
  const existing = await knex('AnchorProductFit')
    .where({ anchor_id: fit.anchor_id, product_id: fit.product_id })
    .first();
  const payload = {
    fit_score: fit.fit_score,
    fit_level: fit.fit_level,
    recommended_role: fit.recommended_role,
    scenario_tag: fit.scenario_tag,
    match_reason: fit.match_reason,
    risk_notes: fit.risk_notes,
    score_parts_json: JSON.stringify(fit.score_parts),
    updated_time: now,
  };

  if (existing) {
    await knex('AnchorProductFit').where('fit_id', existing.fit_id).update(payload);
    return existing.fit_id;
  }

  const fitId = id('FIT');
  await knex('AnchorProductFit').insert({
    fit_id: fitId,
    anchor_id: fit.anchor_id,
    product_id: fit.product_id,
    generated_time: now,
    ...payload,
  });
  return fitId;
}

function normalizeFit(row: any) {
  return {
    fit_id: row.fit_id,
    anchor_id: row.anchor_id,
    anchor_name: row.anchor_name,
    product_id: row.product_id,
    product_name: row.product_name,
    category: row.category,
    fit_score: n(row.fit_score),
    fit_level: row.fit_level,
    recommended_role: row.recommended_role,
    scenario_tag: row.scenario_tag,
    match_reason: row.match_reason,
    risk_notes: row.risk_notes,
    score_parts: parseJson(row.score_parts_json, {}),
    generated_time: row.generated_time,
    updated_time: row.updated_time,
  };
}

async function buildAndSaveFit(anchorId: string, productId: string) {
  const product = await getProductInput(productId);
  const anchor = await getAnchorInput(anchorId, product.category);
  const fit = buildAnchorProductFit(anchor, product);
  const fitId = await saveFit(fit);
  return { fit_id: fitId, ...fit };
}

export async function generateFitsForProduct(productId: string, limit = 12) {
  const product = await getProductInput(productId);
  const anchors = await knex('Anchor').orderBy('fan_count', 'desc');
  const fits = await Promise.all(anchors.map(async (anchor: any) => {
    const anchorInput = await getAnchorInput(anchor.anchor_id, product.category);
    const fit = buildAnchorProductFit(anchorInput, product);
    const fitId = await saveFit(fit);
    return { fit_id: fitId, ...fit };
  }));
  return fits.sort((a, b) => b.fit_score - a.fit_score).slice(0, limit);
}

export async function generateFitsForAnchor(anchorId: string, limit = 24) {
  const products = await knex('Product').orderBy('create_time', 'desc');
  const fits = await Promise.all(products.map(async (product: any) => buildAndSaveFit(anchorId, product.product_id)));
  return fits.sort((a, b) => b.fit_score - a.fit_score).slice(0, limit);
}

export async function listAnchorProductFits(params: {
  anchorId?: string;
  productId?: string;
  category?: string;
  limit?: number;
} = {}) {
  const rows = await knex('AnchorProductFit')
    .join('Anchor', 'AnchorProductFit.anchor_id', 'Anchor.anchor_id')
    .join('Product', 'AnchorProductFit.product_id', 'Product.product_id')
    .modify((builder) => {
      if (params.anchorId) builder.where('AnchorProductFit.anchor_id', params.anchorId);
      if (params.productId) builder.where('AnchorProductFit.product_id', params.productId);
      if (params.category) builder.where('Product.category', params.category);
    })
    .select('AnchorProductFit.*', 'Anchor.anchor_name', 'Product.product_name', 'Product.category')
    .orderBy('AnchorProductFit.fit_score', 'desc')
    .limit(params.limit || 50);

  return rows.map(normalizeFit);
}

async function getFitsForLivePlan(session: any, productIds?: string[]) {
  if (productIds?.length) {
    const fits = await Promise.all(productIds.map((productId) => buildAndSaveFit(session.anchor_id, productId)));
    return fits.sort((a, b) => b.fit_score - a.fit_score);
  }

  let fits = await listAnchorProductFits({
    anchorId: session.anchor_id,
    category: session.live_category,
    limit: 8,
  });

  if (fits.length < 4) {
    await generateFitsForAnchor(session.anchor_id, 80);
    fits = await listAnchorProductFits({
      anchorId: session.anchor_id,
      category: session.live_category,
      limit: 8,
    });
  }

  if (fits.length === 0) {
    fits = await listAnchorProductFits({ anchorId: session.anchor_id, limit: 8 });
  }

  return fits.map((fit: any) => ({
    anchor_id: fit.anchor_id,
    anchor_name: fit.anchor_name,
    product_id: fit.product_id,
    product_name: fit.product_name,
    category: fit.category,
    fit_score: fit.fit_score,
    fit_level: fit.fit_level,
    recommended_role: fit.recommended_role,
    scenario_tag: fit.scenario_tag,
    match_reason: fit.match_reason,
    risk_notes: fit.risk_notes,
    score_parts: fit.score_parts,
  } as AnchorProductFitResult));
}

async function findScriptId(liveId: string, anchorId: string, productId: string) {
  const script = await knex('Script')
    .where('product_id', productId)
    .andWhere((builder) => {
      builder.where('live_id', liveId).orWhere('anchor_id', anchorId).orWhereNull('live_id');
    })
    .orderBy('create_time', 'desc')
    .first();
  return script?.script_id || null;
}

export async function createLivePlan(liveId: string, productIds?: string[]) {
  const session = await knex('LiveSession')
    .join('Anchor', 'LiveSession.anchor_id', 'Anchor.anchor_id')
    .where('LiveSession.live_id', liveId)
    .select('LiveSession.*', 'Anchor.anchor_name')
    .first();
  if (!session) throw new Error('直播场次不存在');

  const fits = await getFitsForLivePlan(session, productIds);
  const planItems = buildLivePlanItems(fits).slice(0, 8);
  if (planItems.length === 0) throw new Error('当前没有可用于生成计划的商品适配结果');

  const targetGmv = planItems.reduce((sum, item) => sum + item.target_gmv, 0);
  const targetOrders = planItems.reduce((sum, item) => sum + item.target_orders, 0);
  const totalMinutes = planItems.reduce((sum, item) => sum + item.suggested_minutes, 0);
  const now = new Date();
  const existing = await knex('LivePlan').where('live_id', liveId).first();
  const planId = existing?.plan_id || id('PLAN');
  const planGoal = `${session.live_category || '综合'}场次带货计划：优先保障主推款成交，辅推款补充客单，新品以试播验证转化。`;

  if (existing) {
    await knex('LivePlanItem').where('plan_id', existing.plan_id).del();
    await knex('LivePlan').where('plan_id', existing.plan_id).update({
      anchor_id: session.anchor_id,
      plan_status: '草案',
      plan_goal: planGoal,
      target_gmv: targetGmv,
      target_orders: targetOrders,
      total_planned_minutes: totalMinutes,
      updated_time: now,
    });
  } else {
    await knex('LivePlan').insert({
      plan_id: planId,
      live_id: liveId,
      anchor_id: session.anchor_id,
      plan_status: '草案',
      plan_goal: planGoal,
      target_gmv: targetGmv,
      target_orders: targetOrders,
      total_planned_minutes: totalMinutes,
      generated_time: now,
      updated_time: now,
    });
  }

  const itemRows = await Promise.all(planItems.map(async (item) => ({
    item_id: id('LPI'),
    plan_id: planId,
    live_id: liveId,
    product_id: item.product_id,
    anchor_id: item.anchor_id,
    sort_order: item.sort_order,
    plan_role: item.plan_role,
    suggested_minutes: item.suggested_minutes,
    target_gmv: item.target_gmv,
    target_orders: item.target_orders,
    fit_score: item.fit_score,
    fit_level: item.fit_level,
    script_id: await findScriptId(liveId, session.anchor_id, item.product_id),
    plan_reason: item.plan_reason,
    risk_notes: fits.find((fit: AnchorProductFitResult) => fit.product_id === item.product_id)?.risk_notes || '暂无明显风险。',
  })));
  await knex('LivePlanItem').insert(itemRows);

  return getLivePlan(planId);
}

export async function getLivePlan(idOrLiveId: string) {
  const plan = await knex('LivePlan')
    .join('LiveSession', 'LivePlan.live_id', 'LiveSession.live_id')
    .join('Anchor', 'LivePlan.anchor_id', 'Anchor.anchor_id')
    .where((builder) => {
      builder.where('LivePlan.plan_id', idOrLiveId).orWhere('LivePlan.live_id', idOrLiveId);
    })
    .select('LivePlan.*', 'LiveSession.live_title', 'LiveSession.live_category', 'LiveSession.start_time', 'LiveSession.live_status', 'Anchor.anchor_name')
    .first();
  if (!plan) return null;

  const items = await knex('LivePlanItem')
    .join('Product', 'LivePlanItem.product_id', 'Product.product_id')
    .leftJoin('Script', 'LivePlanItem.script_id', 'Script.script_id')
    .where('LivePlanItem.plan_id', plan.plan_id)
    .select('LivePlanItem.*', 'Product.product_name', 'Product.category', 'Product.sale_price', 'Script.script_title')
    .orderBy('LivePlanItem.sort_order', 'asc');

  return {
    plan_id: plan.plan_id,
    live_id: plan.live_id,
    live_title: plan.live_title,
    live_category: plan.live_category,
    live_status: plan.live_status,
    start_time: plan.start_time,
    anchor_id: plan.anchor_id,
    anchor_name: plan.anchor_name,
    plan_status: plan.plan_status,
    plan_goal: plan.plan_goal,
    target_gmv: n(plan.target_gmv),
    target_orders: n(plan.target_orders),
    total_planned_minutes: n(plan.total_planned_minutes),
    generated_time: plan.generated_time,
    updated_time: plan.updated_time,
    items: items.map((item: any) => ({
      item_id: item.item_id,
      product_id: item.product_id,
      product_name: item.product_name,
      category: item.category,
      sale_price: n(item.sale_price),
      sort_order: n(item.sort_order),
      plan_role: item.plan_role,
      suggested_minutes: n(item.suggested_minutes),
      target_gmv: n(item.target_gmv),
      target_orders: n(item.target_orders),
      fit_score: n(item.fit_score),
      fit_level: item.fit_level,
      script_id: item.script_id,
      script_title: item.script_title,
      plan_reason: item.plan_reason,
      risk_notes: item.risk_notes,
    })),
  };
}
