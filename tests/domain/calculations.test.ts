import { describe, expect, it } from 'vitest'
import {
  buildScenarioComparison,
  applyOneTimeCashflowToAssets,
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
import type { AppDataPackage, Budget, MonthlyCashflow } from '../../src/domain/types'

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
  targets: [],
  assets: [],
  liabilities: [],
  budgets: [],
  oneTimeCashflows: [],
  recurringCashflows: [],
  scenarios: [],
  settings: {
    currency: 'CNY',
    defaultAnnualReturn: 0.04,
    safeWithdrawalRate: 0.04,
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
          annualCashflow: 4_000,
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
    expect(result.annualPassiveCashflow).toBe(4_000)
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
          annualCashflow: 4_000,
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
    expect(result.annualPassiveCashflow).toBe(4_000)
  })

  it('calculates annual budget expense, passive coverage, and funding gap from budget items', () => {
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
    expect(result.passiveCoverageRate).toBeCloseTo(0.4)
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
    expect(calculateSupportYears({ disposableAssets: 100_000, annualBudgetExpense: 60_000, annualPassiveCashflow: 60_000 })).toEqual({
      status: 'covered',
    })
    expect(calculateSupportYears({ disposableAssets: 0, annualBudgetExpense: 60_000, annualPassiveCashflow: 12_000 })).toEqual({
      status: 'insufficient_assets',
    })
    expect(calculateSupportYears({ disposableAssets: 240_000, annualBudgetExpense: 60_000, annualPassiveCashflow: 12_000 })).toEqual({
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
      monthlySurplus: 0,
      annualBudgetExpense: 120_000,
      annualReturn: 0.04,
      safeWithdrawalRate: 0.04,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    })

    expect(result.status).toBe('not_reachable')
    expect(result.reason).toContain('现金流')
  })

  it('marks freedom time as not reachable after eighty years of projection', () => {
    const result = projectFreedomTime({
      incomeGeneratingNetWorth: 10_000,
      lockedAssetAmount: 0,
      reservedAssetAmount: 0,
      monthlySurplus: 1,
      annualBudgetExpense: 1_000_000,
      annualReturn: 0,
      safeWithdrawalRate: 0.04,
      startDate: new Date('2026-06-01T00:00:00.000Z'),
    })

    expect(result.status).toBe('not_reachable')
    expect(result.reason).toContain('80 年')
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
    expect(snapshot.budgetSummaries[0].passiveCoverageRate).toBeCloseTo(0.4)
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
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 4_000,
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
            updatedAt: '2026-06-01',
          },
        ],
        budgets: [budget('basic', 5_000), budget('comfortable', 8_000), budget('ideal', 12_000)],
        recurringCashflows: [
          {
            id: 'salary',
            name: '工资',
            startMonth: '2026-01',
            activeIncome: 4_000,
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
        id: 's1',
        name: '多存 3000',
        monthlyActiveIncome: 12_000,
        monthlyExpense: 5_000,
        expectedAnnualReturn: 0.05,
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
      annualBonusMonths: 2,
      providentFundRate: 0.12,
      providentFundBaseCap: getProvidentFundBaseCap('上海'),
      providentFundCity: '上海',
    })

    expect(result.monthlyProvidentFundIncome).toBe(8_856)
    expect(result.annualIndividualProvidentFund).toBe(53_136)
    expect(result.annualTaxableIncome).toBe(446_864)
    expect(result.annualIncomeTax).toBeCloseTo(81_139.2)
    expect(result.annualTakeHomeIncome).toBeCloseTo(425_724.8)
    expect(result.monthlyTakeHomeIncome).toBeCloseTo(35_477.07, 2)
  })

  it('treats non-taxable salary income as zero tax', () => {
    const result = calculateSalaryIncomeEstimate({
      monthlySalary: 4_000,
      annualBonusMonths: 0,
      providentFundRate: 0.12,
      providentFundBaseCap: getProvidentFundBaseCap('成都'),
      providentFundCity: '成都',
    })

    expect(result.annualTaxableIncome).toBe(0)
    expect(result.annualIncomeTax).toBe(0)
    expect(result.monthlyTakeHomeIncome).toBe(3_520)
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
