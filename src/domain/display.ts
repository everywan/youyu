import type { Asset, AssetCategory, Liability, RecurringCashflow } from './types'

export type CashflowKind = 'salary' | 'passive_income' | 'expense' | 'one_time_income'

const assetCategoryLabels: Record<AssetCategory, string> = {
  income_generating: '收益性资产',
  non_income: '非收益资产',
  durable: '耐用消费品',
}

const assetTypeLabels: Record<Asset['type'], string> = {
  cash: '现金',
  deposit: '存款',
  fund: '基金',
  stock: '股票',
  bond: '债券',
  gold: '黄金',
  real_estate: '房产',
  other: '其他',
}

const liabilityTypeLabels: Record<Liability['type'], string> = {
  mortgage: '房贷',
  car_loan: '车贷',
  consumer_loan: '消费贷',
  credit_card: '信用卡',
  personal_debt: '亲友借款',
  other: '其他',
}

const cashflowKindLabels: Record<CashflowKind, string> = {
  salary: '工资',
  passive_income: '被动收入',
  expense: '支出',
  one_time_income: '一次性收入',
}

export function assetCategoryLabel(category: AssetCategory | undefined): string {
  return assetCategoryLabels[category ?? 'income_generating']
}

export function assetTypeLabel(type: Asset['type']): string {
  return assetTypeLabels[type]
}

export function liabilityTypeLabel(type: Liability['type']): string {
  return liabilityTypeLabels[type]
}

export function cashflowKindLabel(kind: CashflowKind): string {
  return cashflowKindLabels[kind]
}

export function recurringCashflowKind(cashflow: RecurringCashflow): CashflowKind {
  if (cashflow.salaryInput || cashflow.activeIncome > 0) return 'salary'
  if (cashflow.passiveIncome > 0) return 'passive_income'
  return 'expense'
}

export function assetCategoryOptions() {
  return (Object.keys(assetCategoryLabels) as AssetCategory[]).map((value) => ({ value, label: assetCategoryLabels[value] }))
}

export function assetTypeOptions() {
  return (Object.keys(assetTypeLabels) as Asset['type'][]).map((value) => ({ value, label: assetTypeLabels[value] }))
}

export function liabilityTypeOptions() {
  return (Object.keys(liabilityTypeLabels) as Liability['type'][]).map((value) => ({ value, label: liabilityTypeLabels[value] }))
}
