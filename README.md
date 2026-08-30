# 智慧仓储管理系统（Smart WMS）

> 面向中小型仓储企业的一体化管理平台，覆盖**入库、出库、库存、自动计费**全流程，通过多维度计费规则与精确的存放时间追踪，帮助企业提升仓储运营效率。

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)

---

## ✨ 核心功能

- 🔐 **多方式登录** — 账号密码 / 邮箱验证码 / 手机短信验证码，管理员与操作员分级权限
- 📊 **库存总览大屏** — 实时库存总量、SKU 数、库位占用率、出入库趋势、库位热力图
- 📥 **入库管理** — 来源/日期/型号/数量/库位登记，支持 Excel 批量导入
- 📤 **出库管理** — 按 **FIFO（先进先出）** 自动分配批次、计算存放天数
- 💰 **计费规则引擎** — 多维匹配（型号 + 库位 + 日期区间），日租金 / 阶梯计费 / 最低起租，四级优先级
- 🧾 **费用明细中心** — 按出库批次追踪费用构成（存储费 + 人工/附加费），支持导出 Excel
- 🚨 **库存预警** — 断货 / 偏低 / 过高 / 滞留过久 4 类预警
- 🕵️ **操作日志（审计）** — 记录登录、出入库、规则变更等关键动作，可按多维检索
- 🐳 **一客户一部署** — 单容器一条命令交付，多客户物理隔离

---

## 🧱 技术栈

| 层 | 技术 |
| --- | --- |
| 前端 | React 19 · TypeScript · Vite 7 · Tailwind CSS 4 · Radix UI（shadcn 风格）· TanStack Query · Recharts |
| 后端 | Node.js 20 · Express 4 · better-sqlite3 · JWT · Zod · Pino |
| 测试 | Jest · supertest · ts-jest |
| 部署 | Docker（多阶段构建）· pnpm monorepo |

---

## 🚀 快速开始

### 一键部署（生产 / 交付客户）

```bash
docker compose up -d
# 浏览器访问 http://<服务器IP>:8080
# 默认账号：admin / admin123（首次登录后请修改密码）
```

数据保存在宿主机 `./wms-data/` 目录，可随时打包备份。

### 本地开发

```bash
# 后端（端口 3000，热重载）
cd backend && pnpm install && pnpm dev

# 前端（端口 5173，已配置 /api 代理）
cd frontend && pnpm install && pnpm dev
```

### 测试与构建

```bash
cd backend && pnpm test      # 集成测试
cd backend && pnpm build     # 编译
cd frontend && pnpm build    # 打包
```

---

## 🗂️ 多租户开户（服务商场景）

```bash
cd /opt/wms/deploy
./new-tenant.sh acme          # 自动分配端口（8001 起）
./new-tenant.sh baker 8081    # 指定端口
```

每个客户 = 独立容器 + 独立数据库 + 独立随机 JWT 密钥，物理隔离、零数据交叉。详见 [`deploy/README.md`](deploy/README.md)。

---

## 📁 项目结构

```
├── backend/          # Express + TypeScript + SQLite 后端
│   └── src/modules/  # 按业务域拆分（auth/inbound/outbound/billing/...）
├── frontend/         # React 19 + Vite 前端
│   └── src/          # pages / components / hooks / lib
├── deploy/           # 部署脚本（new-tenant / export-package / backup）
├── docs/             # 项目文档（需求/架构/技术方案等）
├── Dockerfile        # 多阶段构建（单容器一体化）
└── docker-compose.yml # 客户单机交付配置
```

---

## 📚 文档

完整文档见 [`docs/`](docs/) 目录：

- [需求文档](docs/01-需求文档.md)
- [功能清单](docs/02-功能清单.md)
- [系统架构](docs/03-系统架构.md)
- [技术方案](docs/04-技术方案.md)
- [实现说明](docs/05-实现说明.md)
- [用户使用路径](docs/06-用户使用路径.md)

---

## 📄 License

[MIT](LICENSE)
