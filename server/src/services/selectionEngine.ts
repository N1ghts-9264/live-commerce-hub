import knex from '../db/knex';
import { assessNewProduct } from './llmService';

// Weight configuration
const WEIGHTS = {
  conversion: 0.25,
  profitability: 0.25,
  heat: 0.20,
  trend: 0.15,
  quality: 0.15,
};

export type TrendPeriod = 'recent' | 'previous';

export interface TrendMetricRow {
  period: TrendPeriod;
  sales_volume?: number | string | null;
  gmv?: number | string | null;
  conversion_rate?: number | string | null;
  interaction_heat?: number | string | null;
}

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const num = (value: number | string | null | undefined) => Number(value) || 0;

function growthRate(recent: number, previous: number) {
  if (previous <= 0 && recent <= 0) return 0;
  if (previous <= 0) return 1;
  return clamp((recent - previous) / previous, -1, 1);
}

export function calculateTrendScore(rows: TrendMetricRow[]) {
  if (rows.length === 0) return 60;

  const recent = rows.find((r) => r.period === 'recent');
  const previous = rows.find((r) => r.period === 'previous');
  if (!recent && !previous) return 60;
  if (recent && !previous) return 68;
  if (!recent && previous) return 45;

  const salesGrowth = growthRate(num(recent?.sales_volume), num(previous?.sales_volume));
  const gmvGrowth = growthRate(num(recent?.gmv), num(previous?.gmv));
  const conversionGrowth = growthRate(num(recent?.conversion_rate), num(previous?.conversion_rate));
  const heatGrowth = growthRate(num(recent?.interaction_heat), num(previous?.interaction_heat));
  const weightedGrowth = gmvGrowth * 0.35 + salesGrowth * 0.25 + conversionGrowth * 0.25 + heatGrowth * 0.15;

  return Math.round(clamp(60 + weightedGrowth * 30, 20, 95));
}

export function getTrendLabel(trendScore: number) {
  if (trendScore > 75) return '上升 ↗';
  if (trendScore < 45) return '下降 ↘';
  return '平稳';
}

async function getProductTrendScore(productId: string) {
  const latest = await knex('ProductPerformance')
    .join('LiveSession', 'ProductPerformance.live_id', 'LiveSession.live_id')
    .where('ProductPerformance.product_id', productId)
    .max('LiveSession.start_time as latest_time')
    .first();

  if (!latest?.latest_time) return 60;

  const latestTime = new Date(latest.latest_time);
  const recentStart = new Date(latestTime);
  recentStart.setDate(recentStart.getDate() - 30);
  const previousStart = new Date(latestTime);
  previousStart.setDate(previousStart.getDate() - 60);

  const selectTrendStats = () => knex('ProductPerformance')
    .join('LiveSession', 'ProductPerformance.live_id', 'LiveSession.live_id')
    .where('ProductPerformance.product_id', productId)
    .sum('ProductPerformance.sales_volume as sales_volume')
    .sum('ProductPerformance.gmv as gmv')
    .avg('ProductPerformance.conversion_rate as conversion_rate')
    .avg('ProductPerformance.interaction_heat as interaction_heat')
    .first();

  const [recent, previous] = await Promise.all([
    selectTrendStats().where('LiveSession.start_time', '>=', recentStart),
    selectTrendStats()
      .where('LiveSession.start_time', '>=', previousStart)
      .where('LiveSession.start_time', '<', recentStart),
  ]);

  const rows: TrendMetricRow[] = [];
  if (recent?.sales_volume || recent?.gmv) rows.push({ period: 'recent', ...recent });
  if (previous?.sales_volume || previous?.gmv) rows.push({ period: 'previous', ...previous });

  return calculateTrendScore(rows);
}

// Category-wise averages (runtime computed)
async function getCategoryAverages(category: string) {
  const stats = await knex('ProductPerformance')
    .join('Product', 'ProductPerformance.product_id', 'Product.product_id')
    .where('Product.category', category)
    .avg('ProductPerformance.conversion_rate as avg_conversion')
    .avg('ProductPerformance.click_rate as avg_click')
    .avg('ProductPerformance.interaction_heat as avg_heat')
    .first();

  const prices = await knex('Product')
    .where('category', category)
    .where('product_status', '在售')
    .avg('sale_price as avg_price')
    .first();

  return {
    avgConversion: Number(stats?.avg_conversion) || 3,
    avgClick: Number(stats?.avg_click) || 5,
    avgHeat: Number(stats?.avg_heat) || 50,
    avgPrice: Number(prices?.avg_price) || 100,
  };
}

export async function getProductRankings(category?: string, sortBy?: string) {
  let query = knex('Product')
    .leftJoin('ProductPerformance', 'Product.product_id', 'ProductPerformance.product_id')
    .select(
      'Product.*',
      knex.raw('AVG(ProductPerformance.conversion_rate) as avg_conversion'),
      knex.raw('AVG(ProductPerformance.click_rate) as avg_click'),
      knex.raw('AVG(ProductPerformance.interaction_heat) as avg_heat'),
      knex.raw('AVG(ProductPerformance.refund_rate) as avg_refund'),
      knex.raw('SUM(ProductPerformance.sales_volume) as total_sales_volume'),
      knex.raw('SUM(ProductPerformance.gmv) as total_gmv')
    )
    .where('Product.product_status', '在售')
    .groupBy(
      'Product.product_id', 'Product.product_name', 'Product.category',
      'Product.brand', 'Product.cost_price', 'Product.sale_price',
      'Product.gross_profit_rate', 'Product.product_status',
      'Product.supplier_id', 'Product.description', 'Product.selling_points',
      'Product.create_time'
    );

  if (category) {
    query = query.where('Product.category', category);
  }

  const products = await query;

  // Calculate scores for each product
  const scored = [];
  for (const p of products) {
    const avgs = await getCategoryAverages(p.category);

    // 1. Conversion Score (0-100)
    const convRate = Number(p.avg_conversion) || 1;
    const clickRate = Number(p.avg_click) || 1;
    const heat = Number(p.avg_heat) || 1;
    const conversionScore = Math.min(
      ((convRate / Math.max(avgs.avgConversion, 0.1)) * 0.5 +
        (clickRate / Math.max(avgs.avgClick, 0.1)) * 0.3 +
        (heat / Math.max(avgs.avgHeat, 0.1)) * 0.2) * 100,
      100
    );

    // 2. Profitability Score
    const gpRate = Number(p.gross_profit_rate) || 30;
    const price = Number(p.sale_price) || 100;
    const refundRate = Number(p.avg_refund) || 0;
    const profitabilityScore = Math.min(
      ((gpRate / 50) * 0.4 +
        Math.min(price / Math.max(avgs.avgPrice, 1), 2) * 0.3 +
        (1 - Math.min(refundRate / 20, 1)) * 0.3) * 100,
      100
    );

    // 3. Heat Score
    const salesVol = Number(p.total_sales_volume) || 0;
    const gmv = Number(p.total_gmv) || 0;
    const heatScore = Math.min(
      (Math.min(salesVol / 500, 1) * 0.5 + Math.min(gmv / 50000, 1) * 0.3 + Math.min(heat / 200, 1) * 0.2) * 100,
      100
    );

    // 4. Trend Score: deterministic recent-vs-previous performance comparison
    const trendScore = await getProductTrendScore(p.product_id);

    // 5. Quality Score
    const qualityScore = Math.min(
      ((1 - Math.min(refundRate / 10, 1)) * 0.6 + 0.4) * 100,
      100
    );

    // Composite Score
    const compositeScore =
      conversionScore * WEIGHTS.conversion +
      profitabilityScore * WEIGHTS.profitability +
      heatScore * WEIGHTS.heat +
      trendScore * WEIGHTS.trend +
      qualityScore * WEIGHTS.quality;

    // Trend label
    const trendLabel = getTrendLabel(trendScore);

    scored.push({
      ...p,
      scores: {
        conversion: Math.round(conversionScore),
        profitability: Math.round(profitabilityScore),
        heat: Math.round(heatScore),
        trend: Math.round(trendScore),
        quality: Math.round(qualityScore),
        composite: Math.round(compositeScore),
      },
      trendLabel,
    });
  }

  // Sort
  if (sortBy === 'conversion') scored.sort((a, b) => b.scores.conversion - a.scores.conversion);
  else if (sortBy === 'profitability') scored.sort((a, b) => b.scores.profitability - a.scores.profitability);
  else if (sortBy === 'heat') scored.sort((a, b) => b.scores.heat - a.scores.heat);
  else scored.sort((a, b) => b.scores.composite - a.scores.composite);

  return scored;
}

// Jaccard similarity for association recommendations
export async function getRecommendations(productId: string) {
  // Find users who bought this product
  const buyerQuery = await knex('[Order]')
    .join('SKU', '[Order].sku_id', 'SKU.sku_id')
    .where('SKU.product_id', productId)
    .select('[Order].user_id')
    .distinct();

  const buyers = buyerQuery.map((b: any) => b.user_id);
  if (buyers.length === 0) return [];

  // Find other products bought by these users
  const coBought = await knex('[Order]')
    .join('SKU', '[Order].sku_id', 'SKU.sku_id')
    .join('Product', 'SKU.product_id', 'Product.product_id')
    .whereIn('[Order].user_id', buyers)
    .whereNot('SKU.product_id', productId)
    .select('Product.product_id', 'Product.product_name', 'Product.category', 'Product.sale_price')
    .count('* as co_count')
    .groupBy('Product.product_id', 'Product.product_name', 'Product.category', 'Product.sale_price')
    .orderBy('co_count', 'desc')
    .limit(10);

  return coBought.map((item: any) => ({
    ...item,
    co_count: Number(item.co_count),
    jaccard: parseFloat((Number(item.co_count) / buyers.length).toFixed(3)),
  }));
}

// Category trends
export async function getCategoryTrends() {
  const categories = await knex('Product')
    .select('category')
    .count('* as product_count')
    .sum(knex.raw('(SELECT SUM(order_amount) FROM [Order] JOIN SKU ON [Order].sku_id = SKU.sku_id WHERE SKU.product_id IN (SELECT product_id FROM Product WHERE category = P.category)) as total_gmv'))
    .from('Product as P')
    .groupBy('category');

  return categories;
}

// Advisor report
export async function getAdvisorReport() {
  const rankings = await getProductRankings();
  const topProducts = rankings.slice(0, 10);
  const bottomProducts = rankings.slice(-5);

  return {
    topRecommendations: topProducts.map(p => ({
      product_name: p.product_name,
      category: p.category,
      score: p.scores.composite,
      reason: `综合评分${p.scores.composite}分，转化力${p.scores.conversion}/盈利力${p.scores.profitability}/热度${p.scores.heat}`,
    })),
    riskAlerts: bottomProducts.map(p => ({
      product_name: p.product_name,
      score: p.scores.composite,
      issue: '综合表现低于品类平均，建议评估是否继续在售',
    })),
    categoryInsights: rankings.reduce((acc: any, p) => {
      if (!acc[p.category]) acc[p.category] = { count: 0, totalScore: 0 };
      acc[p.category].count++;
      acc[p.category].totalScore += p.scores.composite;
      return acc;
    }, {}),
  };
}

// Cold start for new products
export async function coldStart(productId: string) {
  const product = await knex('Product').where('product_id', productId).first();
  if (!product) throw new Error('Product not found');

  // Find similar products
  const similar = await knex('Product')
    .where('category', product.category)
    .where('product_status', '在售')
    .whereNot('product_id', productId)
    .limit(20);

  // Simple similarity: same category + price proximity
  const scored = similar.map((sp: any) => {
    const priceDiff = Math.abs(parseFloat(sp.sale_price) - parseFloat(product.sale_price));
    const priceSim = Math.max(0, 1 - priceDiff / parseFloat(product.sale_price || 1));
    const brandMatch = sp.brand === product.brand ? 1 : 0;
    const similarity = priceSim * 0.5 + brandMatch * 0.3 + 0.2;
    return { ...sp, similarity: parseFloat(similarity.toFixed(3)) };
  }).sort((a: any, b: any) => b.similarity - a.similarity).slice(0, 5);

  // Get category trend summary
  const categoryStats = await knex('ProductPerformance')
    .join('Product', 'ProductPerformance.product_id', 'Product.product_id')
    .where('Product.category', product.category)
    .avg('ProductPerformance.conversion_rate as avg_conv')
    .sum('ProductPerformance.gmv as total_gmv')
    .first();

  const trendSummary = `品类${product.category}，近30天平均转化率${Number(categoryStats?.avg_conv || 0).toFixed(2)}%，累计GMV¥${Number(categoryStats?.total_gmv || 0).toFixed(0)}`;

  // LLM assessment
  const llmAssessment = await assessNewProduct(product, trendSummary);

  return {
    product,
    similarProducts: scored,
    llmAssessment,
    explorationBoost: 20, // max boost, decays over time
    confidence: 'low',
    estimatedScore: scored.length > 0
      ? Math.round(scored.reduce((sum: number, s: any) => sum + 65 * s.similarity, 0) / scored.length)
      : 50,
  };
}
