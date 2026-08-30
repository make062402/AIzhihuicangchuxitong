# 智慧仓储管理系统 (WMS)

## 产品概述

面向中小型仓储企业的一体化管理平台，覆盖入库、出库、库存、自动计费全流程，通过多维度计费规则和精确的存放时间追踪，帮助企业提升仓储运营效率。

## 核心功能

### 1. 多方式登录认证
- **账号密码登录** — 传统用户名/密码方式
- **邮箱验证码登录** — 通过邮箱接收 6 位验证码
- **手机短信登录** — 通过手机号接收短信验证码
- **角色权限** — 管理员/普通操作员分级

### 2. 库存总览大屏
- 实时库存总量、SKU 数、库位占用率
- 今日出入库统计、月度趋势曲线
- 费用总览、TOP 型号、库位热力图

### 3. 入库管理
- 字段：来源、入库日期、物品型号、数量、存放位置
- 支持 Excel 批量导入
- 自动更新库存台账、记录批次

### 4. 出库管理
- 字段：去向、出库日期、物品型号（下拉动态关联入库型号）、数量
- 保存时自动按 FIFO 分配批次、计算存放时长
- 自动匹配计费规则生成费用明细
- 支持人工录入附加费、人工费

### 5. 计费规则引擎
- 多维度匹配：货品型号 + 存放位置 + 日期区间
- 计费方式：日租金、阶梯计费、最低起租
- 规则层级：L1 物品+库位 > L2 仅物品 > L3 仅库位 > L4 通用
- 优先级采用四级枚举（关键 / 高 / 中 / 低），避免任意数字带来的歧义

### 6. 费用明细中心
- 按出库批次追踪费用构成（基础存储费 + 人工附加费）
- 支持导出 Excel

### 7. 库存预警看板
- 4 类预警：断货、库存偏低、库存过高、滞留过久
- 管理员可为每个物品设置低/高阈值和老化天数

### 8. 操作日志（审计）
- 记录登录、入库、出库、规则变更等关键动作
- 可按用户、资源类型、动作、时间范围检索

### 9. 权限控制
- **管理员**：所有功能 + 用户管理 + 计费规则 + 操作日志 + 阈值设置
- **操作员**：仅可操作出入库和查看库存/费用/预警

## 数据模型

### users - 用户表
- id, username, password_hash, email, phone, role(admin/operator), display_name, created_at

### items - 物品型号表
- id, model_code(型号), name, unit, category, created_at

### locations - 库位表
- id, code(库位编号), zone(区域), capacity, created_at

### inbound_records - 入库记录
- id, source(来源), inbound_date, item_id, quantity, location_id, remaining_qty(剩余可出库数), operator_id, created_at

### outbound_records - 出库记录
- id, destination(去向), outbound_date, item_id, quantity, operator_id, total_fee, storage_fee, manual_fee, remark, created_at

### outbound_batches - 出库批次关联（FIFO）
- id, outbound_id, inbound_id, quantity, days_stored, fee

### billing_rules - 计费规则表
- id, name, item_id(可空,空为通用), location_id(可空), start_date, end_date, price_per_day, min_days, tier_config, priority, active

### fee_details - 费用明细
- id, outbound_id, fee_type(storage/labor/extra), description, amount, created_at

## 页面结构

- `/login` — 登录页（三种方式Tab切换）
- `/dashboard` — 库存总览大屏
- `/inbound` — 入库管理
- `/outbound` — 出库管理
- `/inventory` — 库存明细
- `/billing/rules` — 计费规则（管理员）
- `/billing/fees` — 费用明细
- `/admin/users` — 用户管理（管理员）
- `/admin/items` — 物品与库位（管理员）

## API 端点

- POST `/api/auth/login` — 密码登录
- POST `/api/auth/send-email-code` — 发送邮箱验证码
- POST `/api/auth/send-sms-code` — 发送短信验证码
- POST `/api/auth/verify-code` — 验证码登录
- POST `/api/auth/me` — 当前用户信息
- POST `/api/items/*` — 物品 CRUD
- POST `/api/locations/*` — 库位 CRUD
- POST `/api/inbound/*` — 入库 CRUD & 批量导入
- POST `/api/outbound/*` — 出库 CRUD & 自动计费
- POST `/api/inventory/summary` — 库存汇总
- POST `/api/billing/rules/*` — 计费规则管理
- POST `/api/billing/fees/*` — 费用明细查询
- POST `/api/users/*` — 用户管理
