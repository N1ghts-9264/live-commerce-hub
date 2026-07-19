# 洞策 · 直播电商全链路运营中台

> **Live Commerce Digital Operations Hub** · 从 0 到 1 的 AI 驱动直播电商业务中台

面向一家 80-100 人规模 MCN 机构（20+ 主播、日均 30+ 场直播、月均 2000+ SKU），设计并实现覆盖"选品 → 采购 → 库存 → 直播 → 售后 → 复盘"全链路的数字化运营中台。

**`git clone && bash setup.sh` 一键部署，42MB 数据库备份一键恢复。**

---

## 项目亮点

- **从 0 到 1**：从虚拟公司构想、6M 鱼骨图根因分析、DFD/ER 图、到设计系统、工程交付
- **AI 驱动**：DeepSeek LLM 赋能话术生成、多因子选品评分、数字顾问报告、弹幕情绪感知
- **14 阶段 LLM 数据管线**：利用 DeepSeek API 生成 28 万+ 条真实级模拟业务数据，含 LLM 缓存机制
- **"纸墨金朱"设计系统**：12 色阶 × 6 字重 × 5 间距级的完整 CSS Token 体系
- **数据库运维体系**：gzip 备份压缩 + `db:reset` 一键恢复 + 5 级操作风险分级

---

## 系统功能模块

| 模块 | 功能说明 |
|------|---------|
| **仪表盘** | KPI 总览（GMV、订单量、转化率、库存预警）、近 30 天销售趋势图、TOP5 主播排行、GMV 占比分析 |
| **直播监控** | 实时直播模拟（SSE 推送）、在线人数/订单/弹幕实时展示、AI 情绪分析、AI 智能话术推荐 |
| **直播场次** | 场次排期管理、状态流转（待安排 → 已排期 → 进行中 → 已结束） |
| **场次安排** | 主播-商品适配引擎（A/B/C 评级）、带货计划生成、脚本绑定、人工调整与确认 |
| **选品分析** | 多因子商品评分（转化率/利润率/热度/趋势/质量）、Jaccard 相似度推荐、新品冷启动评估、AI 数字顾问报告 |
| **商品管理** | 商品 CRUD、分类/状态筛选、搜索排序、SKU 管理 |
| **主播管理** | 主播 CRUD、雷达图能力展示（转化率/观看时长/互动率/脚本执行分）、多主播对比 |
| **话术管理** | AI 生成直播话术（DeepSeek LLM）、预览后保存、场次绑定 |
| **库存管理** | 多仓库库存追踪、低库存预警高亮、一键采购 |
| **采购管理** | 采购单状态流（待审核 → 已审核 → 已发货 → 已收货）、自动采购建议、新品采购 |
| **售后管理** | 售后工单管理、状态流转处理、退款操作 |
| **运营报告** | 运营报告生成（LLM 内容生成）、报告分类查看 |
| **供应商管理** | 供应商 CRUD、评分追踪 |
| **订单管理** | 订单列表查看、用户/商品关联详情 |
| **权限管理** | RBAC 角色权限体系（6 种角色 × 20 项权限）、前后端双重鉴权 |

---

## 技术栈

| 层级 | 技术 | 说明 |
|------|------|------|
| **前端框架** | Vue 3 + TypeScript | Composition API + `<script setup>` |
| **构建工具** | Vite 8 | 开发服务器端口 5173 |
| **状态管理** | Pinia 3 | 认证状态管理 |
| **路由** | Vue Router 4 | 懒加载路由 |
| **HTTP 客户端** | Axios | JWT 认证拦截器 |
| **图表** | Chart.js 4 + vue-chartjs | 折线图、饼图、雷达图 |
| **图标** | Lucide Vue Next | 现代图标库 |
| **后端框架** | Express 4 + TypeScript | RESTful API 端口 3000 |
| **数据库 ORM** | Knex 3 | 查询构建 + 迁移 + 种子数据 |
| **数据库** | Microsoft SQL Server | 本地 localhost:1433 |
| **认证** | JWT + bcryptjs | Bearer Token |
| **AI 大模型** | DeepSeek Chat（OpenAI 兼容）| 话术生成、选品建议、报告生成、情绪分析 |

---

## 设计系统 · 纸墨金朱

12 色阶 × 6 字重 × 5 间距级的完整 CSS Token 体系。

| Token | 色值 | 用途 |
|--------|------|------|
| 纸色 Paper | `#F5F2E8` | 页面背景 |
| 墨色 Ink | `#111111` | 主标题、核心文字 |
| 朱砂 Vermillion | `#C41E3A` | 强调色、关键数据、告警 |
| 金色 Gold | `#B58940` | 高亮、成就徽章 |

设计原则：E-Ink/Paper 扁平风格，无阴影、无过渡动画、直角按钮、等宽字体展示数字。

---

## 数据规模

| 数据表 | 数量 |
|--------|------|
| 商品 / SKU | 225 / 683 |
| 直播场次 | 300 场 |
| 订单 | 40,441 条 |
| 互动记录 | 235,047 条 |
| 售后工单 | 2,000 条 |
| 采购单 | 400 条 |
| **总计** | **28 万+ 条** |

数据库备份压缩包：42MB（gzip）→ 解压 158MB，28 张表。

---

## 快速开始

### 环境要求

- **Node.js 18+**
- **Microsoft SQL Server 2022**（Developer 版免费）
- **Git**

### 一键安装

```bash
git clone https://github.com/N1ghts-9264/live-commerce-hub.git
cd live-commerce-hub
bash setup.sh    # 安装依赖 + 配置 .env + 恢复数据库
npm run dev      # 启动 http://localhost:5173
```

### 手动安装

```bash
# 1. 安装依赖
npm install && cd client && npm install && cd ../server && npm install && cd ..

# 2. 配置数据库
# 复制 server/.env.example → server/.env，修改 DB_PASSWORD 和 LLM_API_KEY

# 3. 创建数据库（在 SSMS 中）
# 新建数据库 live_commerce_hub

# 4. 初始化
npm run migrate           # 创建 28 张表
npm run seed:acceptance   # 写入验收数据（可重复、稳定）

# 5. 启动
npm run dev
```

### 测试账号

| 员工编号 | 密码 | 角色 | 可见模块数 |
|---------|------|------|:--------:|
| `EMP001` | `123456` | 管理层 | 全部 11 |
| `EMP002` | `123456` | 运营人员 | 9 |
| `EMP003` | `123456` | 采购人员 | 5 |
| `EMP004` | `123456` | 仓储人员 | 2 |
| `EMP005` | `123456` | 主播 | 3 |
| `EMP006` | `123456` | 系统管理员 | 全部 11 |

> 推荐用 **EMP001** 登录，查看全部功能。

---

## 项目结构

```
live-commerce-hub/
├── client/                          # 前端 Vue 3
│   └── src/
│       ├── components/              # 通用组件（侧边栏、表格、KPI卡、分页等）
│       ├── pages/                   # 12 个功能页面
│       ├── stores/                  # Pinia 状态管理
│       ├── api/                     # Axios 实例 + 拦截器
│       ├── types/                   # TypeScript 类型定义
│       └── utils/                   # 工具函数
├── server/                          # 后端 Express
│   └── src/
│       ├── db/
│       │   ├── migrations/          # 数据库迁移（4 个文件，28 张表）
│       │   └── seeds/               # 种子数据 + LLM 增强管线
│       ├── middleware/              # JWT 认证中间件
│       ├── routes/                  # 17 个 API 路由模块
│       └── services/                # 业务逻辑层（选品引擎、直播模拟器等）
├── docs/
│   ├── acceptance/                  # 验收材料（测试方案、平台数据流等）
│   └── superpowers/plans/           # 设计规范
├── setup.sh / setup.bat             # 一键部署脚本
├── CLAUDE.md                        # AI 协作规范（220 行）
└── 验证计划.md                       # 30+ Bug 修复记录 + 数据量核对
```

---

## 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前后端 |
| `npm run build` | 构建前端生产版本 |
| `npm run migrate` | 执行数据库迁移（建表） |
| `npm run seed:acceptance` | 写入验收数据（稳定可重复） |
| `npm run seed` | 写入随机大数据 |
| `npm run test:acceptance` | 运行验收测试 |
| `bash setup.sh` | 一键初始化（安装 + 配置 + 恢复数据库） |

### 数据库管理

| 命令 | 风险 | 说明 |
|------|:--:|------|
| `npm run db:reset` | 🟢 安全 | 从 42MB 备份一键恢复全库 |
| `npm run db:backup` | 🟢 安全 | 导出当前数据快照 |
| `npm run db:regenerate` | 🔴 全库销毁 | 清空 + LLM 随机重建（仅开发用） |

---

## 从 0 到 1 的方法论

本项目遵循完整的系统分析与设计流程：

```
虚拟公司构想 → 业务背景分析 → 6M 鱼骨图根因分析 → 系统边界定义
→ DFD 数据流图 → ER 图 → 数据字典 → UI 设计系统
→ 数据库建模（28 表）→ AI 数据管线 → 前后端开发
→ 交叉测试矩阵 → Bug 追踪修复 → 验收交付
```

核心文档产出：
- 项目背景与鱼骨图分析
- 案例描述（企业背景、业务流程、问题分析、系统目标）
- DFD 数据流图 + ER 图 + 数据字典
- UI 设计方案（纸墨金朱设计系统）
- 验证计划（30+ Bug 修复记录）
- 权限体系与跨域关键关系图
- 系统测试方案（SAD 标准）

---

## 常见问题

### Q: 启动报错 "用户 'sa' 登录失败"
A: 检查 `server/.env` 中 `DB_PASSWORD` 是否正确。

### Q: AI 功能报错
A: 需配置 DeepSeek API Key → https://platform.deepseek.com（新用户有免费额度）。无 API Key 不影响登录、商品管理、库存管理等基础功能。

### Q: 端口被占用
A: 修改 `server/.env` 的 `PORT`，同步修改 `client/vite.config.ts` 中的 proxy target。

---

## 课程信息

本项目为北京航空航天大学《信息系统分析与设计》课程项目。

**开发者**：[杨浩田](https://github.com/N1ghts-9264) · 敬兴 · 董蠡 · 王凯乐

**代码仓库**：[github.com/N1ghts-9264/live-commerce-hub](https://github.com/N1ghts-9264/live-commerce-hub)
