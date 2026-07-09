import { describe, expect, it } from 'vitest'
import { formatCurrency, formatFreedomTime, formatNumber, formatPercent } from '../../src/utils/format'

describe('number formatting', () => {
  it('uses k and w units for readable compact amounts', () => {
    expect(formatCurrency(980)).toBe('¥980')
    expect(formatCurrency(1_200)).toBe('¥1.2k')
    expect(formatCurrency(12_000)).toBe('¥1.2w')
    expect(formatCurrency(1_200_000)).toBe('¥120w')

    expect(formatNumber(1_200)).toBe('1.2k')
    expect(formatNumber(12_000)).toBe('1.2w')
  })

  it('describes achieved freedom as asset income coverage', () => {
    expect(formatFreedomTime({ status: 'achieved', months: 0 })).toBe('当前收益已覆盖')
  })

  it('formats percent values with configurable decimal places', () => {
    expect(formatPercent(0.0125, 2)).toBe('1.25%')
    expect(formatPercent(0.001, 2)).toBe('0.10%')
    expect(formatPercent(0.4)).toBe('40%')
  })
})
