import { cn } from '@/lib/utils'

/**
 * RequiredMark - 红色必填星号
 */
export function RequiredMark() {
  return <span className="text-destructive font-bold ml-0.5" aria-hidden>*</span>
}

interface FormFieldProps {
  label?: string
  required?: boolean
  error?: string | null
  hint?: string
  className?: string
  children: React.ReactNode
  htmlFor?: string
}

/**
 * FormField - 表单字段包装：Label + 红星 + 内容 + 错误提示
 * 
 * 用法：把 Input/Select/Textarea 包裹起来。传入 error 时会显示红色错误信息，
 * 并通过 CSS 变量 `--field-invalid` 控制内部控件的边框色。
 */
export function FormField({
  label,
  required,
  error,
  hint,
  className,
  children,
  htmlFor,
}: FormFieldProps) {
  const hasError = !!error
  return (
    <div
      className={cn('space-y-1.5', className)}
      data-invalid={hasError || undefined}
    >
      {label && (
        <label
          htmlFor={htmlFor}
          className={cn(
            'text-sm font-medium leading-none flex items-center',
            hasError && 'text-destructive'
          )}
        >
          {label}
          {required && <RequiredMark />}
        </label>
      )}
      <div className={cn('relative', hasError && 'form-field-invalid')}>
        {children}
      </div>
      {hasError ? (
        <p className="text-xs text-destructive flex items-center gap-1 leading-tight">
          <span aria-hidden>⚠</span>
          {error}
        </p>
      ) : hint ? (
        <p className="text-xs text-muted-foreground leading-tight">{hint}</p>
      ) : null}
    </div>
  )
}

/**
 * useFormErrors - 通用表单校验 Hook（无依赖）
 */
export type FieldRules<T> = {
  [K in keyof T]?: {
    required?: boolean | string
    validate?: (value: T[K], form: T) => string | null | undefined
  }
}

import { useCallback, useRef, useState } from 'react'

export function useFormErrors<T extends Record<string, any>>() {
  const [errors, setErrors] = useState<Partial<Record<keyof T, string>>>({})
  const refs = useRef<Partial<Record<keyof T, HTMLElement | null>>>({})

  const register = useCallback(
    (name: keyof T) => (el: HTMLElement | null) => {
      refs.current[name] = el
    },
    []
  )

  const validate = useCallback(
    (form: T, rules: FieldRules<T>): boolean => {
      const next: Partial<Record<keyof T, string>> = {}
      const keys = Object.keys(rules) as (keyof T)[]
      for (const key of keys) {
        const rule = rules[key]
        if (!rule) continue
        const value = form[key]
        if (rule.required) {
          const empty =
            value === undefined ||
            value === null ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)
          if (empty) {
            next[key] =
              typeof rule.required === 'string' ? rule.required : '此项为必填'
            continue
          }
        }
        if (rule.validate) {
          const msg = rule.validate(value, form)
          if (msg) {
            next[key] = msg
          }
        }
      }
      setErrors(next)
      // 聚焦到第一个错误字段
      const firstKey = keys.find((k) => next[k])
      if (firstKey) {
        const el = refs.current[firstKey]
        if (el) {
          setTimeout(() => {
            el.focus?.()
            el.scrollIntoView?.({ behavior: 'smooth', block: 'center' })
          }, 30)
        }
      }
      return Object.keys(next).length === 0
    },
    []
  )

  const clear = useCallback((name?: keyof T) => {
    if (name) {
      setErrors((prev) => {
        if (!prev[name]) return prev
        const next = { ...prev }
        delete next[name]
        return next
      })
    } else {
      setErrors({})
    }
  }, [])

  return { errors, register, validate, clear, setErrors }
}
