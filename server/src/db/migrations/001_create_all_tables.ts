import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  // 1. User
  await knex.schema.createTable('User', (t) => {
    t.string('user_id', 32).primary();
    t.string('platform_user_id', 64).notNullable();
    t.string('nickname', 100);
    t.string('gender', 10);
    t.string('user_level', 20);
    t.string('register_platform', 50).notNullable();
    t.integer('purchase_count').defaultTo(0);
    t.decimal('total_consumption', 12, 2).defaultTo(0);
    t.dateTime('last_active_time');
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
  });

  // 2. Employee
  await knex.schema.createTable('Employee', (t) => {
    t.string('employee_id', 32).primary();
    t.string('employee_name', 100).notNullable();
    t.string('department', 50).notNullable();
    t.string('position', 50);
    t.string('phone', 20);
    t.string('email', 100);
    t.string('status', 20).notNullable().defaultTo('在职');
    t.date('join_date');
    t.string('password_hash', 255);
  });

  // 3. Role
  await knex.schema.createTable('Role', (t) => {
    t.string('role_id', 32).primary();
    t.string('role_name', 50).notNullable();
    t.string('role_description', 200);
  });

  // 4. Permission
  await knex.schema.createTable('Permission', (t) => {
    t.string('permission_id', 32).primary();
    t.string('permission_name', 100).notNullable();
    t.string('module_name', 100);
    t.string('permission_description', 200);
  });

  // 5. EmployeeRole
  await knex.schema.createTable('EmployeeRole', (t) => {
    t.string('relation_id', 32).primary();
    t.string('employee_id', 32).notNullable().references('employee_id').inTable('Employee');
    t.string('role_id', 32).notNullable().references('role_id').inTable('Role');
  });

  // 6. RolePermission
  await knex.schema.createTable('RolePermission', (t) => {
    t.string('relation_id', 32).primary();
    t.string('role_id', 32).notNullable().references('role_id').inTable('Role');
    t.string('permission_id', 32).notNullable().references('permission_id').inTable('Permission');
  });

  // 7. Supplier
  await knex.schema.createTable('Supplier', (t) => {
    t.string('supplier_id', 32).primary();
    t.string('supplier_name', 200).notNullable();
    t.string('contact_person', 100);
    t.string('contact_phone', 20);
    t.string('address', 300);
    t.string('cooperation_status', 20).notNullable().defaultTo('合作中');
    t.decimal('supplier_score', 5, 2);
    t.integer('delivery_cycle');
  });

  // 8. Product
  await knex.schema.createTable('Product', (t) => {
    t.string('product_id', 32).primary();
    t.string('product_name', 200).notNullable();
    t.string('category', 100).notNullable();
    t.string('brand', 100);
    t.decimal('cost_price', 10, 2).notNullable();
    t.decimal('sale_price', 10, 2).notNullable();
    t.decimal('gross_profit_rate', 5, 2);
    t.string('product_status', 20).notNullable().defaultTo('在售');
    t.string('supplier_id', 32).references('supplier_id').inTable('Supplier');
    t.text('description');
    t.text('selling_points');
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
  });

  // 9. SKU
  await knex.schema.createTable('SKU', (t) => {
    t.string('sku_id', 32).primary();
    t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
    t.string('sku_name', 200).notNullable();
    t.string('color', 50);
    t.string('size', 50);
    t.string('specification', 200);
    t.integer('stock_quantity').notNullable().defaultTo(0);
    t.integer('warning_threshold').notNullable().defaultTo(50);
    t.integer('sales_volume').defaultTo(0);
    t.string('sku_status', 20).notNullable().defaultTo('在售');
  });

  // 10. Inventory
  await knex.schema.createTable('Inventory', (t) => {
    t.string('inventory_id', 32).primary();
    t.string('sku_id', 32).notNullable().references('sku_id').inTable('SKU');
    t.string('warehouse_name', 100).notNullable();
    t.string('batch_number', 50);
    t.date('production_date');
    t.date('expiration_date');
    t.integer('current_stock').notNullable().defaultTo(0);
    t.integer('inbound_quantity').defaultTo(0);
    t.integer('outbound_quantity').defaultTo(0);
    t.integer('safety_stock').notNullable().defaultTo(20);
    t.string('inventory_status', 20).notNullable().defaultTo('正常');
    t.dateTime('last_update_time').notNullable().defaultTo(knex.fn.now());
  });

  // 11. PurchaseOrder
  await knex.schema.createTable('PurchaseOrder', (t) => {
    t.string('purchase_id', 32).primary();
    t.string('supplier_id', 32).notNullable().references('supplier_id').inTable('Supplier');
    t.string('sku_id', 32).notNullable().references('sku_id').inTable('SKU');
    t.integer('purchase_quantity').notNullable();
    t.decimal('purchase_price', 10, 2).notNullable();
    t.string('purchase_status', 20).notNullable().defaultTo('待审核');
    t.dateTime('expected_arrival_time');
    t.dateTime('actual_arrival_time');
    t.string('purchaser_id', 32).references('employee_id').inTable('Employee');
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
  });

  // 12. Anchor
  await knex.schema.createTable('Anchor', (t) => {
    t.string('anchor_id', 32).primary();
    t.string('anchor_name', 100).notNullable();
    t.string('gender', 10);
    t.date('join_date');
    t.string('account_platform', 50).notNullable();
    t.integer('fan_count').defaultTo(0);
    t.string('specialization', 100);
    t.string('anchor_level', 20).defaultTo('C');
    t.string('status', 20).notNullable().defaultTo('在岗');
  });

  // 13. LiveSession
  await knex.schema.createTable('LiveSession', (t) => {
    t.string('live_id', 32).primary();
    t.string('anchor_id', 32).notNullable().references('anchor_id').inTable('Anchor');
    t.string('live_title', 200).notNullable();
    t.dateTime('start_time').notNullable();
    t.dateTime('end_time');
    t.string('platform', 50).notNullable();
    t.string('live_category', 100);
    t.string('live_status', 20).notNullable().defaultTo('待安排');
    t.integer('online_peak');
    t.decimal('total_sales', 12, 2).defaultTo(0);
  });

  // 14. Script
  await knex.schema.createTable('Script', (t) => {
    t.string('script_id', 32).primary();
    t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
    t.string('live_id', 32).references('live_id').inTable('LiveSession');
    t.string('anchor_id', 32).references('anchor_id').inTable('Anchor');
    t.string('script_title', 200).notNullable();
    t.text('script_content').notNullable();
    t.string('script_type', 50);
    t.string('tags', 200);
    t.decimal('conversion_rate', 5, 2);
    t.string('recommendation_level', 20);
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
  });

  // 15. Order
  await knex.schema.createTable('[Order]', (t) => {
    t.string('order_id', 32).primary();
    t.string('user_id', 32).notNullable().references('user_id').inTable('User');
    t.string('live_id', 32).references('live_id').inTable('LiveSession');
    t.string('sku_id', 32).notNullable().references('sku_id').inTable('SKU');
    t.decimal('original_price', 10, 2);
    t.decimal('discount_amount', 10, 2).defaultTo(0);
    t.integer('order_quantity').notNullable().defaultTo(1);
    t.decimal('order_amount', 10, 2).notNullable();
    t.string('payment_status', 20).notNullable().defaultTo('已支付');
    t.string('order_status', 20).notNullable().defaultTo('已完成');
    t.dateTime('order_time').notNullable();
  });

  // 16. InteractionLog
  await knex.schema.createTable('InteractionLog', (t) => {
    t.string('interaction_id', 32).primary();
    t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
    t.string('user_id', 32).references('user_id').inTable('User');
    t.string('interaction_type', 50).notNullable();
    t.text('interaction_content');
    t.dateTime('interaction_time').notNullable();
    t.string('sentiment_label', 20);
    t.string('semantic_label', 100);
    t.decimal('confidence_score', 5, 2);
    t.string('purchase_intention', 20);
    t.string('analysis_status', 20).defaultTo('待分析');
  });

  // 17. AfterSale
  await knex.schema.createTable('AfterSale', (t) => {
    t.string('aftersale_id', 32).primary();
    t.string('order_id', 32).notNullable().references('order_id').inTable('[Order]');
    t.string('aftersale_type', 50).notNullable();
    t.text('problem_description');
    t.string('process_status', 20).notNullable().defaultTo('待处理');
    t.decimal('refund_amount', 10, 2);
    t.string('complaint_level', 20);
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
  });

  // 18. AnchorPerformance
  await knex.schema.createTable('AnchorPerformance', (t) => {
    t.string('performance_id', 32).primary();
    t.string('anchor_id', 32).notNullable().references('anchor_id').inTable('Anchor');
    t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
    t.decimal('conversion_rate', 5, 2);
    t.decimal('average_watch_time', 8, 2);
    t.decimal('interaction_rate', 5, 2);
    t.decimal('script_execution_score', 5, 2);
    t.decimal('performance_score', 5, 2);
    t.dateTime('evaluation_time').notNullable().defaultTo(knex.fn.now());
  });

  // 19. ProductPerformance
  await knex.schema.createTable('ProductPerformance', (t) => {
    t.string('performance_id', 32).primary();
    t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
    t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
    t.decimal('click_rate', 5, 2);
    t.decimal('conversion_rate', 5, 2);
    t.decimal('refund_rate', 5, 2);
    t.decimal('interaction_heat', 5, 2);
    t.integer('sales_volume').defaultTo(0);
    t.decimal('gmv', 12, 2).defaultTo(0);
  });

  // 20. PurchaseSuggestion
  await knex.schema.createTable('PurchaseSuggestion', (t) => {
    t.string('suggestion_id', 32).primary();
    t.string('sku_id', 32).notNullable().references('sku_id').inTable('SKU');
    t.integer('predicted_sales');
    t.integer('suggested_quantity').notNullable();
    t.string('stock_risk_level', 20);
    t.text('suggestion_reason');
    t.dateTime('generate_time').notNullable().defaultTo(knex.fn.now());
  });

  // 21. KPIIndicator
  await knex.schema.createTable('KPIIndicator', (t) => {
    t.string('indicator_id', 32).primary();
    t.string('indicator_name', 100).notNullable();
    t.string('indicator_type', 50).notNullable();
    t.decimal('target_value', 10, 2);
    t.string('statistical_period', 50);
    t.string('applicable_role', 50);
  });

  // 22. OperationReport
  await knex.schema.createTable('OperationReport', (t) => {
    t.string('report_id', 32).primary();
    t.string('report_type', 50).notNullable();
    t.string('report_title', 200).notNullable();
    t.text('report_content').notNullable();
    t.string('creator_id', 32).references('employee_id').inTable('Employee');
    t.dateTime('create_time').notNullable().defaultTo(knex.fn.now());
    t.string('statistical_period', 50);
  });

  // 23. InterfaceLog
  await knex.schema.createTable('InterfaceLog', (t) => {
    t.string('log_id', 32).primary();
    t.string('platform_name', 50).notNullable();
    t.string('interface_name', 100).notNullable();
    t.dateTime('request_time').notNullable();
    t.string('response_status', 20).notNullable();
    t.integer('data_count');
    t.text('error_message');
  });

  // 24. UserBehaviorStat
  await knex.schema.createTable('UserBehaviorStat', (t) => {
    t.string('stat_id', 32).primary();
    t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
    t.decimal('click_rate', 5, 2);
    t.decimal('conversion_rate', 5, 2);
    t.decimal('average_stay_time', 8, 2);
    t.decimal('bounce_rate', 5, 2);
    t.integer('active_user_count');
    t.dateTime('statistical_time').notNullable().defaultTo(knex.fn.now());
  });
}

export async function down(knex: Knex): Promise<void> {
  const tables = [
    'UserBehaviorStat', 'InterfaceLog', 'OperationReport', 'KPIIndicator',
    'PurchaseSuggestion', 'ProductPerformance', 'AnchorPerformance',
    'AfterSale', 'InteractionLog', '[Order]', 'Script', 'LiveSession',
    'Anchor', 'PurchaseOrder', 'Supplier', 'Inventory', 'SKU',
    'Product', 'RolePermission', 'EmployeeRole', 'Permission', 'Role', 'Employee', 'User',
  ];
  for (const t of tables) {
    await knex.schema.dropTableIfExists(t);
  }
}
