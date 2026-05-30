# 直播电商数字化运营管理系统

> **Live Commerce Digital Operations Management System**

一个全栈直播电商数字化运营管理平台，提供从选品分析、直播监控、主播管理到售后处理的全链路数字化管理能力。

## 系统功能模块

| 模块 | 功能说明 |
|------|---------|
| **仪表盘** | KPI 总览（GMV、订单量、转化率、库存预警）、近 30 天销售趋势图、TOP5 主播排行 |
| **直播监控** | 实时直播模拟（SSE 推送）、在线人数/订单/弹幕实时展示、AI 情绪分析、AI 智能话术推荐 |
| **商品管理** | 商品 CRUD、分类/状态筛选、排序搜索 |
| **主播管理** | 主播 CRUD、雷达图能力展示、多主播对比 |
| **话术管理** | AI 生成直播话术（DeepSeek LLM）、预览后保存 |
| **库存管理** | 多仓库库存追踪、低库存预警高亮 |
| **采购管理** | 采购单状态流（待审核→已审核→已发货→已收货）、低库存自动采购建议 |
| **直播场次** | 直播场次排期管理、关联主播 |
| **选品分析** | 多因子商品评分（转化率/利润率/热度/趋势/质量）、Jaccard 相似度推荐、LLM 新品冷启动评估 |
| **售后管理** | 售后工单管理、状态流转处理 |
| **运营报告** | 运营报告生成（LLM 内容生成） |
| **供应商管理** | 供应商 CRUD、评分追踪 |
| **订单管理** | 订单列表查看、用户/商品关联详情 |
| **权限管理** | RBAC 角色权限体系（5 种角色 × 20 项权限） |

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
| **AI 大模型** | DeepSeek Chat（OpenAI 兼容）| 话术生成、选品建议、报告生成 |

---

## 小白也能跑起来 —— 完整安装指南

### 第一步：安装必备软件

在开始之前，请确保你的电脑安装了以下软件：

#### 1. Node.js（版本 18 或以上）

下载地址：https://nodejs.org

下载 LTS 版本，双击安装，一路"下一步"即可。

安装完成后，打开 **命令提示符**（Win+R 输入 `cmd` 回车），输入以下命令验证：

```bash
node -v
npm -v
```

如果都能看到版本号，说明安装成功。

#### 2. SQL Server 2022（Developer 版，免费）

下载地址：https://www.microsoft.com/zh-cn/sql-server/sql-server-downloads

往下滚动找到 **"Developer"** 版本，点击"立即下载"。

**安装步骤（关键！）：**

1. 双击安装包，选择 **"基本"** 安装类型
2. 一路点击"下一步"，等待安装完成
3. **重点：安装 SSMS（SQL Server Management Studio）**，安装完成后会弹出提示，点击安装 SSMS 即可
4. 打开 SSMS，连接到 `localhost`，使用 **SQL Server 身份验证**：
   - 登录名：`sa`
   - 密码：`123456`（你安装时设置的密码）

> **如果安装时没有设置 sa 密码，或忘记了密码：**
>
> 1. 打开 SSMS，使用 **Windows 身份验证** 连接
> 2. 在左侧"对象资源管理器"中，右键点击服务器名称 → "属性" → "安全性" → 选择 "SQL Server 和 Windows 身份验证模式"
> 3. 展开 "安全性" → "登录名" → 右键 `sa` → "属性" → 设置新密码
> 4. 右键服务器名称 → "重新启动"

#### 3. Git（用来上传到 GitHub）

下载地址：https://git-scm.com/download/win

下载后一路"下一步"安装即可。

---

### 第二步：克隆项目 & 安装依赖

如果你拿到了 GitHub 仓库地址，克隆到本地：

```bash
git clone <你的GitHub仓库地址>
cd live-commerce-hub
```

如果本项目已经在本地，直接在项目文件夹中打开命令提示符：

> 在项目文件夹地址栏输入 `cmd` 回车，或在文件夹空白处按 `Shift + 右键` → "在此处打开 PowerShell 窗口"

然后安装所有依赖：

```bash
# 安装根目录依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..

# 安装后端依赖
cd server
npm install
cd ..
```

---

### 第三步：配置数据库连接

#### 1. 创建数据库

打开 **SSMS**，连接到你的 SQL Server，然后：

1. 右键左侧 "数据库" → "新建数据库"
2. 数据库名称输入：`live_commerce_hub`
3. 点击"确定"

#### 2. 配置环境变量

进入 `server` 文件夹，复制 `.env.example` 并重命名为 `.env`：

```bash
cd server
copy .env.example .env
```

然后用**记事本**打开 `.env` 文件，修改以下内容：

```env
# MSSQL 数据库连接
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=你的sa密码       # ← 把这里改成你的数据库密码

# JWT（可以不改，用默认值也行）
JWT_SECRET=live-commerce-hub-secret-key-change-in-production

# DeepSeek API（如果你没有 DeepSeek API Key，AI 功能会用不了，但其他功能不受影响）
LLM_API_KEY=你的API_Key      # ← 去 https://platform.deepseek.com 注册获取
LLM_BASE_URL=https://api.deepseek.com/v1
LLM_MODEL=deepseek-chat

# 服务器端口
PORT=3000
```

> 如果你没有 DeepSeek API Key，LLM 相关功能（AI 话术生成、选品分析报告等）会报错，但**不影响登录、商品管理、库存管理等其他所有功能的正常使用**。

---

### 第四步：初始化数据库（建表 + 造数据）

这一步会自动创建 24 张数据表，并插入 20 多万条测试数据。

```bash
# 确保在项目根目录
cd live-commerce-hub

# 执行数据库迁移（建表）
npm run migrate

# 执行种子数据（插入测试数据）
npm run seed
```

**执行时间说明：**
- `npm run migrate`：约 5~10 秒，创建 24 张表
- `npm run seed`：约 2~5 分钟，插入约 28 万条测试数据
  - 8,000 用户
  - 225 商品 + 683 SKU + 1,021 库存记录
  - 40,441 订单 + 235,047 弹幕互动记录
  - 517 条 AI 话术
  - 等等……

> 如果 seed 过程中出现报错，通常是数据库连接配置问题，检查 `.env` 文件的数据库密码是否正确。

---

### 第五步：启动项目

```bash
# 确保在项目根目录
npm run dev
```

这个命令会同时启动：
- **前端**：http://localhost:5173
- **后端 API**：http://localhost:3000

浏览器会自动打开前端页面（或手动访问 `http://localhost:5173`）。

---

### 第六步：登录测试

系统预置了 6 个测试账号，对应不同角色：

| 员工编号 | 密码 | 角色 | 权限范围 |
|---------|------|------|---------|
| `EMP001` | `123456` | 管理层 | 全部权限 |
| `EMP002` | `123456` | 运营人员 | 运营相关模块 |
| `EMP003` | `123456` | 采购人员 | 采购相关模块 |
| `EMP004` | `123456` | 仓储人员 | 库存相关模块 |
| `EMP005` | `123456` | 主播 | 主播相关模块 |
| `EMP006` | `123456` | 管理层 | 全部权限 |

**推荐用 EMP001 登录**，可以看到全部功能。

---

## 项目结构

```
live-commerce-hub/
├── client/                          # 前端 Vue 3 项目
│   └── src/
│       ├── components/              # 可复用组件（侧边栏、表格、分页等）
│       ├── pages/                   # 页面组件（11 个功能页面）
│       ├── stores/                  # Pinia 状态管理
│       ├── types/                   # TypeScript 类型定义
│       ├── utils/                   # 工具函数
│       ├── App.vue                  # 根组件
│       └── main.ts                  # 入口文件
├── server/                          # 后端 Express 项目
│   └── src/
│       ├── db/
│       │   ├── migrations/          # 数据库迁移文件（建表）
│       │   └── seeds/               # 种子数据文件
│       ├── middleware/              # 中间件（认证等）
│       ├── routes/                  # API 路由（17 个模块）
│       ├── app.ts                   # Express 应用配置
│       └── index.ts                 # 服务器入口
├── package.json                     # 根 package.json（统一脚本）
└── README.md                        # 本文件
```

---

## 常用命令速查

| 命令 | 说明 |
|------|------|
| `npm run dev` | 同时启动前端 + 后端 |
| `npm run dev:server` | 仅启动后端 |
| `npm run dev:client` | 仅启动前端 |
| `npm run migrate` | 执行数据库迁移（建表） |
| `npm run seed` | 插入种子测试数据 |
| `npm run build` | 构建前端生产版本 |

---

## 常见问题

### Q: 启动报错 "用户 'sa' 登录失败"

A: 数据库密码不对，检查 `server/.env` 中 `DB_PASSWORD` 是否正确。

### Q: 执行 seed 太慢了

A: 种子数据包含约 28 万条记录，大数据量插入需要 2~5 分钟是正常的，请耐心等待。

### Q: AI 功能报错（话术生成、选品分析等）

A: 需要配置 DeepSeek API Key。去 https://platform.deepseek.com 注册获取（有免费额度），填入 `server/.env` 的 `LLM_API_KEY`。

### Q: 端口被占用

A: 如果 3000 或 5173 端口被占用：
- 修改 `server/.env` 的 `PORT` 为其他端口（如 3001）
- 同时修改 `client/vite.config.ts` 中 proxy 的 target 地址

### Q: npm install 报错

A: 尝试删除 `node_modules` 文件夹后重新安装：
```bash
rmdir /s node_modules
rmdir /s client\node_modules
rmdir /s server\node_modules
npm install
cd client && npm install && cd ..
cd server && npm install && cd ..
```

---

## 测试截图

`test_screenshots/` 文件夹中包含 25 张系统各功能页面的测试截图，包含登录页、仪表盘、商品管理、主播管理、话术管理、库存管理、采购管理、直播场次、售后管理、直播监控、选品分析等页面。

> 截图文件未包含在 Git 仓库中（已添加到 .gitignore），如需查看请找原开发者。

---

## 开发者信息

本项目为"信息系统分析与设计"课程项目，用于直播电商数字化运营管理系统的设计与实现。
