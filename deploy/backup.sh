#!/usr/bin/env bash
# ============================================================
# 智慧仓储 WMS · 数据库每日备份脚本
# 建议加入 crontab：每天凌晨 3 点执行
#   0 3 * * * /opt/wms/deploy/backup.sh >> /var/log/wms-backup.log 2>&1
# ============================================================

set -e

DATA_ROOT="${WMS_DATA_ROOT:-/data/wms}"
BACKUP_ROOT="${WMS_BACKUP_ROOT:-/data/wms-backups}"
KEEP_DAYS="${WMS_BACKUP_KEEP_DAYS:-30}"

TS=$(date +%Y%m%d-%H%M%S)
mkdir -p "$BACKUP_ROOT"

if [ ! -d "$DATA_ROOT" ]; then
  echo "❌ 数据根目录不存在：$DATA_ROOT"
  exit 1
fi

for tenant_dir in "$DATA_ROOT"/*/; do
  tenant=$(basename "$tenant_dir")
  db_file="$tenant_dir/wms.db"
  if [ ! -f "$db_file" ]; then continue; fi

  container="wms-$tenant"
  backup_dir="$BACKUP_ROOT/$tenant"
  mkdir -p "$backup_dir"

  # 使用 sqlite3 的 .backup 命令做在线一致性备份（如果容器里没装 sqlite3，回退到直接拷贝）
  if docker exec "$container" sh -c "command -v sqlite3" >/dev/null 2>&1; then
    docker exec "$container" sqlite3 /app/data/wms.db ".backup /app/data/backup-tmp.db"
    cp "$tenant_dir/backup-tmp.db" "$backup_dir/wms-$TS.db"
    rm -f "$tenant_dir/backup-tmp.db"
  else
    cp "$db_file" "$backup_dir/wms-$TS.db"
  fi

  # gzip 压缩
  gzip -f "$backup_dir/wms-$TS.db"
  echo "✅ [$tenant] 备份完成：$backup_dir/wms-$TS.db.gz"

  # 清理超期备份
  find "$backup_dir" -name 'wms-*.db.gz' -mtime +"$KEEP_DAYS" -delete
done

echo "→ 本次备份于 $(date) 完成，保留最近 $KEEP_DAYS 天"
