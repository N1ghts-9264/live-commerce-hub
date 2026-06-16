import type { Knex } from 'knex';
import knex from '../db/knex';
import { seedAcceptanceData } from '../db/acceptanceSeed';
import { stopAllSimulations } from './liveSimulator';

export function buildResetSummary(data: {
  liveSessions: any[];
  products: any[];
  anchors: any[];
}) {
  return {
    success: true,
    message: '系统已恢复到验收初始数据',
    counts: {
      liveSessions: data.liveSessions.length,
      products: data.products.length,
      anchors: data.anchors.length,
    },
  };
}

export async function resetSystemToAcceptanceState(db: Knex = knex) {
  stopAllSimulations();
  const data = await seedAcceptanceData(db);
  return buildResetSummary(data);
}
