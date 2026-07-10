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
    expect(reloaded.assets.map((asset) => asset.name)).toEqual(expect.arrayContaining(['现金余额', '公积金余额', '货币基金']))
  })

  it('drops legacy scenarios from imported and exported data', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const legacyJson = JSON.stringify({
      ...createDefaultAppData(),
      scenarios: [{ id: 'legacy-scenario', name: '旧场景' }],
    })

    const imported = await repository.importAppData(legacyJson)
    const exported = JSON.parse(await repository.exportAppData()) as Record<string, unknown>

    expect('scenarios' in imported).toBe(false)
    expect('scenarios' in exported).toBe(false)
  })

  it('rejects malformed restore data without replacing the current package', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const data = createDefaultAppData()
    data.budgets[0].fixedExpenseItems = [{ id: 'custom-budget', category: 'custom', name: '预算总额', amount: 5_000 }]
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
    expect(data.budgets.map((budget) => budget.monthlyFixed)).toEqual([4_000, 8_000, 10_000])
    expect(data.budgets[0].fixedExpenseItems.map((item) => item.name)).toEqual([
      '汇总项',
      '餐饮',
      '房租房贷',
      '水电',
      '娱乐',
    ])
    expect(data.budgets[0].fixedExpenseItems[0]).toMatchObject({ category: 'custom', name: '汇总项', amount: 4_000 })
  })

  it('upgrades existing old default budget rows to the current presets', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const legacyData = createDefaultAppData()
    const rawLegacyData = {
      ...legacyData,
      budgets: legacyData.budgets.map((budget) => ({
        ...budget,
        fixedExpenseItems: [
          { id: 'budget-rent_mortgage', category: 'rent_mortgage', name: '房租/房贷', amount: 3_000 },
          { id: 'budget-dining', category: 'dining', name: '餐饮', amount: 2_000 },
          { id: 'budget-utilities', category: 'utilities', name: '水电', amount: 200 },
          { id: 'budget-transport', category: 'transport', name: '交通', amount: 400 },
          { id: 'budget-pocket_money', category: 'pocket_money', name: '零花钱', amount: 500 },
        ],
      })),
    }
    localStorage.setItem('test-app-data', JSON.stringify(rawLegacyData))

    const reloaded = await repository.loadAppData()

    expect(reloaded.budgets[0].fixedExpenseItems.map((item) => item.name)).toEqual([
      '餐饮',
      '房租房贷',
      '水电',
      '娱乐',
      '交通',
      '零花钱',
    ])
    expect(reloaded.budgets[0].fixedExpenseItems.find((item) => item.category === 'utilities')?.amount).toBe(200)
    expect(reloaded.budgets[0].fixedExpenseItems.find((item) => item.name === '交通')).toMatchObject({ category: 'custom', amount: 400 })
    expect(reloaded.budgets[0].monthlyFixed).toBe(6_100)
  })

  it('adds default summary rows to existing empty preset budgets', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const data = createDefaultAppData()
    data.budgets = data.budgets.map((budget) => ({
      ...budget,
      monthlyFixed: 0,
      fixedExpenseItems: budget.fixedExpenseItems.filter((item) => item.name !== '汇总项').map((item) => ({ ...item, amount: 0 })),
    }))
    localStorage.setItem('test-app-data', JSON.stringify(data))

    const reloaded = await repository.loadAppData()

    expect(reloaded.budgets.map((budget) => budget.monthlyFixed)).toEqual([4_000, 8_000, 10_000])
    expect(reloaded.budgets[0].fixedExpenseItems[0]).toMatchObject({ category: 'custom', name: '汇总项', amount: 4_000 })
  })

  it('keeps deleted current budget preset rows deleted after reload', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    const data = createDefaultAppData()
    data.budgets = data.budgets.map((budget) => ({
      ...budget,
      fixedExpenseItems: budget.fixedExpenseItems.filter((item) => item.category !== 'commute' && item.category !== 'insurance'),
    }))

    await repository.saveAppData(data)
    const reloaded = await repository.loadAppData()

    expect(reloaded.budgets[0].fixedExpenseItems.some((item) => item.category === 'commute')).toBe(false)
    expect(reloaded.budgets[0].fixedExpenseItems.some((item) => item.category === 'insurance')).toBe(false)
    expect(reloaded.budgets[0].monthlyFixed).toBe(4_000)
  })

  it('creates default fixed assets and migrates CPI setting without restoring deleted assets', async () => {
    const defaults = createDefaultAppData()

    expect(defaults.assets.map((asset) => asset.name)).toEqual(['现金余额', '公积金余额'])
    expect(defaults.settings.inflationRate).toBe(0.01)
    expect('defaultAnnualReturn' in defaults.settings).toBe(false)

    const repository = new LocalAppDataRepository('test-app-data')
    const legacyData = createDefaultAppData()
    const rawLegacyData = {
      ...legacyData,
      assets: [],
      settings: {
        currency: 'CNY',
        defaultAnnualReturn: 0.03,
        emergencyFundMonths: 6,
      },
    }
    localStorage.setItem('test-app-data', JSON.stringify(rawLegacyData))

    const reloaded = await repository.loadAppData()

    expect(reloaded.assets.map((asset) => asset.name)).toEqual([])
    expect(reloaded.settings.inflationRate).toBe(0.01)
    expect('defaultAnnualReturn' in reloaded.settings).toBe(false)
  })

  it('removes assets without restoring fixed asset rows on reload', async () => {
    const repository = new LocalAppDataRepository('test-app-data')
    await repository.saveAppData(createDefaultAppData())

    await repository.removeAsset('asset-cash-balance')
    const reloaded = await repository.loadAppData()

    expect(reloaded.assets.map((asset) => asset.name)).toEqual(['公积金余额'])
  })
})
