import knex from 'knex';
import knexConfig from './src/db/knexfile';

async function runSeeds() {
  const db = knex(knexConfig);

  console.log('正在填充种子数据（数据量大，请耐心等待）...\n');

  try {
    const [result] = await db.seed.run();

    console.log('\n✓ 种子数据填充完成!');

    // 验证各表数据量
    const tables = [
      'Role', 'Permission', 'Employee', 'EmployeeRole', 'RolePermission',
      'Supplier', 'Product', 'SKU', 'Inventory', 'Anchor', 'User', 'Script',
      'LiveSession', '[Order]', 'InteractionLog', 'AfterSale',
      'PurchaseOrder', 'PurchaseSuggestion', 'AnchorPerformance',
      'ProductPerformance', 'KPIIndicator', 'OperationReport', 'InterfaceLog', 'UserBehaviorStat',
    ];

    console.log('\n数据量统计:');
    console.log('─'.repeat(50));

    for (const table of tables) {
      const result = await db(table).count('* as cnt');
      const count = result[0]?.cnt || result[0]?.[''] || 0;
      console.log(`  ${table.padEnd(25)} ${String(count).padStart(8)} 条`);
    }

    await db.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('✗ 种子数据填充失败:', err.message);
    if (err.stack) console.error(err.stack);
    await db.destroy();
    process.exit(1);
  }
}

runSeeds();
