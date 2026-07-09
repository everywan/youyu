import type { AppDataPackage, Asset, Budget, BudgetLevel, FixedExpenseItem } from '../domain/types'
import { createDefaultFixedExpenseItems, defaultBudgetMonthlyFixed } from '../domain/budgetPresets'

const budgetNames: Record<BudgetLevel, string> = {
  basic: '基础预算',
  comfortable: '舒适预算',
  ideal: '理想预算',
}
export function createDefaultAppData(): AppDataPackage {
  return {
    schemaVersion: 1,
    targets: [],
    assets: createCoreAssets(),
    liabilities: [],
    budgets: [
      createBudget('basic'),
      createBudget('comfortable'),
      createBudget('ideal'),
    ],
    oneTimeCashflows: [],
    recurringCashflows: [],
    scenarios: [],
    settings: {
      currency: 'CNY',
      inflationRate: 0.01,
      emergencyFundMonths: 6,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function createCoreAssets(updatedAt = new Date().toISOString()): Asset[] {
  return [
    {
      id: 'asset-cash-balance',
      name: '现金余额',
      type: 'cash',
      assetCategory: 'income_generating',
      amount: 0,
      isDisposable: true,
      isLocked: false,
      annualYieldRate: 0,
      updatedAt,
    },
    {
      id: 'asset-provident-fund-balance',
      name: '公积金余额',
      type: 'deposit',
      assetCategory: 'income_generating',
      amount: 0,
      isDisposable: false,
      isLocked: true,
      annualYieldRate: 0,
      updatedAt,
    },
  ]
}

export function createBudget(level: BudgetLevel, monthlyFixed = defaultBudgetMonthlyFixed[level]): Budget {
  const fixedExpenseItems = createDefaultBudgetItems(monthlyFixed)

  return {
    id: `budget-${level}`,
    name: budgetNames[level],
    level,
    monthlyFixed: fixedExpenseItems.reduce((total, item) => total + item.amount, 0),
    fixedExpenseMode: 'items',
    fixedExpenseItems,
    monthlyDaily: 0,
    monthlyFamily: 0,
    monthlyDurableCost: 0,
    annualLargeExpense: 0,
    annualReserve: 0,
  }
}

function createDefaultBudgetItems(monthlyFixed: number): FixedExpenseItem[] {
  return createDefaultFixedExpenseItems(monthlyFixed)
}
