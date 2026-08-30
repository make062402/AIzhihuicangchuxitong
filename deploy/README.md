# 智慧仓储 WMS · 部署指南

采用 **一客户一部署**（每个客户 = 一个独立容器 + 独立数据库 + 独立域名/端口），
互相物理隔离，数据 0 交叉风险。

---

## 🚀 快速开始（客户单机部署，一条命令）

**适合场景**：只服务一个客户 / 客户想自己在自己服务器上跑

前提：客户服务器已安装 Docker（`docker` 与 `docker compose` 命令可用）。

```bash
# 1. 解压交付包到任意目录
tar -xzf wms-delivery-<日期>.tar.gz && cd wms-delivery-*/

# 2. 一条命令启动（后台运行）
docker compose up -d

# 3. 浏览器访问
#    http://<服务器IP>:8080
#    默认账号：admin / admin123（首次登录必须修改密码）
```

数据自动保存在同目录下 `./wms-data/`，随时可以打包备份。

需要修改端口 / JWT 密钥 → 编辑 `docker-compose.yml` 里的对应字段即可。

---

## 一、准备工作（多客户 / 服务商场景）

### 1.1 服务器要求
- Linux（Ubuntu 20.04+ / CentOS 7+ / TencentOS 均可）
- 2 核 4G 起步，够跑 10 个客户
- 已安装：`docker`, `openssl`, `nginx`（可选，用于域名反代）

### 1.2 构建镜像（在项目根目录）
```bash
docker build -t wms:latest .
```

### 1.3 打包交付给客户
```bash
cd /opt/wms
./deploy/export-package.sh acme    # 生成 /tmp/wms-acme-<日期>.tar.gz
```
把这个压缩包发给客户，客户解压后 `docker compose up -d` 即可运行。

### 1.4 目录约定
```
/opt/wms/               # 代码与部署脚本
/data/wms/<tenant>/     # 每个客户的数据库文件
/data/wms-backups/      # 每日备份归档
```

## 二、开通一个新客户

在服务器上执行：
```bash
cd /opt/wms/deploy
./new-tenant.sh acme          # 端口自动分配（8001 开始）
# 或
./new-tenant.sh baker 8081    # 指定端口
```

脚本会：
1. 创建一个独立 Docker 容器 `wms-acme`
2. 生成独立数据库目录 `/data/wms/acme/`
3. 生成独立随机 JWT 密钥，落盘保存
4. 打印访问地址与默认账号

**首次登录后必须修改 admin 密码**。

## 三、可选：配置域名 + HTTPS

在 `/etc/nginx/conf.d/wms.conf` 里追加：
```nginx
server {
    listen 80;
    server_name acme.your-domain.com;
    location / {
        proxy_pass http://127.0.0.1:8001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```
重载 Nginx：
```bash
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d acme.your-domain.com   # 一键 HTTPS
```

## 四、日常运维

### 4.1 备份（推荐每日）
```bash
crontab -e
# 加入下面这行
0 3 * * * /opt/wms/deploy/backup.sh >> /var/log/wms-backup.log 2>&1
```

### 4.2 查看某个客户的日志
```bash
docker logs -f wms-acme
```

### 4.3 停止 / 重启客户服务
```bash
docker stop wms-acme
docker start wms-acme
docker restart wms-acme
```

### 4.4 升级（发新版）
```bash
cd /opt/wms
git pull                          # 或替换代码
docker build -t wms:latest .

# 逐个客户升级（备份 → 重建）
for c in $(docker ps --filter label=wms.tenant --format '{{.Names}}'); do
  tenant=${c#wms-}
  echo "→ 升级 $tenant"
  cp /data/wms/$tenant/wms.db /data/wms/$tenant/wms.db.bak-$(date +%s)
  port=$(docker port $c 3000 | cut -d: -f2)
  docker rm -f $c
  ./deploy/new-tenant.sh $tenant $port
done
```

### 4.5 卸载某个客户（谨慎）
```bash
docker rm -f wms-acme
# 备份保留，源数据保留（如需彻底删除再执行下一行）
# rm -rf /data/wms/acme
```

## 五、常见问题

| 问题 | 解决 |
|---|---|
| 访问显示"无法连接" | `docker ps` 检查容器是否 Up；防火墙放行端口 |
| 忘记 admin 密码 | 停容器后拷贝 db 文件到本地，用 sqlite 工具 UPDATE users SET password_hash='<bcrypt hash>' WHERE username='admin' |
| 数据库文件多大要担心 | SQLite 单表百万级记录仍然流畅；超过 1000 万条建议升级到方案 B（多租户） |
| 客户想导出全量数据 | 直接把 `/data/wms/<tenant>/wms.db` 拷贝给客户，SQLite 通用格式 |

## 六、什么时候要升级到方案 B（SaaS 多租户）

- 客户数超过 15 家，一个个升级太累
- 想做跨客户的运营看板 / 平台后台
- 有"客户在线自助注册开户"的诉求

到时候我们可以在这套基础上加 `tenant_id` 逐步演进，代码不用推倒重来。
