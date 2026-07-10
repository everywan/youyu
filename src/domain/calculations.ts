import type {
  AppDataPackage,
  AnnualBonusInput,
  Asset,
  Budget,
  BudgetLevel,
  BudgetSummary,
  DashboardSnapshot,
  FreedomTimeResult,
  InsightMessage,
  Liability,
  MonthlyCashflow,
  NetWorthSummary,
  OneTimeCashflow,
  ProvidentFundCity,
  RecurringCashflow,
  ProjectionParameters,
  ScenarioComparison,
  SalaryIncomeEstimate,
  SalaryIncomeInput,
  SupportYearsResult,
} from './types'

const budgetOrder: BudgetLevel[] = ['basic', 'comfortable', 'ideal']
const budgetNames: Record<BudgetLevel, string> = {
  basic: '基础自由',
  comfortable: '标准自由',
  ideal: '高级自由',
}
const providentFundBaseCaps: Record<ProvidentFundCity, number> = {
  上海: 36_900,
  广州: 38_100,
  北京: 35_300,
  深圳: 35_300,
  苏州: 34_700,
  南京: 34_500,
  杭州: 33_700,
  天津: 32_800,
  武汉: 31_700,
  成都: 30_400,
  重庆: 30_100,
  西安: 29_900,
  长沙: 28_900,
}
const annualTaxBrackets = [
  { upper: 36_000, rate: 0.03, quickDeduction: 0 },
  { upper: 144_000, rate: 0.1, quickDeduction: 2_520 },
  { upper: 300_000, rate: 0.2, quickDeduction: 16_920 },
  { upper: 420_000, rate: 0.25, quickDeduction: 31_920 },
  { upper: 660_000, rate: 0.3, quickDeduction: 52_920 },
  { upper: 960_000, rate: 0.35, quickDeduction: 85_920 },
  { upper: Number.POSITIVE_INFINITY, rate: 0.45, quickDeduction: 181_920 },
]
export const providentFundCities = Object.keys(providentFundBaseCaps) as ProvidentFundCity[]

export function calculateNetWorth(input: { assets: Asset[]; liabilities: Liability[] }): NetWorthSummary {
  const incomeAssets = input.assets.filter((asset) => (asset.assetCategory ?? 'income_generating') === 'income_generating')
  const assetAmount = sum(incomeAssets.map((asset) => asset.amount))
  const liabilityAmount = sum(input.liabilities.map((liability) => liability.balance))
  const incomeGeneratingNetWorth = assetAmount - liabilityAmount
  const lockedAssetAmount = sum(incomeAssets.filter((asset) => asset.isLocked).map((asset) => asset.amount))
  const reservedAssetAmount = sum(incomeAssets.map((asset) => asset.reservedAmount ?? 0))
  const annualAssetIncome = sum(incomeAssets.map((asset) => calculateAssetAnnualIncome(asset)))

  return {
    incomeGeneratingAssetAmount: assetAmount,
    incomeGeneratingNetWorth,
    disposableAssets: incomeGeneratingNetWorth - lockedAssetAmount - reservedAssetAmount,
    lockedAssetAmount,
    reservedAssetAmount,
    annualAssetIncome,
  }
}

export function calculateAnnualBudgetExpense(budget: Budget): number {
  return calculateMonthlyFixedExpense(budget) * 12 + budget.annualLargeExpense + budget.annualReserve
}

export function calculateMonthlyFixedExpense(budget: Budget): number {
  return sum((budget.fixedExpenseItems ?? []).map((item) => item.amount))
}

export function calculateAssetAnnualIncome(asset: Asset): number {
  if ((asset.assetCategory ?? 'income_generating') !== 'income_generating') return 0
  return asset.amount * nonNegative(asset.annualYieldRate ?? 0)
}

export function calculatePortfolioAnnualReturn(assets: Asset[]): number {
  const incomeAssets = assets.filter((asset) => (asset.assetCategory ?? 'income_generating') === 'income_generating' && asset.amount > 0)
  const totalAmount = sum(incomeAssets.map((asset) => asset.amount))
  if (totalAmount <= 0) return 0

  return sum(incomeAssets.map((asset) => asset.amount * nonNegative(asset.annualYieldRate ?? 0))) / totalAmount
}

export function calculateRealAnnualReturn(assets: Asset[], inflationRate: number): number {
  return calculatePortfolioAnnualReturn(assets) - nonNegative(inflationRate)
}

export function calculateBudgetSummary(budget: Budget, annualAssetIncome: number): BudgetSummary {
  const annualBudgetExpense = calculateAnnualBudgetExpense(budget)
  const assetIncomeCoverageRate = annualBudgetExpense > 0 ? annualAssetIncome / annualBudgetExpense : 0

  return {
    level: budget.level,
    annualBudgetExpense,
    assetIncomeCoverageRate,
    annualFundingGap: Math.max(annualBudgetExpense - annualAssetIncome, 0),
  }
}

export function calculateMonthlySurplus(cashflow: MonthlyCashflow): number {
  return (
    cashflow.activeIncome +
    cashflow.passiveIncome -
    cashflow.fixedExpense -
    cashflow.dailyExpense -
    cashflow.familyExpense -
    cashflow.annualExpenseAllocated -
    cashflow.durableCostAllocated
  )
}

export function calculateMonthlyDebtPayment(liabilities: Liability[]): number {
  return sum(liabilities.map((liability) => liability.monthlyPayment ?? 0))
}

export function getProvidentFundBaseCap(city: ProvidentFundCity): number {
  return providentFundBaseCaps[city]
}

export function calculateSalaryIncomeEstimate(input: SalaryIncomeInput): SalaryIncomeEstimate {
  const monthlySalary = nonNegative(input.monthlySalary)
  const providentFundRate = clamp(nonNegative(input.providentFundRate), 0, 1)
  const providentFundBaseCap = nonNegative(input.providentFundBaseCap)
  const providentFundBase = Math.min(monthlySalary, providentFundBaseCap)
  const monthlyIndividualProvidentFund = providentFundBase * providentFundRate
  const monthlyProvidentFundIncome = providentFundBase * providentFundRate * 2
  const monthlyTaxableIncome = Math.max(monthlySalary - monthlyIndividualProvidentFund - 5_000, 0)
  const monthlyIncomeTax = calculateAnnualComprehensiveIncomeTax(monthlyTaxableIncome * 12) / 12

  return {
    monthlyGrossIncome: monthlySalary,
    monthlyIndividualProvidentFund,
    monthlyProvidentFundIncome,
    monthlyTaxableIncome,
    monthlyIncomeTax,
    monthlyTakeHomeIncome: monthlySalary - monthlyIndividualProvidentFund - monthlyIncomeTax,
  }
}

export function calculateSupportYears(input: {
  disposableAssets: number
  annualBudgetExpense: number
  annualAssetIncome: number
}): SupportYearsResult {
  const annualFundingGap = Math.max(input.annualBudgetExpense - input.annualAssetIncome, 0)

  if (annualFundingGap === 0) {
    return { status: 'covered' }
  }

  if (input.disposableAssets <= 0) {
    return { status: 'insufficient_assets' }
  }

  return {
    status: 'calculable',
    years: Math.min(input.disposableAssets / annualFundingGap, 99),
  }
}

export function calculateFreedomLevel(budgets: Budget[], annualAssetIncome: number): DashboardSnapshot['freedomLevel'] {
  const summaries = budgetOrder
    .map((level) => budgets.find((budget) => budget.level === level))
    .filter((budget): budget is Budget => Boolean(budget))
    .map((budget) => calculateBudgetSummary(budget, annualAssetIncome))

  for (const level of [...budgetOrder].reverse()) {
    const summary = summaries.find((item) => item.level === level)
    if (summary && summary.annualBudgetExpense > 0 && annualAssetIncome >= summary.annualBudgetExpense) {
      return level
    }
  }

  return 'none'
}

export function projectFreedomTime(input: {
  incomeGeneratingAssetAmount?: number
  incomeGeneratingNetWorth: number
  lockedAssetAmount: number
  reservedAssetAmount: number
  currentAnnualAssetIncome: number
  monthlyCashIncome: number
  monthlyDebtPayment: number
  annualBudgetExpense: number
  annualReturn: number
  startDate?: Date
}): FreedomTimeResult {
  if (input.annualBudgetExpense <= 0) {
    return { status: 'missing_data', reason: '先录入预算，才能判断自由等级' }
  }

  const startDate = input.startDate ?? new Date()
  const annualReturnForIncome = Math.max(input.annualReturn, 0)
  const monthlyReturn = input.annualReturn > -1 ? Math.pow(1 + input.annualReturn, 1 / 12) - 1 : -1
  const startingAssetBase = Math.max(input.incomeGeneratingAssetAmount ?? input.incomeGeneratingNetWorth, 0)
  const startingInvestableNetWorth = Math.max(input.incomeGeneratingNetWorth - input.lockedAssetAmount - input.reservedAssetAmount, 0)
  const requiredInvestableNetWorth = annualReturnForIncome > 0 ? input.annualBudgetExpense / annualReturnForIncome : undefined
  const startingAnnualPassiveIncome = startingAssetBase * annualReturnForIncome
  const monthlyBudgetExpense = input.annualBudgetExpense / 12
  const startingMonthlyAssetIncome = startingAssetBase * monthlyReturn
  const startingMonthlyInvestableCashflow = input.monthlyCashIncome + Math.max(startingMonthlyAssetIncome, 0) - monthlyBudgetExpense - input.monthlyDebtPayment
  const checkpoints: NonNullable<FreedomTimeResult['explanation']>['checkpoints'] = []
  const startCheckpoint = {
    month: 0,
    monthLabel: formatTargetMonth(startDate),
    assetBase: startingAssetBase,
    monthlyAssetIncome: Math.max(startingMonthlyAssetIncome, 0),
    annualPassiveIncome: startingAnnualPassiveIncome,
    annualBudgetExpense: input.annualBudgetExpense,
    covered: input.currentAnnualAssetIncome >= input.annualBudgetExpense,
  }
  checkpoints.push(startCheckpoint)

  const buildExplanation = (reachedStep?: NonNullable<FreedomTimeResult['explanation']>['reachedStep']) => ({
    startingNetWorth: input.incomeGeneratingNetWorth,
    startingAssetBase,
    startingInvestableNetWorth,
    lockedAssetAmount: input.lockedAssetAmount,
    reservedAssetAmount: input.reservedAssetAmount,
    monthlyCashIncome: input.monthlyCashIncome,
    monthlyBudgetExpense,
    monthlyDebtPayment: input.monthlyDebtPayment,
    monthlyInvestableCashflow: startingMonthlyInvestableCashflow,
    annualReturn: input.annualReturn,
    monthlyReturn,
    annualBudgetExpense: input.annualBudgetExpense,
    requiredInvestableNetWorth,
    startingAnnualPassiveIncome,
    checkpoints,
    reachedStep,
  })

  if (input.currentAnnualAssetIncome >= input.annualBudgetExpense) {
    return {
      status: 'achieved',
      months: 0,
      targetDateLabel: '当前收益已覆盖',
      explanation: buildExplanation(startCheckpoint),
    }
  }

  if (startingMonthlyInvestableCashflow <= 0) {
    return {
      status: 'not_reachable',
      reason: '扣除每月预算后现金流无法自然达成，请先改善收入、支出或预算',
      explanation: buildExplanation(),
    }
  }

  let projectedAssetBase = startingAssetBase

  for (let month = 1; month <= 80 * 12; month += 1) {
    const monthlyAssetIncome = Math.max(projectedAssetBase * monthlyReturn, 0)
    const monthlyInvestableCashflow = input.monthlyCashIncome + monthlyAssetIncome - monthlyBudgetExpense - input.monthlyDebtPayment
    projectedAssetBase += monthlyInvestableCashflow
    const projectedAnnualPassiveIncome = Math.max(projectedAssetBase, 0) * annualReturnForIncome
    const monthLabel = formatTargetMonth(addMonths(startDate, month))
    const checkpoint = {
      month,
      monthLabel,
      assetBase: projectedAssetBase,
      monthlyAssetIncome,
      annualPassiveIncome: projectedAnnualPassiveIncome,
      annualBudgetExpense: input.annualBudgetExpense,
      covered: projectedAnnualPassiveIncome >= input.annualBudgetExpense,
    }
    if (month % 12 === 0) {
      checkpoints.push(checkpoint)
    }

    if (checkpoint.covered) {
      if (checkpoints.at(-1)?.month !== checkpoint.month) {
        checkpoints.push(checkpoint)
      }
      return {
        status: 'projected',
        months: month,
        targetDateLabel: monthLabel,
        explanation: buildExplanation(checkpoint),
      }
    }
  }

  return {
    status: 'not_reachable',
    reason: '80 年内仍未达标，请调整预算、结余或收益率',
    explanation: buildExplanation(),
  }
}

export function calculateDashboard(data: AppDataPackage, options: { currentMonth?: string } = {}): DashboardSnapshot {
  const netWorth = calculateNetWorth({ assets: data.assets, liabilities: data.liabilities })
  const budgetSummaries = budgetOrder
    .map((level) => data.budgets.find((budget) => budget.level === level))
    .filter((budget): budget is Budget => Boolean(budget))
    .map((budget) => calculateBudgetSummary(budget, netWorth.annualAssetIncome))
  const latestCashflow = buildMonthlyCashflowFromRecurring(data.recurringCashflows, options.currentMonth ?? currentMonth())
  const latestMonthlySurplus = latestCashflow ? calculateMonthlySurplus(latestCashflow) : 0
  const latestMonthlyCashIncome = latestCashflow ? latestCashflow.activeIncome + latestCashflow.passiveIncome : 0
  const monthlyDebtPayment = calculateMonthlyDebtPayment(data.liabilities)
  const freedomLevel = calculateFreedomLevel(data.budgets, netWorth.annualAssetIncome)
  const supportYearsByBudget = emptySupportYears()
  const freedomTimeByBudget = emptyFreedomTime()

  for (const level of budgetOrder) {
    const summary = budgetSummaries.find((item) => item.level === level)
    supportYearsByBudget[level] = summary
      ? calculateSupportYears({
          disposableAssets: netWorth.disposableAssets,
          annualBudgetExpense: summary.annualBudgetExpense,
          annualAssetIncome: netWorth.annualAssetIncome,
        })
      : { status: 'insufficient_assets' }
    freedomTimeByBudget[level] =
      summary && latestCashflow
        ? projectFreedomTime({
            incomeGeneratingAssetAmount: netWorth.incomeGeneratingAssetAmount,
            incomeGeneratingNetWorth: netWorth.incomeGeneratingNetWorth,
            lockedAssetAmount: netWorth.lockedAssetAmount,
            reservedAssetAmount: netWorth.reservedAssetAmount,
            currentAnnualAssetIncome: netWorth.annualAssetIncome,
            monthlyCashIncome: latestMonthlyCashIncome,
            monthlyDebtPayment,
            annualBudgetExpense: summary.annualBudgetExpense,
            annualReturn: calculateRealAnnualReturn(data.assets, data.settings.inflationRate),
          })
        : { status: 'missing_data', reason: latestCashflow ? '先录入预算，才能判断自由等级' : '先录入最近一个月现金流，才能推演达成时间' }
  }

  return {
    ...netWorth,
    freedomLevel,
    latestMonthlySurplus,
    budgetSummaries,
    supportYearsByBudget,
    freedomTimeByBudget,
    insightMessages: buildInsightMessages(data, netWorth, budgetSummaries, latestCashflow),
    updatedAt: data.updatedAt,
  }
}

export function buildMonthlyCashflowFromRecurring(rules: RecurringCashflow[], month: string): MonthlyCashflow | undefined {
  const activeRules = rules.filter((rule) => isRecurringCashflowActive(rule, month))
  if (activeRules.length === 0) return undefined

  return {
    id: `generated-${month}`,
    month,
    activeIncome: sum(activeRules.map((rule) => resolveRecurringActiveIncome(rule, month))),
    passiveIncome: sum(activeRules.map((rule) => rule.passiveIncome)),
    fixedExpense: sum(activeRules.map((rule) => rule.fixedExpense)),
    dailyExpense: sum(activeRules.map((rule) => rule.dailyExpense)),
    familyExpense: sum(activeRules.map((rule) => rule.familyExpense)),
    annualExpenseAllocated: sum(activeRules.map((rule) => rule.annualExpenseAllocated)),
    durableCostAllocated: sum(activeRules.map((rule) => rule.durableCostAllocated)),
    note: activeRules.map((rule) => rule.name).join(' + '),
  }
}

export function applyOneTimeCashflowToAssets(assets: Asset[], cashflow: OneTimeCashflow, updatedAt = new Date().toISOString()): Asset[] {
  return upsertAssetAmount(assets, {
    name: cashflow.assetName,
    type: cashflow.assetType,
    amount: cashflow.amount,
    isLocked: false,
    updatedAt,
  })
}

function upsertAssetAmount(
  assets: Asset[],
  input: {
    name: string
    type: Asset['type']
    amount: number
    isLocked: boolean
    updatedAt: string
  },
): Asset[] {
  const existing = assets.find((asset) => asset.name === input.name && asset.type === input.type)
  if (!existing) {
    return [
      ...assets,
      {
        id: `asset-${createSlug(input.name)}-${Date.now()}`,
        name: input.name,
        type: input.type,
        assetCategory: 'income_generating',
        amount: input.amount,
        isDisposable: !input.isLocked,
        isLocked: input.isLocked,
        updatedAt: input.updatedAt,
      },
    ]
  }

  return assets.map((asset) =>
    asset.id === existing.id
      ? {
          ...asset,
          amount: asset.amount + input.amount,
          updatedAt: input.updatedAt,
        }
      : asset,
  )
}

function upsertCoreAssetAmount(
  assets: Asset[],
  input: {
    id: string
    name: string
    type: Asset['type']
    amount: number
    isLocked: boolean
    isDisposable: boolean
    updatedAt: string
  },
): Asset[] {
  const existing = assets.find((asset) => asset.name === input.name && asset.type === input.type)
  if (!existing) {
    return [
      ...assets,
      {
        id: input.id,
        name: input.name,
        type: input.type,
        assetCategory: 'income_generating',
        amount: input.amount,
        isDisposable: input.isDisposable,
        isLocked: input.isLocked,
        annualYieldRate: 0,
        updatedAt: input.updatedAt,
      },
    ]
  }

  return assets.map((asset) =>
    asset.id === existing.id
      ? {
          ...asset,
          amount: asset.amount + input.amount,
          updatedAt: input.updatedAt,
        }
      : asset,
  )
}

export function applySalaryIncomeToAssets(assets: Asset[], salaryInput: SalaryIncomeInput, updatedAt = new Date().toISOString()): Asset[] {
  const estimate = calculateSalaryIncomeEstimate(salaryInput)
  return upsertCoreAssetAmount(
    upsertCoreAssetAmount(assets, {
      id: 'asset-cash-balance',
      name: '现金余额',
      type: 'cash',
      amount: estimate.monthlyTakeHomeIncome,
      isLocked: false,
      isDisposable: true,
      updatedAt,
    }),
    {
      id: 'asset-provident-fund-balance',
      name: '公积金余额',
      type: 'deposit',
      amount: estimate.monthlyProvidentFundIncome,
      isLocked: true,
      isDisposable: false,
      updatedAt,
    },
  )
}

export function calculateAnnualBonusTakeHome(input?: AnnualBonusInput): number {
  if (!input?.enabled) return 0
  return input.amountMode === 'net' ? nonNegative(input.netAmount) : nonNegative(input.grossAmount)
}

export function applyRecurringSalaryIncomeToAssets(
  assets: Asset[],
  cashflow: RecurringCashflow,
  month: string,
  updatedAt = new Date().toISOString(),
): { assets: Asset[]; cashflow: RecurringCashflow } {
  const shouldApplySalary = Boolean(cashflow.salaryInput) && cashflow.lastSalaryAssetMonth !== month

  if (!shouldApplySalary) {
    return { assets, cashflow }
  }

  let nextAssets = assets
  if (shouldApplySalary && cashflow.salaryInput) {
    nextAssets = applySalaryIncomeToAssets(nextAssets, cashflow.salaryInput, updatedAt)
  }
  return {
    assets: nextAssets,
    cashflow: {
      ...cashflow,
      lastSalaryAssetMonth: shouldApplySalary ? month : cashflow.lastSalaryAssetMonth,
      lastBonusAssetYear: cashflow.lastBonusAssetYear,
    },
  }
}

export function buildScenarioComparison(input: {
  data: AppDataPackage
  current: DashboardSnapshot
  scenario: ProjectionParameters
}): ScenarioComparison {
  const netWorth = calculateNetWorth({ assets: input.data.assets, liabilities: input.data.liabilities })
  const results = emptyFreedomTime()
  const deltas: Record<BudgetLevel, number | undefined> = {
    basic: undefined,
    comfortable: undefined,
    ideal: undefined,
  }

  for (const level of budgetOrder) {
    const budget = input.data.budgets.find((item) => item.level === level)
    if (!budget) {
      results[level] = { status: 'missing_data', reason: '先录入预算，才能推演达成时间' }
      continue
    }

    results[level] = projectFreedomTime({
      incomeGeneratingAssetAmount: netWorth.incomeGeneratingAssetAmount,
      incomeGeneratingNetWorth: netWorth.incomeGeneratingNetWorth,
      lockedAssetAmount: input.scenario.lockedAssetAmount,
      reservedAssetAmount: input.scenario.reservedAssetAmount,
      currentAnnualAssetIncome: netWorth.annualAssetIncome,
      monthlyCashIncome: input.scenario.monthlyActiveIncome,
      monthlyDebtPayment: calculateMonthlyDebtPayment(input.data.liabilities),
      annualBudgetExpense: calculateAnnualBudgetExpense(budget),
      annualReturn: calculateRealAnnualReturn(input.data.assets, input.data.settings.inflationRate),
    })

    deltas[level] = compareMonths(results[level], input.current.freedomTimeByBudget[level])
  }

  return {
    results,
    deltas,
    bottleneck: buildScenarioBottleneck({
      scenario: input.scenario,
      netWorth: netWorth.incomeGeneratingNetWorth,
      basicAnnualBudget: calculateAnnualBudgetExpense(input.data.budgets.find((budget) => budget.level === 'basic') ?? zeroBudget('basic')),
      annualAssetIncome: netWorth.annualAssetIncome,
      annualReturn: calculateRealAnnualReturn(input.data.assets, input.data.settings.inflationRate),
      monthlyDebtPayment: calculateMonthlyDebtPayment(input.data.liabilities),
    }),
  }
}

function buildInsightMessages(
  data: AppDataPackage,
  netWorth: NetWorthSummary,
  summaries: BudgetSummary[],
  latestCashflow?: MonthlyCashflow,
): InsightMessage[] {
  const messages: InsightMessage[] = []
  const basicSummary = summaries.find((summary) => summary.level === 'basic')
  const latestMonthlySurplus = latestCashflow ? calculateMonthlySurplus(latestCashflow) : 0

  if (!basicSummary || basicSummary.annualBudgetExpense <= 0) {
    messages.push({ type: 'warning', title: '补齐基础预算', description: '先录入预算，才能判断自由等级' })
  }

  if (!latestCashflow) {
    messages.push({ type: 'warning', title: '补录现金流', description: '先录入最近一个月现金流，才能推演达成时间' })
  } else if (latestMonthlySurplus <= 0) {
    messages.push({ type: 'risk', title: '现金流结余不足', description: '当前月结余不为正，自然达成时间不可计算' })
  }

  if (basicSummary && basicSummary.annualFundingGap > basicSummary.annualBudgetExpense * 0.5) {
    messages.push({ type: 'warning', title: '资产收益不足', description: '基础预算仍有较大年资金缺口' })
  }

  const monthlyExpense = latestCashflow
    ? latestCashflow.fixedExpense +
      latestCashflow.dailyExpense +
      latestCashflow.familyExpense +
      latestCashflow.annualExpenseAllocated +
      latestCashflow.durableCostAllocated
    : 0
  if (monthlyExpense > 0 && netWorth.disposableAssets < monthlyExpense * data.settings.emergencyFundMonths) {
    messages.push({ type: 'risk', title: '应急金偏低', description: `可支配资产不足 ${data.settings.emergencyFundMonths} 个月支出` })
  }

  if (messages.length === 0) {
    messages.push({ type: 'success', title: '持续积累中', description: '预算、现金流和资产数据已形成可推演闭环' })
  }

  return messages.slice(0, 4)
}

function buildScenarioBottleneck(input: {
  scenario: ProjectionParameters
  netWorth: number
  basicAnnualBudget: number
  annualAssetIncome: number
  annualReturn: number
  monthlyDebtPayment: number
}): InsightMessage {
  const monthlySurplus = input.scenario.monthlyActiveIncome - input.basicAnnualBudget / 12 - input.monthlyDebtPayment
  const annualFundingGap = Math.max(input.basicAnnualBudget - input.annualAssetIncome, 0)

  if (monthlySurplus <= 0) {
    return { type: 'risk', title: '结余不足', description: '先让现金收入覆盖基础预算和负债月供，推演才有自然达成路径' }
  }
  if (input.basicAnnualBudget > 0 && annualFundingGap > input.basicAnnualBudget * 0.5) {
    return { type: 'warning', title: '资产收益不足', description: '基础自由仍依赖较长时间的资产积累' }
  }
  if (input.netWorth > 0 && input.scenario.lockedAssetAmount + input.scenario.reservedAssetAmount > input.netWorth * 0.4) {
    return { type: 'warning', title: '可支配资产不足', description: '预留和不可动用资产占比偏高' }
  }
  if (input.annualReturn < 0.02) {
    return { type: 'info', title: '实际收益率偏低', description: '资产组合收益率扣除 CPI 后低于 2%，自由时间会明显拉长' }
  }

  return { type: 'success', title: '持续积累中', description: '当前参数下主要依赖稳定结余和复利推进' }
}

function compareMonths(next: FreedomTimeResult, current: FreedomTimeResult): number | undefined {
  const nextMonths = normalizedMonths(next)
  const currentMonths = normalizedMonths(current)

  if (nextMonths === undefined || currentMonths === undefined) {
    return undefined
  }

  return nextMonths - currentMonths
}

function normalizedMonths(result: FreedomTimeResult): number | undefined {
  if (result.status === 'achieved') return 0
  if (result.status === 'projected') return result.months
  return undefined
}

function emptySupportYears(): Record<BudgetLevel, SupportYearsResult> {
  return {
    basic: { status: 'insufficient_assets' },
    comfortable: { status: 'insufficient_assets' },
    ideal: { status: 'insufficient_assets' },
  }
}

function emptyFreedomTime(): Record<BudgetLevel, FreedomTimeResult> {
  return {
    basic: { status: 'missing_data' },
    comfortable: { status: 'missing_data' },
    ideal: { status: 'missing_data' },
  }
}

function zeroBudget(level: BudgetLevel): Budget {
  return {
    id: level,
    name: budgetNames[level],
    level,
    monthlyFixed: 0,
    fixedExpenseMode: 'items',
    fixedExpenseItems: [],
    monthlyDaily: 0,
    monthlyFamily: 0,
    monthlyDurableCost: 0,
    annualLargeExpense: 0,
    annualReserve: 0,
  }
}

function addMonths(date: Date, months: number): Date {
  const next = new Date(date)
  next.setMonth(next.getMonth() + months)
  return next
}

function formatTargetMonth(date: Date): string {
  return `${date.getFullYear()}年${String(date.getMonth() + 1).padStart(2, '0')}月`
}

function calculateAnnualComprehensiveIncomeTax(taxableIncome: number): number {
  const bracket = annualTaxBrackets.find((item) => taxableIncome <= item.upper) ?? annualTaxBrackets[annualTaxBrackets.length - 1]
  return taxableIncome * bracket.rate - bracket.quickDeduction
}

function nonNegative(value: number): number {
  return Number.isFinite(value) && value > 0 ? value : 0
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

function isRecurringCashflowActive(rule: RecurringCashflow, month: string): boolean {
  return rule.startMonth <= month && (!rule.endMonth || rule.endMonth >= month)
}

function resolveRecurringActiveIncome(rule: RecurringCashflow, _month: string): number {
  if (!rule.salaryInput) return rule.activeIncome

  const estimate = calculateSalaryIncomeEstimate(rule.salaryInput)
  return Math.round(estimate.monthlyTakeHomeIncome + estimate.monthlyProvidentFundIncome)
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function createSlug(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, '-')
}
