import { describe, expect, it } from 'vitest'
import { addDefaultPresetRowsToLegacySingleItemBudget } from '../../src/domain/budgetPresets'
import type { FixedExpenseItem } from '../../src/domain/types'

describe('budget presets', () => {
  it('adds editable preset rows to legacy onboarding summary-only budgets', () => {
    const legacyItems: FixedExpenseItem[] = [{ id: 'budget-item-123', category: 'custom', name: '汇总项', amount: 5_000 }]

    const result = addDefaultPresetRowsToLegacySingleItemBudget(legacyItems)

    expect(result.map((item) => item.name)).toEqual(['汇总项', '餐饮', '房租房贷', '水电', '娱乐'])
    expect(result[0]).toMatchObject({ id: 'budget-summary', category: 'custom', name: '汇总项', amount: 5_000 })
  })

  it('adds editable preset rows to legacy fixed-expense-only budgets', () => {
    const legacyItems: FixedExpenseItem[] = [{ id: 'legacy-fixed', category: 'custom', name: '固定支出', amount: 5_000 }]

    const result = addDefaultPresetRowsToLegacySingleItemBudget(legacyItems)

    expect(result.map((item) => item.name)).toEqual(['汇总项', '餐饮', '房租房贷', '水电', '娱乐'])
    expect(result[0]).toMatchObject({ id: 'budget-summary', category: 'custom', name: '汇总项', amount: 5_000 })
  })

  it('keeps current summary-only budgets unchanged after preset rows are deleted', () => {
    const deletedPresetItems: FixedExpenseItem[] = [{ id: 'budget-summary', category: 'custom', name: '汇总项', amount: 5_000 }]

    const result = addDefaultPresetRowsToLegacySingleItemBudget(deletedPresetItems)

    expect(result).toEqual(deletedPresetItems)
  })
})
