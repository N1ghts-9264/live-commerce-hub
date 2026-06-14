import knex from 'knex';
import knexConfig from './src/db/knexfile';
import { seedAcceptanceData } from './src/db/acceptanceSeed';

async function main() {
  const db = knex(knexConfig);
  const tables = [
    'Role', 'Permission', 'Employee', 'EmployeeRole', 'RolePermission',
    'Supplier', 'Product', 'SKU', 'Inventory', 'Anchor', 'User', 'Script',
    'LiveSession', '[Order]', 'InteractionLog', 'AfterSale',
    'PurchaseOrder', 'PurchaseSuggestion', 'AnchorPerformance',
    'ProductPerformance', 'KPIIndicator', 'OperationReport', 'InterfaceLog',
    'UserBehaviorStat',
  ];

  try {
    console.log('正在写入验收数据...');
    await seedAcceptanceData(db);
    console.log('\n验收数据写入完成。数据量统计:');
    console.log('-'.repeat(52));
    for (const table of tables) {
      const row = await db(table).count('* as count').first();
      console.log(`${table.padEnd(24)} ${String(row?.count ?? 0).padStart(8)}`);
    }
  } catch (error: any) {
    console.error('验收数据写入失败:', error.message);
    if (error.stack) console.error(error.stack);
    process.exitCode = 1;
  } finally {
    await db.destroy();
  }
}

main();
