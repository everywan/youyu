import { describe, expect, it } from 'vitest'
import {
  buildScenarioComparison,
  applyOneTimeCashflowToAssets,
  applyRecurringSalaryIncomeToAssets,
  applySalaryIncomeToAssets,
  calculatePortfolioAnnualReturn,
  calculateRealAnnualReturn,
  calculateBudgetSummary,
  calculateDashboard,
  calculateFreedomLevel,
  buildMonthlyCashflowFromRecurring,
  calculateNetWorth,
  calculateSalaryIncomeEstimate,
  getProvidentFundBaseCap,
  calculateSupportYears,
  projectFreedomTime,
} from '../../src/domain/calculations'
import type { AppDataPackage, Asset, Budget, MonthlyCashflow } from '../../src/domain/types'

const budget = (level: Budget['level'], monthlyFixed: number): Budget => ({
  id: level,
  name: level,
  level,
  monthlyFixed,
  fixedExpenseMode: 'items',
  fixedExpenseItems: monthlyFixed > 0 ? [{ id: `${level}-budget-total`, category: 'custom', name: '预算总额', amount: monthlyFixed }] : [],
  monthlyDaily: 0,
  monthlyFamily: 0,
  monthlyDurableCost: 0,
  annualLargeExpense: 0,
  annualReserve: 0,
})

const cashflow = (surplus: number): MonthlyCashflow => ({
  id: 'cf-1',
  month: '2026-06',
  activeIncome: surplus > 0 ? surplus : 0,
  passiveIncome: 0,
  fixedExpense: surplus < 0 ? Math.abs(surplus) : 0,
  dailyExpense: 0,
  familyExpense: 0,
  annualExpenseAllocated: 0,
  durableCostAllocated: 0,
})

const appData = (overrides: Partial<AppDataPackage> = {}): AppDataPackage => ({
  schemaVersion: 1,
  assets: [],
  liabilities: [],
  budgets: [],
  oneTimeCashflows: [],
  recurringCashflows: [],
  settings: {
    currency: 'CNY',
    inflationRate: 0.01,
    emergencyFundMonths: 6,
  },
  updatedAt: '2026-06-28T00:00:00.000Z',
  ...overrides,
})

describe('financial domain calculations', () => {
  it('calculates income-generating net worth and disposable assets', () => {
    const result = calculateNetWorth({
      assets: [
        {
          id: 'cash',
          name: '现金',
          type: 'cash',
          amount: 100_000,
          isDisposable: true,
          isLocked: false,
          reservedAmount: 20_000,
          annualYieldRate: 0.04,
          annualCashflow: 99_000,
          updatedAt: '2026-06-01',
        },
        {
          id: 'house',
          name: '自住房',
          type: 'real_estate',
          amount: 800_000,
          isDisposable: false,
          isLocked: true,
          updatedAt: '2026-06-01',
        },
      ],
      liabilities: [
        {
          id: 'loan',
          name: '房贷',
          type: 'mortgage',
          balance: 300_000,
          updatedAt: '2026-06-01',
        },
      ],
    })

    expect(result.incomeGeneratingNetWorth).toBe(600_000)
    expect(result.lockedAssetAmount).toBe(800_000)
    expect(result.reservedAssetAmount).toBe(20_000)
    expect(result.disposableAssets).toBe(-220_000)
    expect(result.annualAssetIncome).toBe(4_000)
  })

  it('excludes non-income assets and durable goods from income-generating net worth', () => {
    const result = calculateNetWorth({
      assets: [
        {
          id: 'fund',
          name: '指数基金',
          type: 'fund',
          assetCategory: 'income_generating',
          amount: 100_000,
          isDisposable: true,
          isLocked: false,
          annualYieldRate: 0.04,
          annualCashflow: 99_000,
          updatedAt: '2026-06-01',
        },
        {
          id: 'home',
          name: '自住房',
          type: 'real_estate',
          assetCategory: 'non_income',
          amount: 800_000,
          isDisposable: false,
          isLocked: false,
          updatedAt: '2026-06-01',
        },
        {
          id: 'laptop',
          name: '电脑',
          type: 'other',
          assetCategory: 'durable',
          amount: 12_000,
          isDisposable: false,
          isLocked: false,
          updatedAt: '2026-06-01',
        },
      ],
      liabilities: [],
    })

    expect(result.incomeGeneratingNetWorth).toBe(100_000)
    expect(result.disposableAssets).toBe(100_000)
    expect(result.annualAssetIncome).toBe(4_000)
  })

  it('derives annual asset income from amount and yield rate instead of legacy cashflow', () => {
    const result = calculateNetWorth({
      assets: [
        {
          id: 'fund',
          name: '指数基金',
          type: 'fund',
          assetCategory: 'income_generating',
          amount: 200_000,
          isDisposable: true,
          isLocked: false,
          annualYieldRate: 0.05,
          annualCashflow: 999_999,
          updatedAt: '2026-06-01',
        },
      ],
      liabilities: [],
    })

    expect(result.annualAssetIncome).toBe(10_000)
  })

  it('projects from all income-generating assets while debt is handled as monthly outflow', () => {
    const current = calculateDashboard(
      appData({
        assets: [
          {
            id: 'fund',
            name: '指数基金',
            type: 'fund',
            assetCategory: 'income_generating',
            amount: 1_000_000,
            isDisposable: true,
            isLocked: false,
            annualYieldRate: 0.036,
            updatedAt: '2026-06-01',
          },
        ],
        liabilities: [
          {
            id: 'loan',
            name: '经营贷',
            type: 'other',
            balance: 400_000,
            monthlyPayment: 2_000,
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 8_000,
            passiveIncome: 0,
            fixedExpense: 0,
            dailyExpense: 0,
            familyExpense: 0,
            annualExpenseAllocated: 0,
            durableCostAllocated: 0,
          },
        ],
      }),
      { currentMonth: '2026-06' },
    )

    expect(current.incomeGeneratingAssetAmount).toBe(1_000_000)
    expect(current.incomeGeneratingNetWorth).toBe(600_000)
    expect(current.freedomTimeByBudget.basic.explanation?.startingAssetBase).toBe(1_000_000)
    expect(current.freedomTimeByBudget.basic.explanation?.startingInvestableNetWorth).toBe(600_000)
    expect(current.freedomTimeByBudget.basic.explanation?.checkpoints[0]).toMatchObject({
      assetBase: 1_000_000,
    })
    expect(current.freedomTimeByBudget.basic.explanation?.monthlyDebtPayment).toBe(2_000)
  })

  it('calculates annual budget expense, asset income coverage, and funding gap from budget items', () => {
    const result = calculateBudgetSummary(
      {
        ...budget('basic', 0),
        fixedExpenseItems: [
          { id: 'rent', category: 'rent_mortgage', amount: 3_000 },
          { id: 'dining', category: 'dining', amount: 2_000 },
        ],
      },
      24_000,
    )

    expect(result.annualBudgetExpense).toBe(60_000)
    expect(result.assetIncomeCoverageRate).toBeCloseTo(0.4)
    expect(result.annualFundingGap).toBe(36_000)
  })

  it('ignores legacy daily, family, and durable budget fields', () => {
    const result = calculateBudgetSummary(
      {
        ...budget('basic', 0),
        fixedExpenseItems: [
          { id: 'rent', category: 'rent_mortgage', amount: 3_000 },
          { id: 'dining', category: 'dining', amount: 2_000 },
          { id: 'custom', category: 'custom', name: '猫粮', amount: 300 },
        ],
        monthlyDaily: 500,
        monthlyFamily: 600,
        monthlyDurableCost: 700,
      },
      24_000,
    )

    expect(result.annualBudgetExpense).toBe(63_600)
    expect(result.annualFundingGap).toBe(39_600)
  })

  it('handles support-year boundaries', () => {
    expect(calculateSupportYears({ disposableAssets: 100_000, annualBudgetExpense: 60_000, annualAssetIncome: 60_000 })).toEqual({
      status: 'covered',
    })
    expect(calculateSupportYears({ disposableAssets: 0, annualBudgetExpense: 60_000, annualAssetIncome: 12_000 })).toEqual({
      status: 'insufficient_assets',
    })
    expect(calculateSupportYears({ disposableAssets: 240_000, annualBudgetExpense: 60_000, annualAssetIncome: 12_000 })).toEqual({
      status: 'calculable',
      years: 5,
    })
  })

  it('determines freedom level from the highest covered budget', () => {
    const budgets = [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)]

    expect(calculateFreedomLevel(budgets, 150_000)).toBe('ideal')
    expect(calculateFreedomLevel(budgets, 100_000)).toBe('comfortable')
    expect(calculateFreedomLevel(budgets, 70_000)).toBe('basic')
    expect(calculateFreedomLevel(budgets, 10_000)).toBe('none')
  })

  it('marks freedom time as not reachable when monthly surplus is non-positive', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 100_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 0,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 120_000,
      annualReturn: 0.04,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    })

    expect(result.status).toBe('not_reachable')
    expect(result.reason).toContain('现金流')
  })

  it('does not mark freedom as achieved from safe withdrawal when asset income is insufficient', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 3_000_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 5_000,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 60_000,
      annualReturn: 0,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    })

    expect(result.status).not.toBe('achieved')
    expect(result.status).toBe('not_reachable')
  })

  it('marks freedom time as not reachable after eighty years of projection', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 10_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 83_334,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 1_000_000,
      annualReturn: 0,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    })

    expect(result.status).toBe('not_reachable')
    expect(result.reason).toContain('80 年')
  })

  it('includes projection details that explain the target month', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 480_000,
      lockedAssetAmount: 80_000,
      reservedAssetAmount: 40_000,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 10_000,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 60_000,
      annualReturn: 0.03,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
    })

    expect(result.status).toBe('projected')
    expect(result.explanation).toMatchObject({
      startingNetWorth: 480_000,
      startingAssetBase: 480_000,
      startingInvestableNetWorth: 360_000,
      lockedAssetAmount: 80_000,
      reservedAssetAmount: 40_000,
      monthlyCashIncome: 10_000,
      monthlyBudgetExpense: 5_000,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 60_000,
      requiredInvestableNetWorth: 2_000_000,
    })
    expect(result.explanation?.monthlyInvestableCashflow).toBeCloseTo(6_183.81)
    expect(result.explanation?.reachedStep).toMatchObject({
      month: result.months,
      monthLabel: result.targetDateLabel,
      covered: true,
    })
    expect(result.explanation?.checkpoints.at(-1)).toEqual(result.explanation?.reachedStep)
  })

  it('keeps locked and reserved assets in the projected asset-income base', () => {
    const base = {
      incomeGeneratingNetWorth: 500_000,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 13_000,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 60_000,
      annualReturn: 0.03,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
    }

    const unrestricted = projectFreedomTime({
      ...base,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
    })
    const restricted = projectFreedomTime({
      ...base,
      lockedAssetAmount: 100_000,
      reservedAssetAmount: 200_000,
    })

    expect(unrestricted.status).toBe('projected')
    expect(restricted.status).toBe('projected')
    expect(restricted.months).toBe(unrestricted.months)
    expect(restricted.explanation?.startingAssetBase).toBe(unrestricted.explanation?.startingAssetBase)
    expect(restricted.explanation?.startingInvestableNetWorth).toBeLessThan(unrestricted.explanation?.startingInvestableNetWorth ?? 0)
  })

  it('spends the selected budget every month before investing surplus cashflow', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 100_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 10_000,
      monthlyDebtPayment: 0,
      annualBudgetExpense: 60_000,
      annualReturn: 0,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
    })

    expect(result.explanation?.monthlyBudgetExpense).toBe(5_000)
    expect(result.explanation?.monthlyInvestableCashflow).toBe(5_000)
    expect(result.explanation?.checkpoints[1]).toMatchObject({
      month: 12,
      assetBase: 160_000,
    })
  })

  it('subtracts monthly debt payment from investable cashflow', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 100_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      currentAnnualAssetIncome: 0,
      monthlyCashIncome: 10_000,
      monthlyDebtPayment: 2_000,
      annualBudgetExpense: 60_000,
      annualReturn: 0,
      startDate: new Date('2026-07-01T00:00:00.000Z'),
    })

    expect(result.explanation?.monthlyInvestableCashflow).toBe(3_000)
    expect(result.explanation?.checkpoints[1]).toMatchObject({
      month: 12,
      assetBase: 136_000,
    })
  })

  it('calculates weighted asset return and deducts global CPI', () => {
    const assets: Asset[] = [
      {
        id: 'cash',
        name: '现金余额',
        type: 'cash',
        assetCategory: 'income_generating' as const,
        amount: 100_000,
        isDisposable: true,
        isLocked: false,
        annualYieldRate: 0.01,
        updatedAt: '2026-06-01',
      },
      {
        id: 'fund',
        name: '指数基金',
        type: 'fund',
        assetCategory: 'income_generating' as const,
        amount: 300_000,
        isDisposable: true,
        isLocked: false,
        annualYieldRate: 0.06,
        updatedAt: '2026-06-01',
      },
      {
        id: 'home',
        name: '自住房',
        type: 'real_estate',
        assetCategory: 'non_income' as const,
        amount: 800_000,
        isDisposable: false,
        isLocked: false,
        annualYieldRate: 0.03,
        updatedAt: '2026-06-01',
      },
    ]

    expect(calculatePortfolioAnnualReturn(assets)).toBeCloseTo(0.0475)
    expect(calculateRealAnnualReturn(assets, 0.01)).toBeCloseTo(0.0375)
  })

  it('builds dashboard snapshot from raw app data', () => {
    const snapshot = calculateDashboard(
      appData({
        assets: [
          {
            id: 'fund',
            name: '指数基金',
            type: 'fund',
            amount: 500_000,
            isDisposable: true,
            isLocked: false,
            annualCashflow: 24_000,
            annualYieldRate: 0.048,
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 6_000,
            passiveIncome: 0,
            fixedExpense: 0,
            dailyExpense: 0,
            familyExpense: 0,
            annualExpenseAllocated: 0,
            durableCostAllocated: 0,
          },
        ],
      }),
      { currentMonth: '2026-06' },
    )

    expect(snapshot.freedomLevel).toBe('none')
    expect(snapshot.latestMonthlySurplus).toBe(6_000)
    expect(snapshot.budgetSummaries[0].assetIncomeCoverageRate).toBeCloseTo(0.4)
    expect(snapshot.insightMessages.length).toBeGreaterThan(0)
  })

  it('compares scenario freedom time against the current dashboard', () => {
    const current = calculateDashboard(
      appData({
        assets: [
          {
            id: 'fund',
            name: '指数基金',
            type: 'fund',
            amount: 500_000,
            isDisposable: true,
            isLocked: false,
            annualYieldRate: 0.04,
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 8_000,
            passiveIncome: 0,
            fixedExpense: 0,
            dailyExpense: 0,
            familyExpense: 0,
            annualExpenseAllocated: 0,
            durableCostAllocated: 0,
          },
        ],
      }),
      { currentMonth: '2026-06' },
    )

    const comparison = buildScenarioComparison({
      data: appData({
        assets: [
          {
            id: 'fund',
            name: '指数基金',
            type: 'fund',
            amount: 500_000,
            isDisposable: true,
            isLocked: false,
            annualYieldRate: 0.04,
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 8_000,
            passiveIncome: 0,
            fixedExpense: 0,
            dailyExpense: 0,
            familyExpense: 0,
            annualExpenseAllocated: 0,
            durableCostAllocated: 0,
          },
        ],
      }),
      current,
      scenario: {
        monthlyActiveIncome: 12_000,
        lockedAssetAmount: 0,
        reservedAssetAmount: 300_000,
        budgetLevel: 'basic',
      },
    })

    expect(comparison.results.basic.status).toMatch(/projected|achieved/)
    expect(comparison.deltas.basic).toBeLessThanOrEqual(0)
    expect(comparison.bottleneck.title.length).toBeGreaterThan(0)
  })

  it('estimates salary take-home and monthly provident fund income with city base cap', () => {
    const result = calculateSalaryIncomeEstimate({
      monthlySalary: 40_000,
      providentFundRate: 0.12,
      providentFundBaseCap: getProvidentFundBaseCap('上海'),
      providentFundCity: '上海',
    })

    expect(result.monthlyProvidentFundIncome).toBe(8_856)
    expect(result.monthlyIndividualProvidentFund).toBe(4_428)
    expect(result.monthlyTaxableIncome).toBe(30_572)
    expect(result.monthlyIncomeTax).toBeCloseTo(4_983)
    expect(result.monthlyTakeHomeIncome).toBeCloseTo(30_589)
  })

  it('treats non-taxable salary income as zero tax', () => {
    const result = calculateSalaryIncomeEstimate({
      monthlySalary: 4_000,
      providentFundRate: 0.12,
      providentFundBaseCap: getProvidentFundBaseCap('成都'),
      providentFundCity: '成都',
    })

    expect(result.monthlyTaxableIncome).toBe(0)
    expect(result.monthlyIncomeTax).toBe(0)
    expect(result.monthlyTakeHomeIncome).toBe(3_520)
  })

  it('adds salary take-home to cash balance and provident fund to provident balance', () => {
    const assets = applySalaryIncomeToAssets([], {
      monthlySalary: 40_000,
      providentFundRate: 0.12,
      providentFundBaseCap: getProvidentFundBaseCap('上海'),
      providentFundCity: '上海',
    }, '2026-07-01T00:00:00.000Z')

    expect(assets.find((asset) => asset.name === '现金余额')?.amount).toBeCloseTo(30_589)
    expect(assets.find((asset) => asset.name === '现金余额')?.type).toBe('cash')
    expect(assets.find((asset) => asset.name === '现金余额')?.isLocked).toBe(false)
    expect(assets.find((asset) => asset.name === '公积金余额')?.amount).toBe(8_856)
    expect(assets.find((asset) => asset.name === '公积金余额')?.type).toBe('deposit')
    expect(assets.find((asset) => asset.name === '公积金余额')?.isLocked).toBe(true)
  })

  it('applies a recurring salary to assets once per month', () => {
    const salaryRule = {
      id: 'salary',
      name: '工资',
      startMonth: '2026-07',
      activeIncome: 30_589,
      salaryInput: {
        monthlySalary: 40_000,
        providentFundRate: 0.12,
        providentFundBaseCap: getProvidentFundBaseCap('上海'),
        providentFundCity: '上海' as const,
      },
      passiveIncome: 0,
      fixedExpense: 0,
      dailyExpense: 0,
      familyExpense: 0,
      annualExpenseAllocated: 0,
      durableCostAllocated: 0,
    }

    const first = applyRecurringSalaryIncomeToAssets([], salaryRule, '2026-07', '2026-07-08T00:00:00.000Z')
    const second = applyRecurringSalaryIncomeToAssets(first.assets, first.cashflow, '2026-07', '2026-07-08T00:00:00.000Z')

    expect(second.assets.find((asset) => asset.name === '现金余额')?.amount).toBeCloseTo(30_589)
    expect(second.assets.find((asset) => asset.name === '公积金余额')?.amount).toBe(8_856)
    expect(second.cashflow.lastSalaryAssetMonth).toBe('2026-07')
  })

  it('ignores annual bonus when applying recurring salary to assets', () => {
    const salaryRule = {
      id: 'salary',
      name: '工资',
      startMonth: '2026-01',
      activeIncome: 30_589,
      salaryInput: {
        monthlySalary: 40_000,
        providentFundRate: 0.12,
        providentFundBaseCap: getProvidentFundBaseCap('上海'),
        providentFundCity: '上海' as const,
      },
      annualBonusInput: {
        enabled: true,
        payoutMonth: 12,
        amountMode: 'net' as const,
        grossAmount: 0,
        netAmount: 50_000,
      },
      passiveIncome: 0,
      fixedExpense: 0,
      dailyExpense: 0,
      familyExpense: 0,
      annualExpenseAllocated: 0,
      durableCostAllocated: 0,
    }

    const first = applyRecurringSalaryIncomeToAssets([], salaryRule, '2026-12', '2026-12-08T00:00:00.000Z')
    const second = applyRecurringSalaryIncomeToAssets(first.assets, first.cashflow, '2026-12', '2026-12-08T00:00:00.000Z')
    const third = applyRecurringSalaryIncomeToAssets(second.assets, second.cashflow, '2027-12', '2027-12-08T00:00:00.000Z')

    expect(second.assets.find((asset) => asset.name === '现金余额')?.amount).toBeCloseTo(30_589)
    expect(second.cashflow.lastBonusAssetYear).toBeUndefined()
    expect(third.assets.find((asset) => asset.name === '现金余额')?.amount).toBeCloseTo(61_178)
    expect(third.cashflow.lastBonusAssetYear).toBeUndefined()
  })

  it('generates the current month cashflow from active recurring rules only once', () => {
    const generated = buildMonthlyCashflowFromRecurring(
      [
        {
          id: 'salary',
          name: '工资',
          startMonth: '2026-01',
          activeIncome: 20_000,
          passiveIncome: 0,
          fixedExpense: 3_000,
          dailyExpense: 4_000,
          familyExpense: 1_000,
          annualExpenseAllocated: 500,
          durableCostAllocated: 500,
        },
        {
          id: 'ended',
          name: '已结束兼职',
          startMonth: '2025-01',
          endMonth: '2026-05',
          activeIncome: 2_000,
          passiveIncome: 0,
          fixedExpense: 0,
          dailyExpense: 0,
          familyExpense: 0,
          annualExpenseAllocated: 0,
          durableCostAllocated: 0,
        },
      ],
      '2026-06',
    )

    expect(generated?.month).toBe('2026-06')
    expect(generated?.activeIncome).toBe(20_000)
    expect(generated ? calculateBudgetSummary(budget('basic', 5_000), generated.passiveIncome).annualBudgetExpense : 0).toBe(60_000)
    expect(generated ? generated.activeIncome + generated.passiveIncome - generated.fixedExpense - generated.dailyExpense - generated.familyExpense - generated.annualExpenseAllocated - generated.durableCostAllocated : 0).toBe(11_000)
  })

  it('includes provident fund and ignores annual bonus in generated active income', () => {
    const recurring = [
      {
        id: 'salary',
        name: '工资',
        startMonth: '2026-01',
        activeIncome: 20_000,
        salaryInput: {
          monthlySalary: 40_000,
          providentFundRate: 0.12,
          providentFundBaseCap: getProvidentFundBaseCap('上海'),
          providentFundCity: '上海' as const,
        },
        annualBonusInput: {
          enabled: true,
          payoutMonth: 12,
          amountMode: 'gross' as const,
          grossAmount: 60_000,
          netAmount: 0,
        },
        passiveIncome: 0,
        fixedExpense: 0,
        dailyExpense: 0,
        familyExpense: 0,
        annualExpenseAllocated: 0,
        durableCostAllocated: 0,
      },
    ]

    const november = buildMonthlyCashflowFromRecurring(recurring, '2026-11')
    const december = buildMonthlyCashflowFromRecurring(recurring, '2026-12')

    expect(november?.activeIncome).toBe(39_445)
    expect(december?.activeIncome).toBe(39_445)
  })

  it('adds one-time cashflow amount to the matching asset by name and type', () => {
    const assets = applyOneTimeCashflowToAssets(
      [
        {
          id: 'asset-1',
          name: '指数基金',
          type: 'fund',
          amount: 10_000,
          isDisposable: true,
          isLocked: false,
          updatedAt: '2026-06-01T00:00:00.000Z',
        },
      ],
      {
        id: 'one-time-1',
        month: '2026-06',
        assetName: '指数基金',
        assetType: 'fund',
        amount: 30_000,
        note: '奖金买入',
      },
      '2026-06-28T00:00:00.000Z',
    )

    expect(assets).toHaveLength(1)
    expect(assets[0].amount).toBe(40_000)
    expect(assets[0].updatedAt).toBe('2026-06-28T00:00:00.000Z')
  })
})
