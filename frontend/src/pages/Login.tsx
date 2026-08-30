import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Loader2, Mail, Smartphone, KeyRound, ShieldCheck } from 'lucide-react'
import { useAuth } from '@/hooks/use-auth'
import apiClient, { getErrorMessage } from '@/lib/api-client'
import { FadeIn } from '@/components/MotionPrimitives'
import Logo from '@/components/Logo'

type LoginMode = 'password' | 'email' | 'sms'

export default function Login() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [mode, setMode] = useState<LoginMode>('password')

  // password
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')

  // email / sms
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [emailCode, setEmailCode] = useState('')
  const [smsCode, setSmsCode] = useState('')
  const [sendingCode, setSendingCode] = useState(false)
  const [countdown, setCountdown] = useState({ email: 0, sms: 0 })

  const [loading, setLoading] = useState(false)

  const startCountdown = (key: 'email' | 'sms') => {
    setCountdown((c) => ({ ...c, [key]: 60 }))
    const timer = setInterval(() => {
      setCountdown((c) => {
        const v = c[key] - 1
        if (v <= 0) clearInterval(timer)
        return { ...c, [key]: Math.max(v, 0) }
      })
    }, 1000)
  }

  const handleSubmit = async () => {
    if (loading) return
    setLoading(true)
    try {
      if (mode === 'password') {
        if (!username || !password) {
          toast.error('请填写账号和密码')
          return
        }
        const { data } = await apiClient.post('/auth/login', { username, password })
        if (data.success) {
          login(data.data.token, data.data.user)
          toast.success('登录成功')
          nav('/dashboard')
        } else toast.error(data.message)
      } else {
        const channel = mode
        const target = channel === 'email' ? email : phone
        const code = channel === 'email' ? emailCode : smsCode
        if (!target || !code) {
          toast.error('请填写完整信息')
          return
        }
        const { data } = await apiClient.post('/auth/verify-code', {
          target,
          channel,
          code,
        })
        if (data.success) {
          login(data.data.token, data.data.user)
          toast.success('登录成功')
          nav('/dashboard')
        } else toast.error(data.message)
      }
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  const sendCode = async (channel: 'email' | 'sms') => {
    const target = channel === 'email' ? email : phone
    if (!target) {
      toast.error(channel === 'email' ? '请输入邮箱' : '请输入手机号')
      return
    }
    setSendingCode(true)
    try {
      const { data } = await apiClient.post('/auth/send-code', { target, channel })
      if (data.success) {
        toast.success(`${data.message}（演示码: ${data.data.demo_code}）`)
        startCountdown(channel)
      } else toast.error(data.message)
    } catch (e) {
      toast.error(getErrorMessage(e))
    } finally {
      setSendingCode(false)
    }
  }

  // 各模式下第一行的字段配置
  const firstField =
    mode === 'password'
      ? {
          label: '账号',
          placeholder: '用户名 / 邮箱 / 手机号',
          value: username,
          onChange: setUsername,
          type: 'text' as const,
          autoComplete: 'username',
        }
      : mode === 'email'
        ? {
            label: '邮箱地址',
            placeholder: 'you@example.com',
            value: email,
            onChange: setEmail,
            type: 'email' as const,
            autoComplete: 'email',
          }
        : {
            label: '手机号',
            placeholder: '请输入 11 位手机号',
            value: phone,
            onChange: setPhone,
            type: 'tel' as const,
            autoComplete: 'tel',
          }

  // 各模式下第二行的字段配置
  const secondField =
    mode === 'password'
      ? {
          label: '密码',
          placeholder: '请输入密码',
          value: password,
          onChange: setPassword,
          type: 'password' as const,
          autoComplete: 'current-password',
          withCode: false as const,
        }
      : {
          label: '验证码',
          placeholder: '6 位验证码',
          value: mode === 'email' ? emailCode : smsCode,
          onChange: mode === 'email' ? setEmailCode : setSmsCode,
          type: 'text' as const,
          autoComplete: 'one-time-code',
          withCode: true as const,
        }

  const submitLabel = mode === 'password' ? '登录' : '验证并登录'
  const countdownValue = mode === 'email' ? countdown.email : countdown.sms

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/10 via-background to-info/10 flex items-center justify-center p-4">
      <FadeIn className="w-full max-w-md">
        <Card className="w-full shadow-xl p-6 sm:p-8">
          <div className="flex flex-col items-center text-center mb-6 sm:mb-8">
            <Logo size={64} variant="onLight" />
            <h1
              className="font-bold"
              style={{
                fontSize: 'var(--font-size-title)',
                marginTop: 'var(--spacing-md)',
              }}
            >
              智慧仓储管理系统
            </h1>
            <p
              className="text-muted-foreground text-sm"
              style={{ marginTop: 'var(--spacing-xs)' }}
            >
              安全登录以进入操作台
            </p>
          </div>

          <Tabs value={mode} onValueChange={(v) => setMode(v as LoginMode)}>
            <TabsList className="grid grid-cols-3 w-full">
              <TabsTrigger value="password">
                <KeyRound className="w-4 h-4 mr-1" />
                账号
              </TabsTrigger>
              <TabsTrigger value="email">
                <Mail className="w-4 h-4 mr-1" />
                邮箱
              </TabsTrigger>
              <TabsTrigger value="sms">
                <Smartphone className="w-4 h-4 mr-1" />
                短信
              </TabsTrigger>
            </TabsList>
          </Tabs>

          {/* 统一表单外壳：不管切到哪个 Tab，结构和高度完全一致 */}
          <div className="mt-6 flex flex-col" style={{ minHeight: 280 }}>
            <div className="space-y-4 flex-1">
              {/* 第一行 */}
              <div className="space-y-2">
                <Label>{firstField.label}</Label>
                <Input
                  type={firstField.type}
                  value={firstField.value}
                  onChange={(e) => firstField.onChange(e.target.value)}
                  placeholder={firstField.placeholder}
                  autoComplete={firstField.autoComplete}
                />
              </div>

              {/* 第二行：密码 or 验证码（带发送按钮） */}
              <div className="space-y-2">
                <Label>{secondField.label}</Label>
                {secondField.withCode ? (
                  <div className="flex gap-2">
                    <Input
                      type={secondField.type}
                      value={secondField.value}
                      onChange={(e) => secondField.onChange(e.target.value)}
                      placeholder={secondField.placeholder}
                      autoComplete={secondField.autoComplete}
                      onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                    />
                    <Button
                      variant="outline"
                      className="shrink-0 w-28"
                      onClick={() => sendCode(mode as 'email' | 'sms')}
                      disabled={sendingCode || countdownValue > 0}
                    >
                      {countdownValue > 0
                        ? `${countdownValue}s`
                        : sendingCode
                          ? '发送中'
                          : '获取验证码'}
                    </Button>
                  </div>
                ) : (
                  <Input
                    type={secondField.type}
                    value={secondField.value}
                    onChange={(e) => secondField.onChange(e.target.value)}
                    placeholder={secondField.placeholder}
                    autoComplete={secondField.autoComplete}
                    onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                  />
                )}
              </div>
            </div>

            {/* 底部区：按钮 + 提示，位置在所有 Tab 下完全相同 */}
            <div className="pt-4 space-y-3">
              <Button
                className="w-full"
                onClick={handleSubmit}
                disabled={loading}
              >
                {loading && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
                {submitLabel}
              </Button>
              <p className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                <ShieldCheck className="w-3 h-3" />
                通信全程加密，登录记录会写入审计日志
              </p>
            </div>
          </div>
        </Card>
      </FadeIn>
    </div>
  )
}
