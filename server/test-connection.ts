import sql from 'mssql';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '.env') });

const config: sql.config = {
  server: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '1433', 10),
  user: process.env.DB_USER || 'sa',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'live_commerce_hub',
  options: {
    trustServerCertificate: true,
    encrypt: false,
  },
};

async function testConnection() {
  console.log('正在测试 MSSQL 连接...');
  console.log(`  服务器: ${config.server}:${config.port}`);
  console.log(`  数据库: ${config.database}`);
  console.log(`  用户: ${config.user}`);
  console.log('');

  try {
    const pool = await sql.connect(config);
    console.log('✓ 连接成功!');

    const result = await pool.request().query('SELECT @@VERSION as version');
    console.log(`  SQL Server 版本: ${result.recordset[0].version.substring(0, 50)}...`);

    await pool.close();
    console.log('✓ 连接已关闭');
    process.exit(0);
  } catch (err: any) {
    console.error('✗ 连接失败:', err.message);
    process.exit(1);
  }
}

testConnection();
