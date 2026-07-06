import type { FreedomTimeResult, SupportYearsResult } from '../domain/types'

export function formatCurrency(value: number): string {
  return `¥${formatCompactNumber(value)}`
}

export function formatNumber(value: number): string {
  return formatCompactNumber(value)
}

export function formatPercent(value: number): string {
  if (!Number.isFinite(value)) return '待录入'
  return `${Math.round(value * 100)}%`
}

export function formatYears(value: SupportYearsResult): string {
  if (value.status === 'covered') return '已覆盖'
  if (value.status === 'insufficient_assets') return '资产不足'
  if (value.years >= 99) return '99 年以上'
  return `${value.years.toFixed(value.years >= 10 ? 0 : 1)} 年`
}

export function formatFreedomTime(value: FreedomTimeResult): string {
  if (value.status === 'achieved') return '已达成'
  if (value.status === 'projected') return value.targetDateLabel ?? `${value.months} 个月`
  if (value.status === 'missing_data') return '待补齐'
  return '不可达'
}

export function monthNow(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export function createId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function formatCompactNumber(value: number): string {
  const abs = Math.abs(value)
  if (abs >= 10_000) return `${trimTrailingZero(value / 10_000, abs >= 1_000_000 ? 0 : 1)}w`
  if (abs >= 1_000) return `${trimTrailingZero(value / 1_000, 1)}k`
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(value)
}

function trimTrailingZero(value: number, digits: number): string {
  return value.toFixed(digits).replace(/\.0$/, '')
}
