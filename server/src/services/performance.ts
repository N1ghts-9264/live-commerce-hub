import knex from '../db/knex';

export async function getAnchorPerformance(anchorId?: string, liveId?: string) {
  let query = knex('AnchorPerformance')
    .join('Anchor', 'AnchorPerformance.anchor_id', 'Anchor.anchor_id')
    .join('LiveSession', 'AnchorPerformance.live_id', 'LiveSession.live_id')
    .select(
      'AnchorPerformance.*',
      'Anchor.anchor_name',
      'LiveSession.live_title',
      'LiveSession.start_time'
    );

  if (anchorId) query = query.where('AnchorPerformance.anchor_id', anchorId);
  if (liveId) query = query.where('AnchorPerformance.live_id', liveId);

  return query.orderBy('AnchorPerformance.evaluation_time', 'desc');
}

export async function getRadarData(performanceId: string) {
  const perf = await knex('AnchorPerformance')
    .join('Anchor', 'AnchorPerformance.anchor_id', 'Anchor.anchor_id')
    .where('AnchorPerformance.performance_id', performanceId)
    .first();

  if (!perf) throw new Error('Performance record not found');

  // 5-dimensional radar chart data
  return {
    anchor_name: perf.anchor_name,
    dimensions: [
      { name: '转化力', value: perf.conversion_rate, max: 10, description: '直播转化率(%)' },
      { name: '控场力', value: Math.min(perf.average_watch_time / 60, 10), max: 10, description: '平均停留时长(分钟)' },
      { name: '互动引导', value: perf.interaction_rate, max: 10, description: '互动率(%)' },
      { name: '脚本执行', value: perf.script_execution_score / 10, max: 10, description: '脚本执行度' },
      { name: '用户粘性', value: Math.min(perf.performance_score / 10, 10), max: 10, description: '综合绩效分' },
    ],
    performance_score: perf.performance_score,
    evaluation_time: perf.evaluation_time,
  };
}

export async function getAnchorRadarByAnchorId(anchorId: string) {
  const perfs = await knex('AnchorPerformance')
    .where('anchor_id', anchorId)
    .orderBy('evaluation_time', 'desc')
    .limit(5);

  if (perfs.length === 0) {
    // Return placeholder
    return {
      anchor_name: (await knex('Anchor').where('anchor_id', anchorId).first())?.anchor_name || 'Unknown',
      dimensions: [
        { name: '转化力', value: 0, max: 10 },
        { name: '控场力', value: 0, max: 10 },
        { name: '互动引导', value: 0, max: 10 },
        { name: '脚本执行', value: 0, max: 10 },
        { name: '用户粘性', value: 0, max: 10 },
      ],
      performance_score: 0,
    };
  }

  const avgConv = perfs.reduce((s, p) => s + Number(p.conversion_rate), 0) / perfs.length;
  const avgWatch = perfs.reduce((s, p) => s + Number(p.average_watch_time), 0) / perfs.length;
  const avgInter = perfs.reduce((s, p) => s + Number(p.interaction_rate), 0) / perfs.length;
  const avgScript = perfs.reduce((s, p) => s + Number(p.script_execution_score), 0) / perfs.length;
  const avgScore = perfs.reduce((s, p) => s + Number(p.performance_score), 0) / perfs.length;

  return {
    anchor_name: (await knex('Anchor').where('anchor_id', anchorId).first())?.anchor_name || 'Unknown',
    dimensions: [
      { name: '转化力', value: parseFloat(avgConv.toFixed(1)), max: 10 },
      { name: '控场力', value: parseFloat((avgWatch / 60).toFixed(1)), max: 10 },
      { name: '互动引导', value: parseFloat(avgInter.toFixed(1)), max: 10 },
      { name: '脚本执行', value: parseFloat((avgScript / 10).toFixed(1)), max: 10 },
      { name: '用户粘性', value: parseFloat((avgScore / 10).toFixed(1)), max: 10 },
    ],
    performance_score: parseFloat(avgScore.toFixed(1)),
  };
}
