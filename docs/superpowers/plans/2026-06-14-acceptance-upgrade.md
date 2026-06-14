# Acceptance Upgrade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the live-commerce system reliable for local course acceptance by fixing runnable scripts, deterministic selection scoring, cold-start verification, acceptance seed data, and teacher-style test documentation.

**Architecture:** Keep the existing Vue + Express + Knex + SQL Server structure. Add one deterministic acceptance seed entry point that uses the existing schema and cached seed concepts, improve the existing selection service instead of adding a parallel module, and document acceptance paths under `docs/acceptance`.

**Tech Stack:** Node.js 20, TypeScript, Express, Knex, SQL Server, Vue 3, Vite, PowerShell/sqlcmd for local verification.

---

### Task 1: Runnable Database Scripts

**Files:**
- Modify: `server/package.json`
- Modify: `package.json`
- Create: `server/run-acceptance-seed.ts`

- [ ] Change `server/package.json` scripts so `npm run migrate` and `npm run seed` use the existing TypeScript runner files through `tsx`, because the Knex CLI cannot load the TypeScript knexfile reliably in this environment.
- [ ] Add `npm run seed:acceptance` in both server and root packages.
- [ ] Implement `server/run-acceptance-seed.ts` as an idempotent, deterministic SQL Server seed for Supplier, Product, SKU, Inventory, PurchaseOrder, LiveSession, Order, InteractionLog, AfterSale, AnchorPerformance, ProductPerformance, PurchaseSuggestion, UserBehaviorStat, InterfaceLog, OperationReport, using existing Employee, Role, Anchor, and User records when present.
- [ ] Run `npm run migrate` and `npm run seed:acceptance` from the project root.

### Task 2: Deterministic Selection Scoring

**Files:**
- Modify: `server/src/services/selectionEngine.ts`

- [ ] Replace `Math.random()` trend score with a query based on each product's recent and previous `ProductPerformance` rows joined to `LiveSession`.
- [ ] Return stable trend labels: `上升 ↗`, `平稳`, `下降 ↘`.
- [ ] Keep fallback behavior for products with sparse history so cold-start products can still be ranked.
- [ ] Verify `/api/selection/rankings` returns stable scores across two consecutive calls.

### Task 3: Cold-Start Frontend Verification

**Files:**
- Modify: `client/src/pages/SelectionPage.vue`

- [ ] Add state for cold-start loading, result, and error.
- [ ] Add a toolbar button and selected-row flow for `selectionAPI.coldstart(productId)`.
- [ ] Render estimated score, confidence, exploration boost, LLM/fallback assessment, and similar products without adding new backend routes.
- [ ] Run `npm run build` in `client`.

### Task 4: Acceptance Documentation

**Files:**
- Create: `docs/acceptance/system-test-plan.md`
- Create: `docs/acceptance/test-stations.md`
- Create: `docs/acceptance/platform-data-and-new-product-flow.md`

- [ ] Convert the teacher's Word template structure into this project's system test plan with six concrete test cases.
- [ ] Create role-based test stations covering management, operations, procurement, and warehouse/after-sales.
- [ ] Document platform data input, system boundary, candidate product pool, new product cold start, and real-time data time dimension.

### Task 5: Verification

**Files:**
- No source changes expected.

- [ ] Run `npm run build` in `server`.
- [ ] Run `npm run build` in `client`.
- [ ] Verify SQL Server table counts after acceptance seed.
- [ ] Start the API server and verify login, selection rankings, cold start, reports, after-sales, and purchase suggestions.
- [ ] Report remaining limitations clearly.
