import { calculateDashboard } from '../domain/calculations'
import {
  createSummaryFixedExpenseItem,
  defaultBudgetMonthlyFixed,
  fixedExpenseCategories,
  normalizeFixedExpenseCategory,
  reconcilePresetFixedExpenseItems,
  shouldUpgradePresetFixedExpenseItems,
} from '../domain/budgetPresets'
import type {
  AppDataPackage,
  AppSettings,
  Asset,
  AssetCategory,
  Budget,
  DashboardSnapshot,
  FixedExpenseItem,
  Liability,
  MonthlyCashflow,
  OneTimeCashflow,
  RecurringCashflow,
} from '../domain/types'
import type {
  AppDataRepository,
  AssetRepository,
  BudgetRepository,
  CashflowRepository,
  DashboardRepository,
  SettingsRepository,
} from './AppDataRepository'
import { createDefaultAppData } from './defaultData'

const supportedSchemaVersion = 1
const assetCategories: AssetCategory[] = ['income_generating', 'non_income', 'durable']

export class LocalAppDataRepository
  implements
    AppDataRepository,
    DashboardRepository,
    AssetRepository,
    BudgetRepository,
    CashflowRepository,
    SettingsRepository
{
  constructor(private readonly storageKey = 'youyu.app-data.v1') {}

  async loadAppData(): Promise<AppDataPackage> {
    const raw = localStorage.getItem(this.storageKey)
    if (!raw) {
      const initial = createDefaultAppData()
      await this.saveAppData(initial)
      return initial
    }

    return parseAndValidate(raw)
  }

  async saveAppData(data: AppDataPackage): Promise<void> {
    const next = parseAndValidate(JSON.stringify({ ...data, updatedAt: new Date().toISOString() }))
    localStorage.setItem(this.storageKey, JSON.stringify(next))
  }

  async exportAppData(): Promise<string> {
    const data = await this.loadAppData()
    return JSON.stringify(data, null, 2)
  }

  async importAppData(json: string): Promise<AppDataPackage> {
    const next = parseAndValidate(json)
    await this.saveAppData(next)
    return next
  }

  async getDashboardSnapshot(): Promise<DashboardSnapshot> {
    return calculateDashboard(await this.loadAppData())
  }

  async listAssets(): Promise<Asset[]> {
    return (await this.loadAppData()).assets
  }

  async saveAsset(asset: Asset): Promise<void> {
    const data = await this.loadAppData()
    data.assets = upsertById(data.assets, asset)
    await this.saveAppData(data)
  }

  async removeAsset(id: string): Promise<void> {
    const data = await this.loadAppData()
    data.assets = data.assets.filter((asset) => asset.id !== id)
    await this.saveAppData(data)
  }

  async listLiabilities(): Promise<Liability[]> {
    return (await this.loadAppData()).liabilities
  }

  async saveLiability(liability: Liability): Promise<void> {
    const data = await this.loadAppData()
    data.liabilities = upsertById(data.liabilities, liability)
    await this.saveAppData(data)
  }

  async removeLiability(id: string): Promise<void> {
    const data = await this.loadAppData()
    data.liabilities = data.liabilities.filter((liability) => liability.id !== id)
    await this.saveAppData(data)
  }

  async listBudgets(): Promise<Budget[]> {
    return (await this.loadAppData()).budgets
  }

  async saveBudget(budget: Budget): Promise<void> {
    const data = await this.loadAppData()
    data.budgets = upsertById(data.budgets, budget)
    await this.saveAppData(data)
  }

  async listOneTimeCashflows(): Promise<OneTimeCashflow[]> {
    return (await this.loadAppData()).oneTimeCashflows
  }

  async saveOneTimeCashflow(cashflow: OneTimeCashflow): Promise<void> {
    const data = await this.loadAppData()
    data.oneTimeCashflows = upsertById(data.oneTimeCashflows, cashflow)
    await this.saveAppData(data)
  }

  async removeOneTimeCashflow(id: string): Promise<void> {
    const data = await this.loadAppData()
    data.oneTimeCashflows = data.oneTimeCashflows.filter((cashflow) => cashflow.id !== id)
    await this.saveAppData(data)
  }

  async listRecurringCashflows(): Promise<RecurringCashflow[]> {
    return (await this.loadAppData()).recurringCashflows
  }

  async saveRecurringCashflow(cashflow: RecurringCashflow): Promise<void> {
    const data = await this.loadAppData()
    data.recurringCashflows = upsertById(data.recurringCashflows, cashflow)
    await this.saveAppData(data)
  }

  async removeRecurringCashflow(id: string): Promise<void> {
    const data = await this.loadAppData()
    data.recurringCashflows = data.recurringCashflows.filter((cashflow) => cashflow.id !== id)
    await this.saveAppData(data)
  }

  async getSettings(): Promise<AppSettings> {
    return (await this.loadAppData()).settings
  }

  async saveSettings(settings: AppSettings): Promise<void> {
    const data = await this.loadAppData()
    data.settings = settings
    await this.saveAppData(data)
  }
}

function parseAndValidate(json: string): AppDataPackage {
  let value: unknown
  try {
    value = JSON.parse(json)
  } catch {
    throw new Error('JSON 格式错误，无法恢复数据')
  }

  if (!isRecord(value)) {
    throw new Error('数据格式错误，无法恢复数据')
  }
  if (value.schemaVersion !== supportedSchemaVersion) {
    throw new Error('版本不支持，无法恢复数据')
  }

  const normalized = normalizeV1Shape(value)

  for (const field of ['assets', 'liabilities', 'budgets', 'oneTimeCashflows', 'recurringCashflows'] as const) {
    if (!Array.isArray(normalized[field])) {
      throw new Error(`字段缺失：${field}`)
    }
  }

  if (!isRecord(normalized.settings)) {
    throw new Error('字段缺失：settings')
  }

  const data = normalized as AppDataPackage
  validateAmounts(data)
  return data
}

function normalizeV1Shape(value: Record<string, unknown>): Record<string, unknown> {
  if (value.schemaVersion !== supportedSchemaVersion) return value

  const next = { ...value }
  delete next.scenarios
  if (Array.isArray(next.assets)) {
    next.assets = next.assets.map((asset) => normalizeAssetShape(asset))
  }
  if (Array.isArray(next.budgets)) {
    next.budgets = next.budgets.map((budget) => normalizeBudgetShape(budget))
  }
  if (!Array.isArray(next.oneTimeCashflows)) {
    next.oneTimeCashflows = []
  }
  if (!Array.isArray(next.recurringCashflows)) {
    next.recurringCashflows = Array.isArray(next.monthlyCashflows)
      ? next.monthlyCashflows.map((cashflow) => monthlyCashflowToRecurring(cashflow))
      : []
  }
  next.settings = normalizeSettingsShape(next.settings)

  return next
}

function normalizeSettingsShape(value: unknown): AppSettings {
  const settings = isRecord(value) ? value : {}
  return {
    currency: 'CNY',
    inflationRate: Number(settings.inflationRate ?? 0.01),
    emergencyFundMonths: Number(settings.emergencyFundMonths ?? 6),
  }
}

function normalizeAssetShape(value: unknown): unknown {
  if (!isRecord(value)) return value
  const assetCategory = assetCategories.includes(value.assetCategory as AssetCategory) ? value.assetCategory : 'income_generating'
  const { annualCashflow: _legacyAnnualCashflow, ...asset } = value

  return {
    ...asset,
    assetCategory,
  }
}

function normalizeBudgetShape(value: unknown): unknown {
  if (!isRecord(value)) return value

  const rawExistingItems = Array.isArray(value.fixedExpenseItems) ? value.fixedExpenseItems : undefined
  const existingItems = rawExistingItems ? rawExistingItems.map((item) => normalizeFixedExpenseItem(item)) : []
  const legacyItems = legacyBudgetItems(value)
  const fixedExpenseItems = rawExistingItems
    ? shouldUpgradePresetFixedExpenseItems(rawExistingItems.map((item) => (isRecord(item) ? item : {})))
      ? reconcilePresetFixedExpenseItems(existingItems)
      : existingItems
    : legacyItems
  const fixedExpenseItemsWithDefaults = addDefaultSummaryItemIfEmptyPresetBudget(value, fixedExpenseItems)
  const monthlyFixed = fixedExpenseItemsWithDefaults.reduce((total, item) => total + item.amount, 0)

  return {
    ...value,
    monthlyFixed,
    fixedExpenseMode: 'items',
    fixedExpenseItems: fixedExpenseItemsWithDefaults,
    monthlyDaily: 0,
    monthlyFamily: 0,
    monthlyDurableCost: 0,
  }
}

function addDefaultSummaryItemIfEmptyPresetBudget(value: Record<string, unknown>, items: FixedExpenseItem[]): FixedExpenseItem[] {
  if (!Array.isArray(value.fixedExpenseItems) || items.length === 0) return items
  if (items.some((item) => item.amount > 0 || item.name === '汇总项')) return items
  if (items.every((item) => item.category === 'custom')) return items

  const level = value.level
  if (level !== 'basic' && level !== 'comfortable' && level !== 'ideal') return items

  return [createSummaryFixedExpenseItem(defaultBudgetMonthlyFixed[level]), ...items]
}

function legacyBudgetItems(value: Record<string, unknown>): FixedExpenseItem[] {
  return [
    legacyBudgetItem('legacy-fixed', '固定支出', value.monthlyFixed),
    legacyBudgetItem('legacy-daily', '日常', value.monthlyDaily),
    legacyBudgetItem('legacy-family', '家庭', value.monthlyFamily),
    legacyBudgetItem('legacy-durable', '耐用消费', value.monthlyDurableCost),
  ].filter((item): item is FixedExpenseItem => Boolean(item))
}

function legacyBudgetItem(id: string, name: string, rawAmount: unknown): FixedExpenseItem | undefined {
  const amount = Number(rawAmount ?? 0)
  if (!Number.isFinite(amount) || amount <= 0) return undefined

  return {
    id,
    category: 'custom',
    name,
    amount,
  }
}

function normalizeFixedExpenseItem(value: unknown): FixedExpenseItem {
  const item = isRecord(value) ? value : {}
  const category = normalizeFixedExpenseCategory(item.category, item.name)

  return {
    id: typeof item.id === 'string' && item.id.trim() ? item.id : `fixed-${category}`,
    category,
    name: typeof item.name === 'string' ? item.name : undefined,
    amount: Number(item.amount ?? 0),
  }
}

function monthlyCashflowToRecurring(value: unknown): RecurringCashflow {
  const cashflow = value as MonthlyCashflow
  return {
    id: cashflow.id,
    name: `${cashflow.month} 月度现金流`,
    startMonth: cashflow.month,
    endMonth: cashflow.month,
    activeIncome: cashflow.activeIncome,
    salaryInput: cashflow.salaryInput,
    passiveIncome: cashflow.passiveIncome,
    fixedExpense: cashflow.fixedExpense,
    dailyExpense: cashflow.dailyExpense,
    familyExpense: cashflow.familyExpense,
    annualExpenseAllocated: cashflow.annualExpenseAllocated,
    durableCostAllocated: cashflow.durableCostAllocated,
    note: cashflow.note,
  }
}

function validateAmounts(data: AppDataPackage): void {
  for (const asset of data.assets) {
    if (!assetCategories.includes(asset.assetCategory ?? 'income_generating')) {
      throw new Error('资产大类不支持')
    }
    assertNonNegative(asset.amount, '资产金额')
    assertNonNegative(asset.reservedAmount ?? 0, '预留资产')
    if ((asset.reservedAmount ?? 0) > asset.amount) {
      throw new Error('预留资产不能大于资产金额')
    }
    assertNonNegative(asset.annualYieldRate ?? 0, '收益率')
  }

  for (const liability of data.liabilities) {
    assertNonNegative(liability.balance, '负债余额')
    assertNonNegative(liability.monthlyPayment ?? 0, '月还款')
    assertNonNegative(liability.annualInterestRate ?? 0, '负债利率')
  }

  for (const budget of data.budgets) {
    assertNonNegative(budget.monthlyFixed, '固定预算')
    for (const item of budget.fixedExpenseItems) {
      assertNonNegative(item.amount, '固定支出子项')
      if (!fixedExpenseCategories.includes(item.category)) {
        throw new Error('固定支出子项分类不支持')
      }
    }
    assertNonNegative(budget.monthlyDaily, '日常预算')
    assertNonNegative(budget.monthlyFamily, '家庭预算')
    assertNonNegative(budget.monthlyDurableCost, '耐用消费成本')
    assertNonNegative(budget.annualLargeExpense, '年度大额支出')
    assertNonNegative(budget.annualReserve, '年度预留支出')
  }

  for (const cashflow of data.oneTimeCashflows) {
    if (!/^\d{4}-\d{2}$/.test(cashflow.month)) {
      throw new Error('月份格式必须是 YYYY-MM')
    }
    if (!cashflow.assetName.trim()) {
      throw new Error('一次性现金流必须填写资产名称')
    }
    assertNonNegative(cashflow.amount, '一次性现金流金额')
  }

  for (const cashflow of data.recurringCashflows) {
    if (!/^\d{4}-\d{2}$/.test(cashflow.startMonth)) {
      throw new Error('开始月份格式必须是 YYYY-MM')
    }
    if (cashflow.endMonth && !/^\d{4}-\d{2}$/.test(cashflow.endMonth)) {
      throw new Error('结束月份格式必须是 YYYY-MM')
    }
    if (cashflow.lastSalaryAssetMonth && !/^\d{4}-\d{2}$/.test(cashflow.lastSalaryAssetMonth)) {
      throw new Error('工资入账月份格式必须是 YYYY-MM')
    }
    if (cashflow.lastBonusAssetYear !== undefined && (!Number.isInteger(cashflow.lastBonusAssetYear) || cashflow.lastBonusAssetYear < 0)) {
      throw new Error('年终奖入账年份必须是非负整数')
    }
    assertNonNegative(cashflow.activeIncome, '主动收入')
    if (cashflow.salaryInput) {
      assertNonNegative(cashflow.salaryInput.monthlySalary, '月工资')
      assertNonNegative(cashflow.salaryInput.providentFundRate, '公积金比例')
      assertNonNegative(cashflow.salaryInput.providentFundBaseCap, '公积金基数上限')
    }
    if (cashflow.annualBonusInput?.enabled) {
      if (!Number.isInteger(cashflow.annualBonusInput.payoutMonth) || cashflow.annualBonusInput.payoutMonth < 1 || cashflow.annualBonusInput.payoutMonth > 12) {
        throw new Error('年终奖发放月份必须是 1-12')
      }
      if (cashflow.annualBonusInput.amountMode !== 'gross' && cashflow.annualBonusInput.amountMode !== 'net') {
        throw new Error('年终奖金额口径不支持')
      }
      assertNonNegative(cashflow.annualBonusInput.grossAmount, '年终奖总额')
      assertNonNegative(cashflow.annualBonusInput.netAmount, '年终奖到手额')
    }
    assertNonNegative(cashflow.passiveIncome, '被动收入')
    assertNonNegative(cashflow.fixedExpense, '固定支出')
    assertNonNegative(cashflow.dailyExpense, '日常支出')
    assertNonNegative(cashflow.familyExpense, '家庭支出')
    assertNonNegative(cashflow.annualExpenseAllocated, '年度支出折算')
    assertNonNegative(cashflow.durableCostAllocated, '耐用消费摊销')
  }

  assertNonNegative(data.settings.inflationRate, 'CPI')
  assertNonNegative(data.settings.emergencyFundMonths, '应急金月数')
}

function assertNonNegative(value: number, label: string): void {
  if (typeof value !== 'number' || Number.isNaN(value) || value < 0) {
    throw new Error(`${label}必须是非负数字`)
  }
}

function upsertById<T extends { id: string }>(items: T[], next: T): T[] {
  const index = items.findIndex((item) => item.id === next.id)
  if (index === -1) return [...items, next]

  return items.map((item) => (item.id === next.id ? next : item))
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
