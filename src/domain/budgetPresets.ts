import type { BudgetLevel, FixedExpenseCategory, FixedExpenseItem } from './types'

export const defaultFixedExpenseItemPresets: { category: Exclude<FixedExpenseCategory, 'custom'>; name: string }[] = [
  { category: 'dining', name: '餐饮' },
  { category: 'rent_mortgage', name: '房租房贷' },
  { category: 'utilities', name: '水电' },
  { category: 'leisure_shopping', name: '娱乐' },
]

export const defaultBudgetMonthlyFixed: Record<BudgetLevel, number> = {
  basic: 4_000,
  comfortable: 8_000,
  ideal: 10_000,
}

export const fixedExpenseCategories: FixedExpenseCategory[] = [...defaultFixedExpenseItemPresets.map((item) => item.category), 'custom']

const presetCategories = new Set<FixedExpenseCategory>(defaultFixedExpenseItemPresets.map((item) => item.category))
const legacyCategoryAliases: Record<string, FixedExpenseCategory> = {
  transport: 'commute',
}
const legacyNameAliases: Record<string, FixedExpenseCategory> = {
  '房租/房贷': 'rent_mortgage',
  水电燃气: 'utilities',
  娱乐购物: 'leisure_shopping',
  水电: 'utilities',
}

export function createDefaultFixedExpenseItems(monthlyFixed = 0): FixedExpenseItem[] {
  const presetItems = defaultFixedExpenseItemPresets.map((item) => ({
    id: `budget-${item.category}`,
    category: item.category,
    name: item.name,
    amount: 0,
  }))
  if (monthlyFixed <= 0) return presetItems

  return [createSummaryFixedExpenseItem(monthlyFixed), ...presetItems]
}

export function createSummaryFixedExpenseItem(amount: number): FixedExpenseItem {
  return {
    id: 'budget-summary',
    category: 'custom',
    name: '汇总项',
    amount,
  }
}

export function addDefaultPresetRowsToLegacySingleItemBudget(items: FixedExpenseItem[]): FixedExpenseItem[] {
  if (items.length !== 1) return items
  const [item] = items
  if (item.id === 'budget-summary' || item.category !== 'custom' || !['汇总项', '固定支出'].includes(item.name ?? '')) return items

  return [createSummaryFixedExpenseItem(item.amount), ...createDefaultFixedExpenseItems(0)]
}

export function normalizeFixedExpenseCategory(category: unknown, name?: unknown): FixedExpenseCategory {
  const categoryText = typeof category === 'string' ? category : ''
  const nameText = typeof name === 'string' ? name.trim() : ''

  if (presetCategories.has(categoryText as FixedExpenseCategory)) return categoryText as FixedExpenseCategory
  return legacyCategoryAliases[categoryText] ?? legacyNameAliases[nameText] ?? 'custom'
}

export function reconcilePresetFixedExpenseItems(items: FixedExpenseItem[]): FixedExpenseItem[] {
  const presetAmounts = new Map<FixedExpenseCategory, FixedExpenseItem>()
  const customItems: FixedExpenseItem[] = []

  for (const item of items) {
    const category = normalizeFixedExpenseCategory(item.category, item.name)
    const amount = Number(item.amount ?? 0)
    if (presetCategories.has(category)) {
      const existing = presetAmounts.get(category)
      presetAmounts.set(category, {
        id: existing?.id ?? item.id,
        category,
        name: item.name,
        amount: (existing?.amount ?? 0) + amount,
      })
      continue
    }

    customItems.push({
      ...item,
      category: 'custom',
      amount,
    })
  }

  return [
    ...defaultFixedExpenseItemPresets.map((preset) => {
      const existing = presetAmounts.get(preset.category)
      return {
        id: existing?.id || `budget-${preset.category}`,
        category: preset.category,
        name: preset.name,
        amount: existing?.amount ?? 0,
      }
    }),
    ...customItems,
  ]
}

export function shouldUpgradePresetFixedExpenseItems(items: { category?: unknown; name?: unknown }[]): boolean {
  return items.some((item) => normalizeFixedExpenseCategory(item.category, item.name) !== item.category)
}
