/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function up(knex) {
  return knex.schema
    .createTable("Site", function (table) {
      table.text("id").notNullable().primary();
      table.text("baseUrl").notNullable().unique();
    })
    .createTable("Page", function (table) {
      table.text("siteId").notNullable().references("id").inTable("Site");
      table.text("id").notNullable();
      table.text("html").notNullable();
      table.text("scraped").notNullable().defaultTo(knex.fn.now());
      table.primary(["siteId", "id"]);
    })
    .createTable("Edge", function (table) {
      table.text("siteId").notNullable();
      table.text("fromPageId").notNullable();
      table.text("toPageId").notNullable();
      table.primary(["siteId", "fromPageId", "toPageId"]);
    });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export function down(knex) {
  return knex.schema.dropTable("Edge").dropTable("Page").dropTable("Site");
}
