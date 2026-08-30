#!/usr/bin/env bash
# ============================================================
# 智慧仓储 WMS · 新客户一键开户脚本
# 每个客户一个独立容器 + 独立数据库 + 独立域名/端口
# ============================================================
# 用法：
#   ./new-tenant.sh <客户短标识> [端口]
# 示例：
#   ./new-tenant.sh acme            # 默认自动分配端口
#   ./new-tenant.sh baker 8081      # 指定端口
# ============================================================

set -e

if [ -z "$1" ]; then
  echo "用法: $0 <客户短标识> [端口]"
  echo "示例: $0 acme        # 自动分配端口"
  echo "      $0 baker 8081  # 指定端口"
  exit 1
fi

TENANT="$1"
PORT="${2:-}"
IMAGE="${WMS_IMAGE:-wms:latest}"
DATA_ROOT="${WMS_DATA_ROOT:-/data/wms}"

# 校验 tenant 命名：小写字母/数字/短横线，1-32 位
if ! echo "$TENANT" | grep -qE '^[a-z0-9-]{1,32}$'; then
  echo "❌ 客户短标识仅允许小写字母、数字和 -，长度 1-32"
  exit 1
fi

# 自动分配端口：8001 起
if [ -z "$PORT" ]; then
  PORT=8001
  while docker ps --format '{{.Ports}}' | grep -q ":$PORT->"; do
    PORT=$((PORT + 1))
  done
fi

CONTAINER="wms-$TENANT"
DATA_DIR="$DATA_ROOT/$TENANT"

# 已存在则拒绝
if docker ps -a --format '{{.Names}}' | grep -q "^$CONTAINER$"; then
  echo "❌ 容器 $CONTAINER 已存在，若要重建请先执行: docker rm -f $CONTAINER"
  exit 1
fi

echo "→ 客户标识 : $TENANT"
echo "→ 容器名称 : $CONTAINER"
echo "→ 数据目录 : $DATA_DIR"
echo "→ 对外端口 : $PORT"
echo "→ 使用镜像 : $IMAGE"
echo ""

mkdir -p "$DATA_DIR"

# 生成随机 JWT 密钥并落盘（供后续查阅）
JWT_SECRET=$(openssl rand -hex 32 2>/dev/null || head -c 32 /dev/urandom | xxd -p)
echo "$JWT_SECRET" > "$DATA_DIR/.jwt-secret"
chmod 600 "$DATA_DIR/.jwt-secret"

docker run -d \
  --name "$CONTAINER" \
  --restart=always \
  -p "$PORT:3000" \
  -v "$DATA_DIR:/app/data" \
  -e NODE_ENV=production \
  -e JWT_SECRET="$JWT_SECRET" \
  -e CORS_ORIGIN="*" \
  --label "wms.tenant=$TENANT" \
  "$IMAGE" > /dev/null

echo "✅ 客户 $TENANT 已开通"
echo ""
echo "访问地址   : http://<服务器IP>:$PORT"
echo "默认管理员 : admin / admin123 （首次登录请立即修改密码）"
echo "数据目录   : $DATA_DIR"
echo "日志查看   : docker logs -f $CONTAINER"
echo "停止服务   : docker stop $CONTAINER"
echo "永久删除   : docker rm -f $CONTAINER && rm -rf $DATA_DIR"
echo ""
echo "→ 建议：在 Nginx 里加一个域名映射，例如 $TENANT.你的域名.com → :$PORT"
