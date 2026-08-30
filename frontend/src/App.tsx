import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { AuthProvider } from '@/hooks/use-auth'
import { ConfirmProvider } from '@/components/ConfirmDialog'
import ProtectedRoute from '@/components/ProtectedRoute'
import AppLayout from '@/components/layout/AppLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Inbound from './pages/Inbound'
import Outbound from './pages/Outbound'
import Inventory from './pages/Inventory'
import Fees from './pages/Fees'
import BillingRules from './pages/BillingRules'
import AdminItems from './pages/AdminItems'
import AdminLocations from './pages/AdminLocations'
import AdminUsers from './pages/AdminUsers'
import Alerts from './pages/Alerts'
import AuditLogs from './pages/AuditLogs'
import NotFound from './pages/NotFound'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 60 * 1000,
      gcTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
    },
    mutations: { retry: 1 },
  },
})

function ProtectedLayout() {
  return (
    <ProtectedRoute>
      <AppLayout />
    </ProtectedRoute>
  )
}

function AdminLayout() {
  return (
    <ProtectedRoute adminOnly>
      <AppLayout />
    </ProtectedRoute>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster position="top-right" richColors />
        <BrowserRouter>
          <AuthProvider>
            <ConfirmProvider>
              <Routes>
                <Route
                  path="/"
                  data-genie-key="Root"
                  data-genie-title="首页"
                  element={<Navigate to="/dashboard" replace />}
                />
                <Route
                  path="/login"
                  data-genie-key="Login"
                  data-genie-title="登录"
                  element={<Login />}
                />
                <Route
                  path="/dashboard"
                  data-genie-key="Dashboard"
                  data-genie-title="库存总览"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Dashboard />} />
                </Route>
                <Route
                  path="/inbound"
                  data-genie-key="Inbound"
                  data-genie-title="入库管理"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Inbound />} />
                </Route>
                <Route
                  path="/outbound"
                  data-genie-key="Outbound"
                  data-genie-title="出库管理"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Outbound />} />
                </Route>
                <Route
                  path="/inventory"
                  data-genie-key="Inventory"
                  data-genie-title="库存明细"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Inventory />} />
                </Route>
                <Route
                  path="/alerts"
                  data-genie-key="Alerts"
                  data-genie-title="库存预警"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Alerts />} />
                </Route>
                <Route
                  path="/billing/fees"
                  data-genie-key="Fees"
                  data-genie-title="费用明细"
                  element={<ProtectedLayout />}
                >
                  <Route index element={<Fees />} />
                </Route>
                <Route
                  path="/billing/rules"
                  data-genie-key="BillingRules"
                  data-genie-title="计费规则"
                  element={<AdminLayout />}
                >
                  <Route index element={<BillingRules />} />
                </Route>
                <Route
                  path="/admin/items"
                  data-genie-key="AdminItems"
                  data-genie-title="物品型号"
                  element={<AdminLayout />}
                >
                  <Route index element={<AdminItems />} />
                </Route>
                <Route
                  path="/admin/locations"
                  data-genie-key="AdminLocations"
                  data-genie-title="库位管理"
                  element={<AdminLayout />}
                >
                  <Route index element={<AdminLocations />} />
                </Route>
                <Route
                  path="/admin/users"
                  data-genie-key="AdminUsers"
                  data-genie-title="用户管理"
                  element={<AdminLayout />}
                >
                  <Route index element={<AdminUsers />} />
                </Route>
                <Route
                  path="/admin/audit-logs"
                  data-genie-key="AuditLogs"
                  data-genie-title="操作日志"
                  element={<AdminLayout />}
                >
                  <Route index element={<AuditLogs />} />
                </Route>
                <Route
                  path="*"
                  data-genie-key="NotFound"
                  data-genie-title="未找到"
                  element={<NotFound />}
                />
              </Routes>
            </ConfirmProvider>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  )
}

export default App
