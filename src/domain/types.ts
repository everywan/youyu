export type BudgetLevel = 'basic' | 'comfortable' | 'ideal'
export type AssetCategory = 'income_generating' | 'non_income' | 'durable'
export type FixedExpenseMode = 'total' | 'items'
export type FixedExpenseCategory =
  | 'dining'
  | 'rent_mortgage'
  | 'commute'
  | 'utilities'
  | 'communications'
  | 'healthcare'
  | 'insurance'
  | 'family_support'
  | 'leisure_shopping'
  | 'pocket_money'
  | 'custom'

export type FixedExpenseItem = {
  id: string
  category: FixedExpenseCategory
  name?: string
  amount: number
}

export type FreedomTarget = {
  id: string
  name: string
  level: BudgetLevel | 'custom'
  linkedBudgetLevel?: BudgetLevel
  targetAssetAmount?: number
  targetMonthlyPassiveIncome?: number
  requiresHouse?: boolean
  requiresCar?: boolean
  regionLabel?: string
  priority: 'budget_coverage_first' | 'asset_or_passive_income'
}

export type Asset = {
  id: string
  name: string
  type: 'cash' | 'deposit' | 'fund' | 'stock' | 'bond' | 'gold' | 'real_estate' | 'other'
  assetCategory?: AssetCategory
  amount: number
  isDisposable: boolean
  isLocked: boolean
  reservedAmount?: number
  reservePurpose?: string
  annualYieldRate?: number
  /** @deprecated 年资产收益由 amount * annualYieldRate 自动计算。 */
  annualCashflow?: number
  updatedAt: string
}

export type Liability = {
  id: string
  name: string
  type: 'mortgage' | 'car_loan' | 'consumer_loan' | 'credit_card' | 'personal_debt' | 'other'
  balance: number
  monthlyPayment?: number
  annualInterestRate?: number
  dueDate?: string
  updatedAt: string
}

export type Budget = {
  id: string
  name: string
  level: BudgetLevel
  monthlyFixed: number
  fixedExpenseMode: FixedExpenseMode
  fixedExpenseItems: FixedExpenseItem[]
  monthlyDaily: number
  monthlyFamily: number
  monthlyDurableCost: number
  annualLargeExpense: number
  annualReserve: number
}

export type MonthlyCashflow = {
  id: string
  month: string
  activeIncome: number
  salaryInput?: SalaryIncomeInput
  passiveIncome: number
  fixedExpense: number
  dailyExpense: number
  familyExpense: number
  annualExpenseAllocated: number
  durableCostAllocated: number
  note?: string
}

export type OneTimeCashflow = {
  id: string
  month: string
  assetName: string
  assetType: Asset['type']
  amount: number
  note?: string
}

export type RecurringCashflow = {
  id: string
  name: string
  startMonth: string
  endMonth?: string
  activeIncome: number
  salaryInput?: SalaryIncomeInput
  lastSalaryAssetMonth?: string
  passiveIncome: number
  fixedExpense: number
  dailyExpense: number
  familyExpense: number
  annualExpenseAllocated: number
  durableCostAllocated: number
  note?: string
}

export type ProvidentFundCity =
  | '上海'
  | '广州'
  | '北京'
  | '深圳'
  | '苏州'
  | '南京'
  | '杭州'
  | '天津'
  | '武汉'
  | '成都'
  | '重庆'
  | '西安'
  | '长沙'

export type SalaryIncomeInput = {
  monthlySalary: number
  providentFundRate: number
  providentFundBaseCap: number
  providentFundCity: ProvidentFundCity
}

export type SalaryIncomeEstimate = {
  monthlyGrossIncome: number
  monthlyIndividualProvidentFund: number
  monthlyProvidentFundIncome: number
  monthlyTaxableIncome: number
  monthlyIncomeTax: number
  monthlyTakeHomeIncome: number
}

export type Scenario = {
  id: string
  name: string
  monthlyActiveIncome: number
  monthlyExpense: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  budgetLevel: BudgetLevel
}

export type AppSettings = {
  currency: 'CNY'
  inflationRate: number
  emergencyFundMonths: number
}

export type AppDataPackage = {
  schemaVersion: 1
  targets: FreedomTarget[]
  assets: Asset[]
  liabilities: Liability[]
  budgets: Budget[]
  oneTimeCashflows: OneTimeCashflow[]
  recurringCashflows: RecurringCashflow[]
  scenarios: Scenario[]
  settings: AppSettings
  updatedAt: string
}

export type BudgetSummary = {
  level: BudgetLevel
  annualBudgetExpense: number
  assetIncomeCoverageRate: number
  annualFundingGap: number
}

export type SupportYearsResult =
  | { status: 'covered'; years?: never }
  | { status: 'calculable'; years: number }
  | { status: 'insufficient_assets'; years?: never }

export type FreedomTimeResult = {
  status: 'achieved' | 'projected' | 'not_reachable' | 'missing_data'
  months?: number
  targetDateLabel?: string
  reason?: string
  explanation?: FreedomTimeExplanation
}

export type FreedomTimeExplanation = {
  startingNetWorth: number
  startingAssetBase: number
  startingInvestableNetWorth: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  monthlyCashIncome: number
  monthlyBudgetExpense: number
  monthlyDebtPayment: number
  monthlyInvestableCashflow: number
  annualReturn: number
  monthlyReturn: number
  annualBudgetExpense: number
  requiredInvestableNetWorth?: number
  startingAnnualPassiveIncome: number
  checkpoints: FreedomTimeCheckpoint[]
  reachedStep?: FreedomTimeCheckpoint
}

export type FreedomTimeCheckpoint = {
  month: number
  monthLabel: string
  assetBase: number
  monthlyAssetIncome: number
  annualPassiveIncome: number
  annualBudgetExpense: number
  covered: boolean
}

export type CustomTargetProgress = {
  targetId: string
  name: string
  assetProgressRate?: number
  passiveIncomeProgressRate?: number
  isCompleted: boolean
}

export type InsightMessage = {
  type: 'success' | 'warning' | 'risk' | 'info'
  title: string
  description: string
}

export type DashboardSnapshot = {
  freedomLevel: 'none' | BudgetLevel
  incomeGeneratingAssetAmount: number
  incomeGeneratingNetWorth: number
  disposableAssets: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  annualAssetIncome: number
  latestMonthlySurplus: number
  budgetSummaries: BudgetSummary[]
  supportYearsByBudget: Record<BudgetLevel, SupportYearsResult>
  freedomTimeByBudget: Record<BudgetLevel, FreedomTimeResult>
  customTargetProgress: CustomTargetProgress[]
  insightMessages: InsightMessage[]
  updatedAt: string
}

export type NetWorthSummary = Pick<
  DashboardSnapshot,
  'incomeGeneratingAssetAmount' | 'incomeGeneratingNetWorth' | 'disposableAssets' | 'lockedAssetAmount' | 'reservedAssetAmount' | 'annualAssetIncome'
>

export type ScenarioComparison = {
  results: Record<BudgetLevel, FreedomTimeResult>
  deltas: Record<BudgetLevel, number | undefined>
  bottleneck: InsightMessage
}
