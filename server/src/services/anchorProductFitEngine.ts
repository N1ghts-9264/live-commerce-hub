export interface AnchorFitInput {
  anchor_id: string;
  anchor_name: string;
  specialization?: string | null;
  anchor_level?: string | null;
  fan_count?: number;
  avg_conversion_rate?: number;
  avg_interaction_rate?: number;
  avg_watch_time?: number;
  avg_script_score?: number;
  avg_performance_score?: number;
  category_gmv?: number;
}

export interface ProductFitInput {
  product_id: string;
  product_name: string;
  category: string;
  gross_profit_rate?: number;
  sale_price?: number;
  stock_quantity?: number;
  warning_threshold?: number;
  is_cold_start?: boolean;
  avg_conversion_rate?: number;
  avg_refund_rate?: number;
  avg_interaction_heat?: number;
  total_gmv?: number;
}

export interface AnchorProductFitResult {
  anchor_id: string;
  anchor_name: string;
  product_id: string;
  product_name: string;
  category: string;
  fit_score: number;
  fit_level: 'A' | 'B' | 'C';
  recommended_role: '主推' | '辅推' | '试播' | '暂缓';
  scenario_tag: string;
  match_reason: string;
  risk_notes: string;
  score_parts: {
    category: number;
    anchor: number;
    product: number;
    inventory: number;
    coldStart: number;
  };
}

export interface LivePlanItemDraft {
  product_id: string;
  product_name: string;
  anchor_id: string;
  plan_role: '主推' | '辅推' | '试播' | '暂缓';
  sort_order: number;
  suggested_minutes: number;
  target_gmv: number;
  target_orders: number;
  fit_score: number;
  fit_level: 'A' | 'B' | 'C';
  plan_reason: string;
}

function n(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

function round(value: number, digits = 0) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function includesCategory(specialization: string | null | undefined, category: string) {
  return String(specialization || '').includes(category);
}

function level(score: number): AnchorProductFitResult['fit_level'] {
  if (score >= 82) return 'A';
  if (score >= 68) return 'B';
  return 'C';
}

function role(score: number, product: ProductFitInput): AnchorProductFitResult['recommended_role'] {
  if (product.is_cold_start) return score >= 60 ? '试播' : '暂缓';
  if (score >= 82) return '主推';
  if (score >= 68) return '辅推';
  return '暂缓';
}

export function buildAnchorProductFit(anchor: AnchorFitInput, product: ProductFitInput): AnchorProductFitResult {
  const categoryScore = includesCategory(anchor.specialization, product.category)
    ? 100
    : n(anchor.category_gmv) > 30000 ? 72 : 48;
  const anchorScore = clamp(
    n(anchor.avg_performance_score) * 0.35
      + n(anchor.avg_conversion_rate) * 5
      + n(anchor.avg_interaction_rate) * 2
      + Math.min(n(anchor.avg_watch_time) / 10, 20)
      + n(anchor.avg_script_score) * 0.12
      + Math.min(n(anchor.fan_count) / 100000, 10),
    35,
    100,
  );
  const productScore = clamp(
    n(product.avg_conversion_rate) * 8
      + n(product.avg_interaction_heat) * 0.3
      + n(product.gross_profit_rate) * 0.6
      + Math.min(n(product.total_gmv) / 1200, 25)
      - Math.min(n(product.avg_refund_rate) * 2, 18),
    product.is_cold_start ? 48 : 35,
    100,
  );
  const stock = n(product.stock_quantity);
  const warning = Math.max(n(product.warning_threshold), 1);
  const inventoryScore = clamp((stock / warning) * 20 + 45, 25, 100);
  const coldStartScore = product.is_cold_start ? 60 : 82;
  const fitScore = round(clamp(
    categoryScore * 0.28
      + anchorScore * 0.28
      + productScore * 0.24
      + inventoryScore * 0.12
      + coldStartScore * 0.08,
    0,
    100,
  ));

  const fitLevel = level(fitScore);
  const recommendedRole = role(fitScore, product);
  const reasons: string[] = [];
  const risks: string[] = [];

  if (includesCategory(anchor.specialization, product.category)) reasons.push('品类专长匹配');
  else risks.push('主播专长与商品品类不完全匹配');
  if (n(anchor.avg_conversion_rate) >= 4) reasons.push('主播历史转化较稳');
  if (n(anchor.avg_script_score) >= 80) reasons.push('脚本执行能力较强');
  if (n(product.gross_profit_rate) >= 35) reasons.push('商品毛利支持资源投放');
  if (n(product.avg_refund_rate) >= 8) risks.push('商品退款率偏高');
  if (stock <= warning) risks.push('库存低于安全阈值');
  if (product.is_cold_start) risks.push('新品缺少充分历史转化数据');

  return {
    anchor_id: anchor.anchor_id,
    anchor_name: anchor.anchor_name,
    product_id: product.product_id,
    product_name: product.product_name,
    category: product.category,
    fit_score: fitScore,
    fit_level: fitLevel,
    recommended_role: recommendedRole,
    scenario_tag: product.is_cold_start ? '新品冷启动试播' : recommendedRole === '主推' ? '重点成交场' : '组合补充场',
    match_reason: reasons.length ? reasons.join('；') : '当前数据支持弱匹配，建议小流量验证。',
    risk_notes: risks.length ? risks.join('；') : '暂无明显风险。',
    score_parts: {
      category: round(categoryScore),
      anchor: round(anchorScore),
      product: round(productScore),
      inventory: round(inventoryScore),
      coldStart: round(coldStartScore),
    },
  };
}

export function buildLivePlanItems(fits: AnchorProductFitResult[]): LivePlanItemDraft[] {
  const roleRank: Record<string, number> = { '主推': 3, '辅推': 2, '试播': 1 };
  const usable = [...fits]
    .filter((fit) => fit.recommended_role !== '暂缓')
    .sort((a, b) => (roleRank[b.recommended_role] || 0) - (roleRank[a.recommended_role] || 0) || b.fit_score - a.fit_score);

  return usable.map((fit, index) => {
    const suggestedMinutes = fit.recommended_role === '主推' ? 14 : fit.recommended_role === '辅推' ? 9 : 6;
    const targetGmv = round((fit.fit_score / 100) * (fit.recommended_role === '主推' ? 18000 : fit.recommended_role === '辅推' ? 9000 : 3500));
    return {
      product_id: fit.product_id,
      product_name: fit.product_name,
      anchor_id: fit.anchor_id,
      plan_role: fit.recommended_role,
      sort_order: index + 1,
      suggested_minutes: suggestedMinutes,
      target_gmv: Math.max(targetGmv, 800),
      target_orders: Math.max(round(targetGmv / Math.max(n(fit.fit_score), 1)), 5),
      fit_score: fit.fit_score,
      fit_level: fit.fit_level,
      plan_reason: `${fit.scenario_tag}；${fit.match_reason}`,
    };
  });
}
