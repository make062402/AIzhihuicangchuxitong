import { useState } from 'react'
import { NavLink, useNavigate, Outlet, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/use-auth'
import {
  LayoutDashboard,
  PackagePlus,
  PackageMinus,
  Boxes,
  Receipt,
  Settings2,
  Users,
  LogOut,
  Package,
  MapPin,
  Lock,
  AlertTriangle,
  FileClock,
  MoreHorizontal,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Sheet, SheetContent, SheetTrigger, SheetTitle } from '@/components/ui/sheet'
import { Tooltip, TooltipTrigger, TooltipContent } from '@/components/ui/tooltip'
import Logo from '@/components/Logo'
import RoleBadge from '@/components/RoleBadge'

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  admin?: boolean
  section?: string
}

const NAV: NavItem[] = [
  { to: '/dashboard', label: '库存总览', icon: LayoutDashboard, section: '业务' },
  { to: '/inbound', label: '入库管理', icon: PackagePlus, section: '业务' },
  { to: '/outbound', label: '出库管理', icon: PackageMinus, section: '业务' },
  { to: '/inventory', label: '库存明细', icon: Boxes, section: '业务' },
  { to: '/alerts', label: '库存预警', icon: AlertTriangle, section: '业务' },
  { to: '/billing/fees', label: '费用明细', icon: Receipt, section: '业务' },
  { to: '/billing/rules', label: '计费规则', icon: Settings2, admin: true, section: '系统管理' },
  { to: '/admin/items', label: '物品型号', icon: Package, admin: true, section: '系统管理' },
  { to: '/admin/locations', label: '库位管理', icon: MapPin, admin: true, section: '系统管理' },
  { to: '/admin/users', label: '用户管理', icon: Users, admin: true, section: '系统管理' },
  { to: '/admin/audit-logs', label: '操作日志', icon: FileClock, admin: true, section: '系统管理' },
]

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isAdmin, logout } = useAuth()
  const navigate = useNavigate()

  const visible = NAV.filter((n) => !n.admin || isAdmin)
  const groups: Record<string, NavItem[]> = {}
  visible.forEach((n) => {
    const key = n.section || '其他'
    if (!groups[key]) groups[key] = []
    groups[key].push(n)
  })

  return (
    <div className="h-full flex flex-col p-4">
      <div className="flex items-center gap-3 px-1 py-2 mb-4">
        <Logo size={40} />
        <div className="flex flex-col leading-tight">
          <span className="text-base font-semibold tracking-tight">智慧仓储</span>
          <span className="text-xs opacity-70 tracking-wide">WMS · 管理系统</span>
        </div>
      </div>

      <nav className="flex-1 flex flex-col gap-4 overflow-y-auto">
        {Object.entries(groups).map(([section, list]) => (
          <div key={section} className="flex flex-col gap-1">
            <div className="px-3 pt-1 pb-1 text-[10px] font-semibold uppercase tracking-widest opacity-50">
              {section}
            </div>
            {list.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => {
                  navigate(item.to)
                  onNavigate?.()
                }}
                className={({ isActive }) =>
                  `flex items-center gap-3 rounded-md text-sm transition-colors py-2.5 px-3 ${
                    isActive
                      ? 'bg-sidebar-primary text-sidebar-primary-foreground'
                      : 'hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
                  }`
                }
              >
                <item.icon className="w-4 h-4" />
                <span className="flex-1">{item.label}</span>
                {item.admin && (
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <span className="inline-flex items-center justify-center w-4 h-4 rounded-sm opacity-60 hover:opacity-100">
                        <Lock className="w-3 h-3" />
                      </span>
                    </TooltipTrigger>
                    <TooltipContent side="right">
                      仅管理员可访问
                    </TooltipContent>
                  </Tooltip>
                )}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      <div className="border-t border-sidebar-border pt-3 mt-3">
        <div className="flex items-center gap-3 px-1">
          <Avatar className="w-9 h-9">
            <AvatarFallback
              className={
                isAdmin
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-info text-info-foreground'
              }
            >
              {user?.display_name?.[0] || user?.username?.[0] || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <div className="text-sm truncate font-medium">{user?.display_name}</div>
            <div className="mt-0.5">
              <RoleBadge role={user?.role || 'operator'} />
            </div>
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={logout}
            className="text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// 手机底部 Tab 栏的核心快捷入口
const BOTTOM_TABS: NavItem[] = [
  { to: '/dashboard', label: '总览', icon: LayoutDashboard },
  { to: '/inbound', label: '入库', icon: PackagePlus },
  { to: '/outbound', label: '出库', icon: PackageMinus },
  { to: '/inventory', label: '库存', icon: Boxes },
]

function MobileBottomTabs() {
  const location = useLocation()
  const navigate = useNavigate()

  // "更多"入口用于把系统管理相关放进去
  const isMore = ['/alerts', '/billing/', '/admin/'].some((p) =>
    location.pathname.startsWith(p)
  )

  return (
    <nav
      className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-background border-t shadow-[0_-2px_10px_rgb(0,0,0,0.05)]"
      style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
    >
      <div className="flex items-stretch">
        {BOTTOM_TABS.map((tab) => {
          const active = location.pathname.startsWith(tab.to)
          const Icon = tab.icon
          return (
            <button
              key={tab.to}
              onClick={() => navigate(tab.to)}
              className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 transition-colors ${
                active
                  ? 'text-primary'
                  : 'text-muted-foreground active:bg-muted/60'
              }`}
            >
              {active && (
                <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
              )}
              <Icon
                className={`w-5 h-5 ${
                  active ? 'stroke-[2.3]' : 'stroke-[1.8]'
                }`}
              />
              <span
                className={`text-[10.5px] leading-none ${
                  active ? 'font-semibold' : ''
                }`}
              >
                {tab.label}
              </span>
            </button>
          )
        })}

        {/* 更多入口 —— 打开侧边抽屉 */}
        <MoreTabButton isActive={isMore} />
      </div>
    </nav>
  )
}

function MoreTabButton({ isActive }: { isActive: boolean }) {
  const [open, setOpen] = useState(false)
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <button
          className={`relative flex-1 flex flex-col items-center justify-center gap-0.5 py-2 min-h-14 transition-colors ${
            isActive
              ? 'text-primary'
              : 'text-muted-foreground active:bg-muted/60'
          }`}
        >
          {isActive && (
            <span className="absolute top-0 w-8 h-0.5 bg-primary rounded-full" />
          )}
          <MoreHorizontal
            className={`w-5 h-5 ${isActive ? 'stroke-[2.3]' : 'stroke-[1.8]'}`}
          />
          <span
            className={`text-[10.5px] leading-none ${
              isActive ? 'font-semibold' : ''
            }`}
          >
            更多
          </span>
        </button>
      </SheetTrigger>
      <SheetContent
        side="left"
        className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border"
      >
        <SheetTitle className="sr-only">导航菜单</SheetTitle>
        <SidebarContent onNavigate={() => setOpen(false)} />
      </SheetContent>
    </Sheet>
  )
}

export default function AppLayout() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="min-h-screen flex bg-sidebar md:bg-muted/30 overflow-x-hidden">
      {/* Desktop sidebar：fixed 钉死在视口左侧，页面滚动完全不影响 */}
      <aside className="hidden md:flex md:fixed md:top-0 md:left-0 md:h-screen md:w-60 bg-sidebar text-sidebar-foreground flex-col z-40 overflow-hidden">
        <SidebarContent />
      </aside>

      {/* 右侧内容区：桌面端整体向右偏移 240px，为固定侧栏让出空间 */}
      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden bg-background md:bg-transparent md:ml-60">
        {/* Mobile: 完整菜单抽屉（由底部"更多"Tab 打开） */}
        <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
          <SheetContent
            side="left"
            className="p-0 w-72 bg-sidebar text-sidebar-foreground border-sidebar-border md:hidden"
          >
            <SheetTitle className="sr-only">导航菜单</SheetTitle>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </SheetContent>
        </Sheet>

        <main className="flex-1 overflow-x-hidden pt-[env(safe-area-inset-top)] pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pt-0 md:pb-0">
          <Outlet />
        </main>

        {/* Mobile bottom tab bar */}
        <MobileBottomTabs />
      </div>
    </div>
  )
}
