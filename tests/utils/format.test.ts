import { describe, expect, it } from 'vitest'
import { formatCurrency, formatNumber } from '../../src/utils/format'

describe('number formatting', () => {
  it('uses k and w units for readable compact amounts', () => {
    expect(formatCurrency(980)).toBe('¥980')
    expect(formatCurrency(1_200)).toBe('¥1.2k')
    expect(formatCurrency(12_000)).toBe('¥1.2w')
    expect(formatCurrency(1_200_000)).toBe('¥120w')

    expect(formatNumber(1_200)).toBe('1.2k')
    expect(formatNumber(12_000)).toBe('1.2w')
  })
})
