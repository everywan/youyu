import { beforeEach, describe, expect, it } from 'vitest'
import { createDefaultAppData } from '../../src/repositories/defaultData'
import { LocalAppDataRepository } from '../../src/repositories/LocalAppDataRepository'

describe('LocalAppDataRepository', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  it('saves, exports, imports, and reloads a versioned data package', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const data = createDefaultAppData()
    data.assets.push({
      id: 'asset-1',
      name: '货币基金',
      type: 'fund',
      amount: 20_000,
      isDisposable: true,
      isLocked: false,
      updatedAt: '2026-06-01',
    })

    await repository.saveAppData(data)
    const exported = await repository.exportAppData()
    const imported = await repository.importAppData(exported)
    const reloaded = await repository.loadAppData()

    expect(imported.schemaVersion).toBe(1)
    expect(reloaded.assets).toHaveLength(1)
    expect(reloaded.assets[0].name).toBe('货币基金')
  })

  it('rejects malformed restore data without replacing the current package', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const data = createDefaultAppData()
    data.budgets[0].fixedExpenseItems.push({ id: 'custom-budget', category: 'custom', name: '预算总额', amount: 5_000 })
    data.budgets[0].monthlyFixed = 5_000
    await repository.saveAppData(data)

    await expect(repository.importAppData('{"schemaVersion":2}')).rejects.toThrow('版本')
    const reloaded = await repository.loadAppData()

    expect(reloaded.budgets[0].monthlyFixed).toBe(5_000)
  })

  it('loads earlier v1 data packages that do not yet have cashflow split fields', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const legacyData = createDefaultAppData()
    const rawLegacyData = {
      ...legacyData,
      oneTimeCashflows: undefined,
      recurringCashflows: undefined,
    }
    delete rawLegacyData.oneTimeCashflows
    delete rawLegacyData.recurringCashflows
    localStorage.setItem('test-app-data', JSON.stringify(rawLegacyData))

    const reloaded = await repository.loadAppData()

    expect(reloaded.oneTimeCashflows).toEqual([])
    expect(reloaded.recurringCashflows).toEqual([])
  })

  it('migrates legacy monthly cashflows into one-month recurring cashflow rules', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const legacyData = createDefaultAppData()
    const rawLegacyData = {
      ...legacyData,
      monthlyCashflows: [
        {
          id: 'cashflow-2026-06',
          month: '2026-06',
          activeIncome: 20_000,
          passiveIncome: 500,
          fixedExpense: 4_000,
          dailyExpense: 3_000,
          familyExpense: 1_000,
          annualExpenseAllocated: 500,
          durableCostAllocated: 300,
          note: '旧版月度记录',
        },
      ],
      oneTimeCashflows: undefined,
      recurringCashflows: undefined,
    }
    delete rawLegacyData.oneTimeCashflows
    delete rawLegacyData.recurringCashflows
    localStorage.setItem('test-app-data', JSON.stringify(rawLegacyData))

    const reloaded = await repository.loadAppData()

    expect(reloaded.oneTimeCashflows).toEqual([])
    expect(reloaded.recurringCashflows).toEqual([
      {
        id: 'cashflow-2026-06',
        name: '2026-06 月度现金流',
        startMonth: '2026-06',
        endMonth: '2026-06',
        activeIncome: 20_000,
        passiveIncome: 500,
        fixedExpense: 4_000,
        dailyExpense: 3_000,
        familyExpense: 1_000,
        annualExpenseAllocated: 500,
        durableCostAllocated: 300,
        note: '旧版月度记录',
      },
    ])
  })

  it('normalizes older budgets into itemized budgets', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const legacyData = createDefaultAppData()
    const rawLegacyData = {
      ...legacyData,
      budgets: legacyData.budgets.map(({ fixedExpenseMode: _mode, fixedExpenseItems: _items, ...budget }) => ({
        ...budget,
        monthlyFixed: 4_200,
        monthlyDaily: 1_000,
        monthlyFamily: 2_000,
        monthlyDurableCost: 300,
      })),
    }
    localStorage.setItem('test-app-data', JSON.stringify(rawLegacyData))

    const reloaded = await repository.loadAppData()

    expect(reloaded.budgets[0].fixedExpenseMode).toBe('items')
    expect(reloaded.budgets[0].fixedExpenseItems).toEqual([
      { id: 'legacy-fixed', category: 'custom', name: '固定支出', amount: 4_200 },
      { id: 'legacy-daily', category: 'custom', name: '日常', amount: 1_000 },
      { id: 'legacy-family', category: 'custom', name: '家庭', amount: 2_000 },
      { id: 'legacy-durable', category: 'custom', name: '耐用消费', amount: 300 },
    ])
    expect(reloaded.budgets[0].monthlyFixed).toBe(7_500)
    expect(reloaded.budgets[0].monthlyDaily).toBe(0)
    expect(reloaded.budgets[0].monthlyFamily).toBe(0)
    expect(reloaded.budgets[0].monthlyDurableCost).toBe(0)
  })

  it('creates default budgets with editable item rows', () => {
    const data = createDefaultAppData()

    expect(data.budgets[0].fixedExpenseMode).toBe('items')
    expect(data.budgets[0].fixedExpenseItems.map((item) => item.name)).toEqual(['房租/房贷', '餐饮', '水电', '交通', '零花钱'])
  })
})
