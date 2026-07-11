import { describe, expect, it } from 'vitest'
import { assetCategoryLabel, assetTypeLabel, cashflowKindLabel } from '../../src/domain/display'

describe('display labels', () => {
  it('maps internal asset enums to Chinese labels', () => {
    expect(assetTypeLabel('fund')).toBe('基金')
    expect(assetTypeLabel('real_estate')).toBe('房产')
  })

  it('maps row tags to user-facing Chinese labels', () => {
    expect(assetCategoryLabel('income_generating')).toBe('收益性资产')
    expect(assetCategoryLabel('non_income')).toBe('非收益资产')
    expect(assetCategoryLabel('durable')).toBe('耐用消费品')
    expect(cashflowKindLabel('salary')).toBe('工资')
    expect(cashflowKindLabel('one_time_income')).toBe('一次性收入')
  })
})
