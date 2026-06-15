# Inventory Procurement Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Upgrade inventory management from static safety-stock alerts to a replenishment planning workflow that connects inventory risk, upcoming live sessions, product potential, supplier lead time, and purchase creation.

**Architecture:** Add a focused backend inventory planning service that computes replenishment recommendations from existing tables. Keep purchase orders as the execution record, add one endpoint for new-product procurement that creates Product, SKU, Inventory, and PurchaseOrder in one transaction. Update Vue inventory and purchasing pages without adding new database tables.

**Tech Stack:** TypeScript, Express, Knex, SQL Server, Vue 3, Vite.

---

### Task 1: Inventory Planning Rules

**Files:**
- Create: `server/src/services/inventoryPlanning.ts`
- Create: `server/src/services/inventoryPlanning.test.ts`
- Modify: `server/package.json`

- [ ] Write pure-function tests for lead-time demand, live-session demand, in-transit purchase deduction, risk reason, and suggested purchase quantity.
- [ ] Run server acceptance tests and confirm missing-function failure.
- [ ] Implement pure functions.
- [ ] Add the test file to `test:acceptance`.

### Task 2: Inventory API

**Files:**
- Modify: `server/src/routes/inventory.ts`
- Modify: `server/src/services/purchaseSuggestion.ts`

- [ ] Enrich `/api/inventory` and `/api/inventory/alerts` rows with predicted sales, live demand, inbound purchase quantity, suggested quantity, risk level, and risk reason.
- [ ] Reuse the same planning logic for `/api/purchase-suggestions`.

### Task 3: Purchase API

**Files:**
- Modify: `server/src/routes/purchases.ts`

- [ ] Add `POST /api/purchases/new-product`.
- [ ] In one transaction create Product with `product_status = 待评估`, a default SKU, an initial Inventory row, and a PurchaseOrder.

### Task 4: UI

**Files:**
- Modify: `client/src/pages/InventoryPage.vue`
- Modify: `client/src/pages/PurchasingPage.vue`
- Modify: `client/src/components/AppSidebar.vue`
- Modify: `client/src/api/index.ts`

- [ ] Inventory page shows demand-driven risk columns and one-click purchase modal.
- [ ] Purchasing page adds new-product purchase modal.
- [ ] Sidebar places Inventory before Purchasing.

### Task 5: Verification

Run:
- `npm.cmd run test:acceptance`
- `npm.cmd run build`
- Browser verification for inventory one-click purchase and new-product purchase modal.
