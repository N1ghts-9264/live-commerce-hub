import type { Knex } from 'knex';

export async function up(knex: Knex): Promise<void> {
  const hasReview = await knex.schema.hasTable('LiveSessionReview');
  if (!hasReview) {
    await knex.schema.createTable('LiveSessionReview', (t) => {
      t.string('review_id', 32).primary();
      t.string('live_id', 32).notNullable().unique().references('live_id').inTable('LiveSession');
      t.string('anchor_id', 32).references('anchor_id').inTable('Anchor');
      t.decimal('planned_gmv', 12, 2).notNullable().defaultTo(0);
      t.decimal('actual_gmv', 12, 2).notNullable().defaultTo(0);
      t.decimal('gmv_achievement_rate', 8, 2).notNullable().defaultTo(0);
      t.integer('planned_peak_online').notNullable().defaultTo(0);
      t.integer('actual_peak_online').notNullable().defaultTo(0);
      t.decimal('traffic_achievement_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('planned_conversion_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('actual_conversion_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('planned_duration_minutes', 8, 2).notNullable().defaultTo(0);
      t.decimal('actual_duration_minutes', 8, 2).notNullable().defaultTo(0);
      t.decimal('overall_score', 5, 2).notNullable().defaultTo(0);
      t.string('grade', 10).notNullable().defaultTo('C');
      t.text('funnel_json').notNullable();
      t.text('anchor_json').notNullable();
      t.text('diagnosis_json').notNullable();
      t.text('suggestions_json').notNullable();
      t.text('summary').notNullable();
      t.dateTime('generated_time').notNullable().defaultTo(knex.fn.now());
      t.dateTime('updated_time').notNullable().defaultTo(knex.fn.now());
    });
  }

  const hasProductReview = await knex.schema.hasTable('ProductReview');
  if (!hasProductReview) {
    await knex.schema.createTable('ProductReview', (t) => {
      t.string('product_review_id', 32).primary();
      t.string('review_id', 32).notNullable().references('review_id').inTable('LiveSessionReview');
      t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
      t.string('product_id', 32).notNullable().references('product_id').inTable('Product');
      t.string('product_name', 200).notNullable();
      t.integer('sales_volume').notNullable().defaultTo(0);
      t.decimal('gmv', 12, 2).notNullable().defaultTo(0);
      t.decimal('contribution_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('click_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('conversion_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('refund_rate', 8, 2).notNullable().defaultTo(0);
      t.decimal('interaction_heat', 8, 2).notNullable().defaultTo(0);
      t.string('review_role', 50).notNullable();
      t.string('conclusion', 300).notNullable();
    });
  }

  const hasMetrics = await knex.schema.hasTable('LiveSessionMetrics');
  if (!hasMetrics) {
    await knex.schema.createTable('LiveSessionMetrics', (t) => {
      t.string('metric_id', 32).primary();
      t.string('live_id', 32).notNullable().references('live_id').inTable('LiveSession');
      t.dateTime('metric_time').notNullable().defaultTo(knex.fn.now());
      t.integer('online_count').notNullable().defaultTo(0);
      t.integer('interaction_count').notNullable().defaultTo(0);
      t.integer('order_count').notNullable().defaultTo(0);
      t.decimal('gmv', 12, 2).notNullable().defaultTo(0);
    });
  }
}

export async function down(knex: Knex): Promise<void> {
  await knex.schema.dropTableIfExists('LiveSessionMetrics');
  await knex.schema.dropTableIfExists('ProductReview');
  await knex.schema.dropTableIfExists('LiveSessionReview');
}
