# 验收验证摘要

验证日期：2026-06-14  
验证环境：Windows + Node.js 20.20.2 + SQL Server localhost:1433  
数据库：`live_commerce_hub`

## 1. 数据库初始化

执行命令：

```bash
npm run migrate
npm run seed:acceptance
```

验收数据写入结果：

| 表 | 数量 |
|---|---:|
| Role | 6 |
| Permission | 20 |
| Employee | 6 |
| Supplier | 24 |
| Product | 144 |
| SKU | 432 |
| Inventory | 864 |
| Anchor | 12 |
| User | 800 |
| LiveSession | 120 |
| Order | 2400 |
| InteractionLog | 4800 |
| AfterSale | 160 |
| PurchaseOrder | 180 |
| PurchaseSuggestion | 60 |
| AnchorPerformance | 108 |
| ProductPerformance | 720 |
| OperationReport | 12 |
| InterfaceLog | 120 |
| UserBehaviorStat | 240 |

## 2. 自动化验证

执行命令：

```bash
npm run test:acceptance
npm run build
```

验证结果：

- `selectionEngine trend tests passed`
- `acceptance seed preview tests passed`
- `server npm run build` 通过 TypeScript 编译
- `client npm run build` 通过 Vue TypeScript 检查和 Vite 构建

## 3. 核心接口验证

验证接口：

- `POST /api/auth/login`
- `GET /api/selection/rankings`
- `POST /api/selection/coldstart/:productId`
- `GET /api/reports`
- `GET /api/after-sales`
- `GET /api/purchase-suggestions`

验证结果摘要：

| 指标 | 结果 |
|---|---:|
| 登录角色 | 管理层 |
| 选品排名数量 | 140 |
| 趋势分连续刷新是否稳定 | true |
| 冷启动相似商品数量 | 5 |
| 运营报告数量 | 12 |
| 售后工单数量 | 160 |
| 实时采购建议数量 | 79 |

## 4. 前端页面验证

验证地址：

- 前端：`http://localhost:5173`
- 后端：`http://localhost:3000`

验证路径：

1. 登录页使用 `EMP001 / 123456` 登录。
2. 进入选品分析页。
3. 等待选品表格加载。
4. 点击第一行商品。
5. 点击“新品冷启动评估”。
6. 页面显示“相似商品参照”。

验证结果：

- 选品页加载 140 行商品。
- 冷启动评估结果区正常渲染。
- 浏览器控制台没有页面错误。

## 5. 剩余风险

- `server/db/export.sql` 是作者数据库快照，但本地验收推荐使用 `seed:acceptance`，因为它可重复、数据量适中、无需 LLM 或大批量 SQL 导入。
- LLM 相关功能在没有 API Key 时会走本地 fallback，适合课堂验收；如需展示真实大模型效果，需要配置 `.env` 中的 `LLM_API_KEY`。
- 当前验证覆盖主要验收路径，不等同于生产级安全、压力和兼容性测试。
