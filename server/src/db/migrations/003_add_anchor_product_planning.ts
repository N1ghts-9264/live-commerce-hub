import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasFit = await knex.schema.hasTable('AnchorProductFit');
  if (!hasFit) {
    await knex.schema.createTable('AnchorProductFit', (t) => {
      t.string('fit_id', 32).primary();
      t.string('anchor_id', 32).notNullable().references('anchor_id').inTable('Anchor');
      t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
      t.decimal('fit_score', 5, 2).notNullable().defaultTo(0);
      t.string('fit_level', 10).notNullable();
      t.string('recommended_role', 30).notNullable();
      t.string('scenario_tag', 100).notNullable();
      t.text('match_reason').notNullable();
      t.text('risk_notes').notNullable();
      t.text('score_parts_json').notNullable();
      t.dateTime('generated_time').notNullable().defaultTo(knex.fn.now());
      t.dateTime('updated_time').notNullable().defaultTo(knex.fn.now());
      t.unique(['anchor_id', 'product_id']);
    });
  }

  const hasPlan = await knex.schema.hasTable('LivePlan');
  if (!hasPlan) {
    await knex.schema.createTable('LivePlan', (t) => {
      t.string('plan_id', 32).primary();
      t.string('live_id', 32).notNullable().unique().references('live_id').inTable('LiveSession');
      t.string('anchor_id', 32).notNullable().references('anchor_id').inTable('Anchor');
      t.string('plan_status', 30).notNullable().defaultTo('草案');
      t.text('plan_goal').notNullable();
      t.decimal('target_gmv', 12, 2).notNullable().defaultTo(0);
      t.integer('target_orders').notNullable().defaultTo(0);
      t.integer('total_planned_minutes').notNullable().defaultTo(0);
      t.dateTime('generated_time').notNullable().defaultTo(knex.fn.now());
      t.dateTime('updated_time').notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasPlanItem = await knex.schema.hasTable('LivePlanItem');
  if (!hasPlanItem) {
    await knex.schema.createTable('LivePlanItem', (t) => {
      t.string('item_id', 32).primary();
      t.string('plan_id', 32).notNullable().references('plan_id').inTable('LivePlan');
      t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
      t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
      t.string('anchor_id', 32).notNullable().references('anchor_id').inTable('Anchor');
      t.integer('sort_order').notNullable();
      t.string('plan_role', 30).notNullable();
      t.integer('suggested_minutes').notNullable().defaultTo(0);
      t.decimal('target_gmv', 12, 2).notNullable().defaultTo(0);
      t.integer('target_orders').notNullable().defaultTo(0);
      t.decimal('fit_score', 5, 2).notNullable().defaultTo(0);
      t.string('fit_level', 10).notNullable();
      t.string('script_id', 32).references('script_id').inTable('Script');
      t.text('plan_reason').notNullable();
      t.text('risk_notes').notNullable();
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('LivePlanItem');
  await knex.schema.dropTableIfExists('LivePlan');
  await knex.schema.dropTableIfExists('AnchorProductFit');
}
