import knex from 'knex';
import knexConfig from './src/db/knexfile';

async function runMigrations() {
  const db = knex(knexConfig);

  console.log('正在执行数据库迁移...\n');

  try {
    const [batchNo, migrations] = await db.migrate.latest();

    if (migrations.length === 0) {
      console.log('✓ 没有新的迁移需要执行（表已存在）');
    } else {
      console.log(`✓ 迁移完成，批次: ${batchNo}`);
      console.log('已执行的迁移:');
      migrations.forEach((m: string) => console.log(`  - ${m}`));
    }

    // 验证表是否创建成功
    const tables = await db.raw(
      "SELECT TABLE_NAME FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME"
    );
    const tableNames = tables.map((r: any) => r.TABLE_NAME);

    console.log(`\n数据库中共有 ${tableNames.length} 张表:`);
    tableNames.forEach((t: string) => console.log(`  - ${t}`));

    await db.destroy();
    process.exit(0);
  } catch (err: any) {
    console.error('✗ 迁移失败:', err.message);
    await db.destroy();
    process.exit(1);
  }
}

runMigrations();
