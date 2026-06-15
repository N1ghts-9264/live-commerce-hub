# New Product Cold Start Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make new-product cold start a clear, explainable workflow for candidate evaluation, small-traffic trial, and continue/observe/drop decisions.

**Architecture:** Keep the current Vue + Express + Knex + SQL Server structure. Extend `selectionEngine.ts` with deterministic cold-start helper functions and return a richer response from the existing `/api/selection/coldstart/:productId` endpoint. Update `SelectionPage.vue` to show the decision, score components, trial strategy, and execution suggestions without adding new navigation.

**Tech Stack:** TypeScript, Express, Knex, Vue 3, Vite, SQL Server.

---

### Task 1: Cold-Start Rules

**Files:**
- Modify: `server/src/services/selectionEngine.test.ts`
- Modify: `server/src/services/selectionEngine.ts`

- [ ] **Step 1: Write failing tests**

Add tests for:
- `calculateExplorationBoost(0)` returns `20`.
- `calculateExplorationBoost(3)` returns less than day 0.
- `resolveColdStartDecision(82, 18, 5)` returns action `加码试播`.
- `resolveColdStartDecision(48, 4, 0)` returns action `暂缓投放`.

- [ ] **Step 2: Run test and verify it fails**

Run: `cd server; npm.cmd run test:acceptance`

- [ ] **Step 3: Implement minimal helpers**

Export deterministic helper functions from `selectionEngine.ts`.

- [ ] **Step 4: Run test and verify it passes**

Run: `cd server; npm.cmd run test:acceptance`

### Task 2: API Response

**Files:**
- Modify: `server/src/services/selectionEngine.ts`

- [ ] **Step 1: Extend `coldStart(productId)`**

Return score components, confidence, decision, trial strategy, execution suggestions, baselines, and similar-product evidence.

- [ ] **Step 2: Verify API shape**

Run local server and request `POST /api/selection/coldstart/:productId`, or use existing acceptance test path if the server is already running.

### Task 3: UI Presentation

**Files:**
- Modify: `client/src/pages/SelectionPage.vue`

- [ ] **Step 1: Keep current entry**

Use the existing "新品冷启动评估" button and selected-product flow.

- [ ] **Step 2: Add explainable sections**

Show score cards, decision badge, score components, trial strategy, execution suggestions, and similar products.

- [ ] **Step 3: Verify build**

Run: `npm.cmd run build`

### Task 4: Documentation

**Files:**
- Create: `docs/acceptance/new-product-cold-start-analysis.md`
- Modify: `docs/project-design-state.md`

- [ ] **Step 1: Document boundary**

Clarify that all-market discovery is out of scope; candidate-pool evaluation, trial, and review are in scope.

- [ ] **Step 2: Document data flow and acceptance cases**

Map inputs, processing, outputs, and demo validation.

### Task 5: Final Verification

Run:
- `npm.cmd run test:acceptance`
- `npm.cmd run build`

Expected: both commands pass.
