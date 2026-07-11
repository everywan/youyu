import type {
  AppDataPackage,
  AppSettings,
  Asset,
  Budget,
  DashboardSnapshot,
  OneTimeCashflow,
  RecurringCashflow,
} from '../domain/types'

export interface AppDataRepository {
  loadAppData(): Promise<AppDataPackage>
  saveAppData(data: AppDataPackage): Promise<void>
  exportAppData(): Promise<string>
  importAppData(json: string): Promise<AppDataPackage>
}

export interface DashboardRepository {
  getDashboardSnapshot(): Promise<DashboardSnapshot>
}

export interface AssetRepository {
  listAssets(): Promise<Asset[]>
  saveAsset(asset: Asset): Promise<void>
  removeAsset(id: string): Promise<void>
}

export interface BudgetRepository {
  listBudgets(): Promise<Budget[]>
  saveBudget(budget: Budget): Promise<void>
}

export interface CashflowRepository {
  listOneTimeCashflows(): Promise<OneTimeCashflow[]>
  saveOneTimeCashflow(cashflow: OneTimeCashflow): Promise<void>
  removeOneTimeCashflow(id: string): Promise<void>
  listRecurringCashflows(): Promise<RecurringCashflow[]>
  saveRecurringCashflow(cashflow: RecurringCashflow): Promise<void>
  removeRecurringCashflow(id: string): Promise<void>
}

export interface SettingsRepository {
  getSettings(): Promise<AppSettings>
  saveSettings(settings: AppSettings): Promise<void>
}
