import type { AppDataPackage, Budget, BudgetLevel, FixedExpenseCategory, FixedExpenseItem } from '../domain/types'

const budgetNames: Record<BudgetLevel, string> = {
  basic: '基础预算',
  comfortable: '舒适预算',
  ideal: '理想预算',
}
const defaultBudgetItems: { category: FixedExpenseCategory; name: string }[] = [
  { category: 'rent_mortgage', name: '房租/房贷' },
  { category: 'dining', name: '餐饮' },
  { category: 'utilities', name: '水电' },
  { category: 'transport', name: '交通' },
  { category: 'pocket_money', name: '零花钱' },
]

export function createDefaultAppData(): AppDataPackage {
  return {
    schemaVersion: 1,
    targets: [],
    assets: [],
    liabilities: [],
    budgets: [
      createBudget('basic', 0),
      createBudget('comfortable', 0),
      createBudget('ideal', 0),
    ],
    oneTimeCashflows: [],
    recurringCashflows: [],
    scenarios: [],
    settings: {
      currency: 'CNY',
      defaultAnnualReturn: 0.03,
      safeWithdrawalRate: 0.04,
      emergencyFundMonths: 6,
    },
    updatedAt: new Date().toISOString(),
  }
}

export function createBudget(level: BudgetLevel, monthlyFixed: number): Budget {
  const fixedExpenseItems = createDefaultBudgetItems()
  if (monthlyFixed > 0) {
    fixedExpenseItems.push({ id: 'budget-total', category: 'custom', name: '预算总额', amount: monthlyFixed })
  }

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

function createDefaultBudgetItems(): FixedExpenseItem[] {
  return defaultBudgetItems.map((item) => ({
    id: `budget-${item.category}`,
    category: item.category,
    name: item.name,
    amount: 0,
  }))
}
