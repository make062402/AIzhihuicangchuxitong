#!/usr/bin/env bash
# ============================================================
# 智慧仓储 WMS · 一键打包交付脚本
# ============================================================
# 说明：把源码、Dockerfile、docker-compose、部署脚本、客户对接
#       资料整理成一个压缩包，方便打包发给客户/交付方。
#
# 用法：
#   ./export-package.sh                # 生成 wms-delivery-<日期>.tar.gz
#   ./export-package.sh mycompany      # 生成 wms-mycompany-<日期>.tar.gz
# ============================================================

set -e

cd "$(dirname "$0")/.."

LABEL="${1:-delivery}"
DATE=$(date +%Y%m%d)
NAME="wms-${LABEL}-${DATE}"
OUT="/tmp/${NAME}.tar.gz"

echo "→ 打包目标：$OUT"

tar --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.git' \
    --exclude='wms-data' \
    --exclude='data' \
    --exclude='*.log' \
    -czf "$OUT" \
    Dockerfile \
    docker-compose.yml \
    backend \
    frontend \
    deploy/README.md \
    deploy/new-tenant.sh \
    deploy/backup.sh \
    "deploy/客户对接资料模板.md"

SIZE=$(du -h "$OUT" | cut -f1)

echo ""
echo "✅ 交付包已生成"
echo "   文件：$OUT"
echo "   大小：$SIZE"
echo ""
echo "→ 交付方在自己服务器上：解压 → docker compose up -d → 浏览器访问 8080"
