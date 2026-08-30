import { ShieldCheck, User as UserIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * 统一的角色徽章配色规则：
 * - 管理员 admin: primary（品牌深蓝）+ 盾牌图标，代表"最高权限"
 * - 操作员 operator: info（信息蓝的柔和变体）+ 用户图标，代表"日常操作"
 * 两种颜色都在蓝色系内，保证视觉一致性；管理员深、操作员浅。
 */

interface Props {
  role: 'admin' | 'operator'
  size?: 'sm' | 'md'
  className?: string
}

export default function RoleBadge({ role, size = 'sm', className }: Props) {
  const isAdmin = role === 'admin'
  const Icon = isAdmin ? ShieldCheck : UserIcon

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium border',
        size === 'sm' ? 'text-xs' : 'text-sm',
        isAdmin
          ? 'bg-primary/10 text-primary border-primary/25'
          : 'bg-info/10 text-info border-info/25',
        className
      )}
      style={{
        padding:
          size === 'sm'
            ? '2px 8px'
            : '4px 10px',
        gap: 4,
      }}
    >
      <Icon className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5'} />
      {isAdmin ? '管理员' : '操作员'}
    </span>
  )
}
