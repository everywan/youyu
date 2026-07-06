<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">录入</h1>
        <p class="page-subtitle">每月维护一次：资产负债、预算、现金流。</p>
      </div>
    </header>

    <div class="segment-wrap">
      <a-segmented v-model:value="section" :options="sectionOptions" block />
    </div>

    <section v-if="section === 'assets'" class="page">
      <div class="segment-wrap subtab-wrap">
        <a-segmented v-model:value="assetSection" :options="assetSectionOptions" block />
      </div>

      <div v-if="assetSection === 'assets'" class="panel">
        <div class="section-heading">
          <div>
            <div class="section-label">资产</div>
            <div class="section-title">收益型资产</div>
          </div>
        </div>
        <div class="asset-summary">
          <div>
            <span>总资产</span>
            <strong>{{ formatCurrency(assetTotal) }}</strong>
          </div>
          <div>
            <span>年现金流</span>
            <strong>{{ formatCurrency(assetAnnualCashflow) }}</strong>
          </div>
          <div>
            <span>条目</span>
            <strong>{{ displayAssets.length }}</strong>
          </div>
        </div>
        <div v-if="displayAssets.length === 0" class="empty-state">还没有资产。</div>
        <button v-for="asset in displayAssets" :key="asset.id" class="asset-row row-button" type="button" @click="editAsset(asset)">
          <span class="asset-mark income" />
          <div class="row-main">
            <div class="row-title">{{ asset.name }}</div>
            <div class="row-description">{{ assetTypeLabel(asset.type) }} · {{ asset.isLocked ? '不可动用' : '可动用' }} · 年现金流 {{ formatCurrency(asset.annualCashflow ?? 0) }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(asset.amount) }}</div>
        </button>
        <button class="primary-add-row" type="button" @click="openNewAsset('income_generating')">+ 新增资产</button>
      </div>

      <div v-else-if="assetSection === 'liabilities'" class="panel">
        <div class="section-heading">
          <div>
            <div class="section-label">负债</div>
            <div class="section-title">还款压力</div>
          </div>
        </div>
        <div class="asset-summary liability">
          <div>
            <span>总负债</span>
            <strong>{{ formatCurrency(liabilityTotal) }}</strong>
          </div>
          <div>
            <span>月供</span>
            <strong>{{ formatCurrency(liabilityMonthlyPayment) }}</strong>
          </div>
          <div>
            <span>条目</span>
            <strong>{{ data.liabilities.length }}</strong>
          </div>
        </div>
        <div v-if="data.liabilities.length === 0" class="empty-state">还没有负债。</div>
        <button v-for="liability in data.liabilities" :key="liability.id" class="asset-row row-button" type="button" @click="editLiability(liability)">
          <span class="asset-mark liability" />
          <div class="row-main">
            <div class="row-title">{{ liability.name }}</div>
            <div class="row-description">{{ liabilityTypeLabel(liability.type) }} · 月供 {{ formatCurrency(liability.monthlyPayment ?? 0) }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(liability.balance) }}</div>
        </button>
        <button class="primary-add-row" type="button" @click="openNewLiability">+ 新增负债</button>
      </div>

      <div v-else class="panel">
        <div class="section-heading">
          <div>
            <div class="section-label">耐用消费品</div>
            <div class="section-title">大件和设备</div>
          </div>
        </div>
        <div class="asset-summary durable">
          <div>
            <span>总额</span>
            <strong>{{ formatCurrency(durableTotal) }}</strong>
          </div>
          <div>
            <span>条目</span>
            <strong>{{ durableAssets.length }}</strong>
          </div>
        </div>
        <div v-if="durableAssets.length === 0" class="empty-state">还没有耐用消费品。</div>
        <button v-for="asset in durableAssets" :key="asset.id" class="asset-row row-button" type="button" @click="editAsset(asset)">
          <span class="asset-mark durable" />
          <div class="row-main">
            <div class="row-title">{{ asset.name }}</div>
            <div class="row-description">{{ assetTypeLabel(asset.type) }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(asset.amount) }}</div>
        </button>
        <button class="primary-add-row" type="button" @click="openNewAsset('durable')">+ 新增耐用消费品</button>
      </div>
    </section>

    <section v-else-if="section === 'budgets'" class="page">
      <div v-for="budget in budgetDrafts" :key="budget.level" class="panel">
        <div class="section-label">{{ budget.name }}</div>
        <div class="form-grid">
          <div class="full-span metric-note">月预算合计：{{ formatCurrency(monthlyFixedExpense(budget)) }}</div>
          <div v-for="item in budget.fixedExpenseItems" :key="item.id" class="budget-item-row full-span">
            <a-input v-model:value="item.name" placeholder="预算项" />
            <a-input-number v-model:value="item.amount" :min="0" :controls="false" placeholder="金额" style="width: 100%" />
            <a-button v-if="item.category === 'custom'" size="small" danger @click="removeBudgetItem(budget, item.id)">删除</a-button>
          </div>
          <a-button class="full-span" @click="addCustomBudgetItem(budget)">+ 新增自定义项</a-button>
          <a-input-number v-model:value="budget.annualLargeExpense" :min="0" :controls="false" addon-before="年度大额" style="width: 100%" />
          <a-input-number v-model:value="budget.annualReserve" :min="0" :controls="false" addon-before="年度预留" style="width: 100%" />
        </div>
        <div class="metric-note">年预算支出：{{ formatCurrency(annualBudget(budget)) }}</div>
      </div>
      <div class="sticky-actions">
        <a-button type="primary" block @click="saveBudgets">保存三档预算</a-button>
      </div>
    </section>

    <section v-else class="page">
      <div class="panel">
        <div class="section-label">现金流</div>
        <div v-if="cashflowRows.length === 0" class="empty-state">还没有现金流。</div>
        <button v-for="row in cashflowRows" :key="row.id" class="list-row row-button" type="button" @click="row.kind === 'one_time_income' ? undefined : editRecurringCashflow(row.source as RecurringCashflow)">
          <div class="row-main">
            <div class="row-title"><span class="tag">{{ cashflowKindLabel(row.kind) }}</span>{{ row.title }}</div>
            <div class="row-description">{{ row.description }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(row.amount) }}</div>
        </button>
        <button class="list-row add-row" type="button" @click="openNewCashflow">+ 新增现金流</button>
      </div>
    </section>

    <a-modal v-model:open="assetModalOpen" :title="editingAssetId ? '编辑资产' : '新增资产'" ok-text="保存" cancel-text="取消" @ok="saveAsset">
      <div class="form-grid modal-form">
        <a-input v-model:value="assetForm.name" class="full-span" placeholder="名称，如 指数基金" />
        <a-select v-model:value="assetForm.assetCategory" :options="assetCategorySelectOptions" />
        <a-select v-model:value="assetForm.type" :options="assetTypeSelectOptions" />
        <a-input-number v-model:value="assetForm.amount" class="full-span" :min="0" :controls="false" inputmode="decimal" addon-before="金额" style="width: 100%" />
        <template v-if="assetForm.assetCategory === 'income_generating'">
          <a-input-number v-model:value="assetForm.reservedAmount" :min="0" :max="assetForm.amount" :controls="false" addon-before="预留" style="width: 100%" />
          <a-input-number v-model:value="assetForm.annualCashflow" :min="0" :controls="false" addon-before="年现金流" style="width: 100%" />
          <a-checkbox v-model:checked="assetForm.isLocked">不可动用</a-checkbox>
        </template>
      </div>
    </a-modal>

    <a-modal v-model:open="liabilityModalOpen" :title="editingLiabilityId ? '编辑负债' : '新增负债'" ok-text="保存" cancel-text="取消" @ok="saveLiability">
      <div class="form-grid modal-form">
        <a-input v-model:value="liabilityForm.name" class="full-span" placeholder="名称，如 房贷" />
        <a-select v-model:value="liabilityForm.type" :options="liabilityTypeSelectOptions" />
        <a-input-number v-model:value="liabilityForm.balance" :min="0" :controls="false" addon-before="余额" style="width: 100%" />
        <a-input-number v-model:value="liabilityForm.monthlyPayment" :min="0" :controls="false" addon-before="月供" style="width: 100%" />
        <a-input-number v-model:value="liabilityForm.annualInterestRate" class="full-span" :min="0" :step="0.01" :controls="false" addon-after="%" style="width: 100%" />
      </div>
    </a-modal>

    <a-modal v-model:open="cashflowModalOpen" :title="editingRecurringId ? '编辑现金流' : '新增现金流'" ok-text="保存" cancel-text="取消" @ok="saveCashflow">
      <div class="form-grid modal-form">
        <a-select v-model:value="cashflowFormKind" class="full-span" :options="cashflowKindOptions" :disabled="Boolean(editingRecurringId)" />
        <template v-if="cashflowFormKind === 'one_time_income'">
          <a-input v-model:value="oneTimeForm.month" placeholder="YYYY-MM" />
          <a-select v-model:value="oneTimeForm.assetType" :options="assetTypeSelectOptions" />
          <a-input v-model:value="oneTimeForm.assetName" class="full-span" placeholder="增加了什么资产，如 指数基金" />
          <a-input-number v-model:value="oneTimeForm.amount" class="full-span" :min="0" :controls="false" addon-before="金额" style="width: 100%" />
          <a-textarea v-model:value="oneTimeForm.note" class="full-span" placeholder="备注，如 年终奖买入" :rows="2" />
        </template>
        <template v-else>
          <a-input v-model:value="recurringForm.name" class="full-span" placeholder="名称，如 工资" />
          <a-input v-model:value="recurringForm.startMonth" placeholder="开始 YYYY-MM" />
          <a-input v-model:value="recurringForm.endMonth" placeholder="结束，可空" />
          <template v-if="cashflowFormKind === 'salary'">
            <a-input-number v-model:value="recurringForm.salaryInput.monthlySalary" class="full-span" :min="0" :controls="false" addon-before="月工资" addon-after="元" style="width: 100%" />
            <a-input-number v-model:value="recurringForm.salaryInput.annualBonusMonths" :min="0" :step="0.5" :controls="false" addon-before="年终奖" addon-after="月" style="width: 100%" />
            <a-select v-model:value="recurringForm.salaryInput.providentFundCity" :options="providentFundCityOptions" @change="syncProvidentFundBaseCap" />
            <a-input-number v-model:value="recurringForm.salaryInput.providentFundBaseCap" class="full-span" :min="0" :controls="false" addon-before="公积金基数上限" style="width: 100%" />
            <a-input-number v-model:value="providentFundRatePercent" :min="0" :max="100" :step="0.5" :controls="false" addon-before="公积金" addon-after="%" style="width: 100%" />
          </template>
          <a-input-number v-if="cashflowFormKind === 'passive_income'" v-model:value="recurringForm.passiveIncome" class="full-span" :min="0" :controls="false" addon-before="被动收入" style="width: 100%" />
          <template v-if="cashflowFormKind === 'expense'">
            <a-input-number v-model:value="recurringForm.fixedExpense" :min="0" :controls="false" addon-before="固定支出" style="width: 100%" />
            <a-input-number v-model:value="recurringForm.dailyExpense" :min="0" :controls="false" addon-before="日常支出" style="width: 100%" />
            <a-input-number v-model:value="recurringForm.familyExpense" :min="0" :controls="false" addon-before="家庭支出" style="width: 100%" />
            <a-input-number v-model:value="recurringForm.annualExpenseAllocated" :min="0" :controls="false" addon-before="年度折算" style="width: 100%" />
            <a-input-number v-model:value="recurringForm.durableCostAllocated" :min="0" :controls="false" addon-before="耐用摊销" style="width: 100%" />
          </template>
          <a-textarea v-model:value="recurringForm.note" class="full-span" placeholder="备注" :rows="2" />
          <div class="full-span metric-note">当月自动结余：{{ formatCurrency(recurringSurplus) }}</div>
        </template>
      </div>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  applyOneTimeCashflowToAssets,
  calculateAnnualBudgetExpense,
  calculateMonthlyFixedExpense,
  calculateMonthlySurplus,
  calculateSalaryIncomeEstimate,
  getProvidentFundBaseCap,
  providentFundCities,
} from '../domain/calculations'
import {
  assetCategoryOptions,
  assetTypeLabel,
  assetTypeOptions,
  cashflowKindLabel,
  liabilityTypeLabel,
  liabilityTypeOptions,
  recurringCashflowKind,
  type CashflowKind,
} from '../domain/display'
import type {
  AppDataPackage,
  Asset,
  AssetCategory,
  Budget,
  FixedExpenseCategory,
  FixedExpenseItem,
  Liability,
  OneTimeCashflow,
  ProvidentFundCity,
  RecurringCashflow,
  SalaryIncomeInput,
} from '../domain/types'
import { createId, formatCurrency, monthNow } from '../utils/format'

const props = defineProps<{ data: AppDataPackage }>()
const emit = defineEmits<{ save: [data: AppDataPackage] }>()

const section = ref<'assets' | 'budgets' | 'cashflows'>('assets')
const sectionOptions = [
  { label: '资产负债', value: 'assets' },
  { label: '预算', value: 'budgets' },
  { label: '现金流', value: 'cashflows' },
]
const assetSection = ref<'assets' | 'liabilities' | 'durables'>('assets')
const assetSectionOptions = [
  { label: '资产', value: 'assets' },
  { label: '负债', value: 'liabilities' },
  { label: '耐用消费品', value: 'durables' },
]

const assetTypeSelectOptions = assetTypeOptions()
const assetCategorySelectOptions = assetCategoryOptions()
const liabilityTypeSelectOptions = liabilityTypeOptions()
const providentFundCityOptions = providentFundCities.map((value) => ({ value, label: value }))
const cashflowKindOptions: { value: CashflowKind; label: string }[] = [
  { value: 'salary', label: cashflowKindLabel('salary') },
  { value: 'passive_income', label: cashflowKindLabel('passive_income') },
  { value: 'expense', label: cashflowKindLabel('expense') },
  { value: 'one_time_income', label: cashflowKindLabel('one_time_income') },
]
const fixedExpenseCategories: FixedExpenseCategory[] = ['rent_mortgage', 'dining', 'utilities', 'transport', 'pocket_money', 'custom']

const editingAssetId = ref<string>()
const editingLiabilityId = ref<string>()
const editingRecurringId = ref<string>()
const assetModalOpen = ref(false)
const liabilityModalOpen = ref(false)
const cashflowModalOpen = ref(false)
const cashflowFormKind = ref<CashflowKind>('salary')
const budgetDrafts = ref<Budget[]>(normalizeBudgetDrafts(props.data.budgets))

const assetForm = reactive({
  name: '',
  type: 'fund' as Asset['type'],
  assetCategory: 'income_generating' as AssetCategory,
  amount: 0,
  isLocked: false,
  reservedAmount: 0,
  annualCashflow: 0,
})
const liabilityForm = reactive({
  name: '',
  type: 'mortgage' as Liability['type'],
  balance: 0,
  monthlyPayment: 0,
  annualInterestRate: 0,
})
const recurringForm = reactive({
  name: '工资',
  startMonth: monthNow(),
  endMonth: '',
  activeIncome: 0,
  salaryInput: defaultSalaryInput(),
  passiveIncome: 0,
  fixedExpense: 0,
  dailyExpense: 0,
  familyExpense: 0,
  annualExpenseAllocated: 0,
  durableCostAllocated: 0,
  note: '',
})
const oneTimeForm = reactive({
  month: monthNow(),
  assetName: '',
  assetType: 'fund' as Asset['type'],
  amount: 0,
  note: '',
})

watch(
  () => props.data.budgets,
  (budgets) => {
    budgetDrafts.value = normalizeBudgetDrafts(budgets)
  },
)

const displayAssets = computed(() => props.data.assets.filter((asset) => (asset.assetCategory ?? 'income_generating') !== 'durable'))
const durableAssets = computed(() => props.data.assets.filter((asset) => asset.assetCategory === 'durable'))
const assetTotal = computed(() => sum(displayAssets.value.map((asset) => asset.amount)))
const assetAnnualCashflow = computed(() => sum(displayAssets.value.map((asset) => asset.annualCashflow ?? 0)))
const liabilityTotal = computed(() => sum(props.data.liabilities.map((liability) => liability.balance)))
const liabilityMonthlyPayment = computed(() => sum(props.data.liabilities.map((liability) => liability.monthlyPayment ?? 0)))
const durableTotal = computed(() => sum(durableAssets.value.map((asset) => asset.amount)))
const cashflowRows = computed(() => [
  ...props.data.recurringCashflows.map((cashflow) => {
    const kind = recurringCashflowKind(cashflow)
    return {
      id: `recurring-${cashflow.id}`,
      kind,
      title: cashflow.name,
      description: `${cashflow.startMonth} 起 · 当月结余 ${formatCurrency(calculateRecurringSurplus(cashflow))}`,
      amount: calculateRecurringSurplus(cashflow),
      source: cashflow,
    }
  }),
  ...props.data.oneTimeCashflows
    .map((cashflow) => ({
      id: `one-time-${cashflow.id}`,
      kind: 'one_time_income' as const,
      title: cashflow.assetName,
      description: `${cashflow.month} · ${cashflow.note || '一次性收入'}`,
      amount: cashflow.amount,
      source: cashflow,
    }))
    .sort((a, b) => b.description.localeCompare(a.description)),
])
const salaryEstimate = computed(() => calculateSalaryIncomeEstimate(recurringForm.salaryInput))
const monthlyTakeHomeIncome = computed(() => Math.round(salaryEstimate.value.monthlyTakeHomeIncome))
const providentFundRatePercent = computed({
  get: () => Math.round(recurringForm.salaryInput.providentFundRate * 1000) / 10,
  set: (value: number) => {
    recurringForm.salaryInput.providentFundRate = value / 100
  },
})
const recurringSurplus = computed(() =>
  calculateRecurringSurplus({
    id: '',
    ...clone(recurringForm),
    activeIncome: cashflowFormKind.value === 'salary' ? monthlyTakeHomeIncome.value : 0,
    salaryInput: cashflowFormKind.value === 'salary' ? clone(recurringForm.salaryInput) : undefined,
    passiveIncome: cashflowFormKind.value === 'passive_income' ? recurringForm.passiveIncome : 0,
    fixedExpense: cashflowFormKind.value === 'expense' ? recurringForm.fixedExpense : 0,
    dailyExpense: cashflowFormKind.value === 'expense' ? recurringForm.dailyExpense : 0,
    familyExpense: cashflowFormKind.value === 'expense' ? recurringForm.familyExpense : 0,
    annualExpenseAllocated: cashflowFormKind.value === 'expense' ? recurringForm.annualExpenseAllocated : 0,
    durableCostAllocated: cashflowFormKind.value === 'expense' ? recurringForm.durableCostAllocated : 0,
  }),
)

function annualBudget(budget: Budget): number {
  return calculateAnnualBudgetExpense(budget)
}

function monthlyFixedExpense(budget: Budget): number {
  return calculateMonthlyFixedExpense(budget)
}

function openNewAsset(category: AssetCategory) {
  resetAssetForm()
  assetForm.assetCategory = category
  if (category === 'durable') {
    assetForm.type = 'other'
  }
  assetModalOpen.value = true
}

function saveAsset() {
  if (!assetForm.name.trim()) return
  const isIncomeGenerating = assetForm.assetCategory === 'income_generating'
  const asset: Asset = {
    id: editingAssetId.value ?? createId('asset'),
    name: assetForm.name.trim(),
    type: assetForm.type,
    assetCategory: assetForm.assetCategory,
    amount: assetForm.amount,
    isDisposable: isIncomeGenerating ? !assetForm.isLocked : false,
    isLocked: isIncomeGenerating ? assetForm.isLocked : false,
    reservedAmount: isIncomeGenerating ? assetForm.reservedAmount : 0,
    annualCashflow: isIncomeGenerating ? assetForm.annualCashflow : 0,
    updatedAt: new Date().toISOString(),
  }
  emit('save', { ...props.data, assets: upsert(props.data.assets, asset) })
  assetModalOpen.value = false
  resetAssetForm()
}

function editAsset(asset: Asset) {
  editingAssetId.value = asset.id
  Object.assign(assetForm, {
    name: asset.name,
    type: asset.type,
    assetCategory: asset.assetCategory ?? 'income_generating',
    amount: asset.amount,
    isLocked: asset.isLocked,
    reservedAmount: asset.reservedAmount ?? 0,
    annualCashflow: asset.annualCashflow ?? 0,
  })
  assetModalOpen.value = true
}

function removeAsset(id: string) {
  emit('save', { ...props.data, assets: props.data.assets.filter((asset) => asset.id !== id) })
}

function resetAssetForm() {
  editingAssetId.value = undefined
  Object.assign(assetForm, { name: '', type: 'fund', assetCategory: 'income_generating', amount: 0, isLocked: false, reservedAmount: 0, annualCashflow: 0 })
}

function openNewLiability() {
  resetLiabilityForm()
  liabilityModalOpen.value = true
}

function saveLiability() {
  if (!liabilityForm.name.trim()) return
  const liability: Liability = {
    id: editingLiabilityId.value ?? createId('liability'),
    name: liabilityForm.name.trim(),
    type: liabilityForm.type,
    balance: liabilityForm.balance,
    monthlyPayment: liabilityForm.monthlyPayment,
    annualInterestRate: liabilityForm.annualInterestRate / 100,
    updatedAt: new Date().toISOString(),
  }
  emit('save', { ...props.data, liabilities: upsert(props.data.liabilities, liability) })
  liabilityModalOpen.value = false
  resetLiabilityForm()
}

function editLiability(liability: Liability) {
  editingLiabilityId.value = liability.id
  Object.assign(liabilityForm, {
    name: liability.name,
    type: liability.type,
    balance: liability.balance,
    monthlyPayment: liability.monthlyPayment ?? 0,
    annualInterestRate: (liability.annualInterestRate ?? 0) * 100,
  })
  liabilityModalOpen.value = true
}

function removeLiability(id: string) {
  emit('save', { ...props.data, liabilities: props.data.liabilities.filter((liability) => liability.id !== id) })
}

function resetLiabilityForm() {
  editingLiabilityId.value = undefined
  Object.assign(liabilityForm, { name: '', type: 'mortgage', balance: 0, monthlyPayment: 0, annualInterestRate: 0 })
}

function saveBudgets() {
  emit('save', { ...props.data, budgets: budgetDrafts.value.map((budget) => normalizeBudgetForSave(budget)) })
}

function addCustomBudgetItem(budget: Budget) {
  budget.fixedExpenseItems.push({ id: createId('budget-item'), category: 'custom', name: '', amount: 0 })
}

function removeBudgetItem(budget: Budget, id: string) {
  budget.fixedExpenseItems = budget.fixedExpenseItems.filter((item) => item.id !== id)
}

function openNewCashflow() {
  resetRecurringForm()
  resetOneTimeForm()
  cashflowFormKind.value = 'salary'
  cashflowModalOpen.value = true
}

function saveCashflow() {
  if (cashflowFormKind.value === 'one_time_income') {
    saveOneTimeCashflow()
    return
  }
  saveRecurringCashflow()
}

function saveRecurringCashflow() {
  if (!recurringForm.name.trim() || !/^\d{4}-\d{2}$/.test(recurringForm.startMonth)) return
  if (recurringForm.endMonth && !/^\d{4}-\d{2}$/.test(recurringForm.endMonth)) return
  const isSalary = cashflowFormKind.value === 'salary'
  const isPassive = cashflowFormKind.value === 'passive_income'
  const isExpense = cashflowFormKind.value === 'expense'
  const cashflow: RecurringCashflow = {
    id: editingRecurringId.value ?? createId('recurring'),
    name: recurringForm.name.trim(),
    startMonth: recurringForm.startMonth,
    endMonth: recurringForm.endMonth || undefined,
    activeIncome: isSalary ? monthlyTakeHomeIncome.value : 0,
    salaryInput: isSalary ? clone(recurringForm.salaryInput) : undefined,
    passiveIncome: isPassive ? recurringForm.passiveIncome : 0,
    fixedExpense: isExpense ? recurringForm.fixedExpense : 0,
    dailyExpense: isExpense ? recurringForm.dailyExpense : 0,
    familyExpense: isExpense ? recurringForm.familyExpense : 0,
    annualExpenseAllocated: isExpense ? recurringForm.annualExpenseAllocated : 0,
    durableCostAllocated: isExpense ? recurringForm.durableCostAllocated : 0,
    note: recurringForm.note,
  }
  emit('save', { ...props.data, recurringCashflows: upsert(props.data.recurringCashflows, cashflow) })
  cashflowModalOpen.value = false
  resetRecurringForm()
}

function editRecurringCashflow(cashflow: RecurringCashflow) {
  editingRecurringId.value = cashflow.id
  cashflowFormKind.value = recurringCashflowKind(cashflow)
  Object.assign(recurringForm, {
    ...clone(cashflow),
    endMonth: cashflow.endMonth ?? '',
    salaryInput: cashflow.salaryInput ? clone(cashflow.salaryInput) : defaultSalaryInput(cashflow.activeIncome),
  })
  cashflowModalOpen.value = true
}

function removeRecurringCashflow(id: string) {
  emit('save', { ...props.data, recurringCashflows: props.data.recurringCashflows.filter((cashflow) => cashflow.id !== id) })
}

function resetRecurringForm() {
  editingRecurringId.value = undefined
  Object.assign(recurringForm, {
    name: '工资',
    startMonth: monthNow(),
    endMonth: '',
    activeIncome: 0,
    salaryInput: defaultSalaryInput(),
    passiveIncome: 0,
    fixedExpense: 0,
    dailyExpense: 0,
    familyExpense: 0,
    annualExpenseAllocated: 0,
    durableCostAllocated: 0,
    note: '',
  })
}

function syncProvidentFundBaseCap(city: ProvidentFundCity) {
  recurringForm.salaryInput.providentFundBaseCap = getProvidentFundBaseCap(city)
}

function saveOneTimeCashflow() {
  if (!/^\d{4}-\d{2}$/.test(oneTimeForm.month) || !oneTimeForm.assetName.trim() || oneTimeForm.amount <= 0) return
  const cashflow: OneTimeCashflow = {
    id: createId('one-time'),
    month: oneTimeForm.month,
    assetName: oneTimeForm.assetName.trim(),
    assetType: oneTimeForm.assetType,
    amount: oneTimeForm.amount,
    note: oneTimeForm.note,
  }
  emit('save', {
    ...props.data,
    oneTimeCashflows: [...props.data.oneTimeCashflows, cashflow],
    assets: applyOneTimeCashflowToAssets(props.data.assets, cashflow),
  })
  cashflowModalOpen.value = false
  resetOneTimeForm()
}

function resetOneTimeForm() {
  Object.assign(oneTimeForm, {
    month: monthNow(),
    assetName: '',
    assetType: 'fund',
    amount: 0,
    note: '',
  })
}

function calculateRecurringSurplus(cashflow: RecurringCashflow): number {
  return calculateMonthlySurplus({
    id: cashflow.id,
    month: monthNow(),
    activeIncome: cashflow.salaryInput ? Math.round(calculateSalaryIncomeEstimate(cashflow.salaryInput).monthlyTakeHomeIncome) : cashflow.activeIncome,
    passiveIncome: cashflow.passiveIncome,
    fixedExpense: cashflow.fixedExpense,
    dailyExpense: cashflow.dailyExpense,
    familyExpense: cashflow.familyExpense,
    annualExpenseAllocated: cashflow.annualExpenseAllocated,
    durableCostAllocated: cashflow.durableCostAllocated,
    note: cashflow.note,
  })
}

function defaultSalaryInput(monthlySalary = 0): SalaryIncomeInput {
  return {
    monthlySalary,
    annualBonusMonths: 0,
    providentFundRate: 0.12,
    providentFundBaseCap: getProvidentFundBaseCap('上海'),
    providentFundCity: '上海',
  }
}

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  return items.some((item) => item.id === next.id) ? items.map((item) => (item.id === next.id ? next : item)) : [...items, next]
}

function normalizeBudgetDrafts(budgets: Budget[]): Budget[] {
  return budgets.map((budget) => normalizeBudgetForSave(budget))
}

function normalizeBudgetForSave(budget: Budget): Budget {
  const next = clone(budget)
  const fixedExpenseItems = next.fixedExpenseItems.length > 0 ? next.fixedExpenseItems : legacyBudgetItems(next)
  next.fixedExpenseMode = 'items'
  next.fixedExpenseItems = normalizeFixedExpenseItems(fixedExpenseItems)
  next.monthlyFixed = calculateMonthlyFixedExpense(next)
  next.monthlyDaily = 0
  next.monthlyFamily = 0
  next.monthlyDurableCost = 0
  return next
}

function normalizeFixedExpenseItems(items: FixedExpenseItem[] = []): FixedExpenseItem[] {
  return items.map((item, index) => ({
    id: item.id || createId('budget-item'),
    category: fixedExpenseCategories.includes(item.category) ? item.category : 'custom',
    name: item.name?.trim() || `自定义项 ${index + 1}`,
    amount: Number(item.amount ?? 0),
  }))
}

function legacyBudgetItems(budget: Budget): FixedExpenseItem[] {
  return [
    legacyBudgetItem('legacy-fixed', '固定支出', budget.monthlyFixed),
    legacyBudgetItem('legacy-daily', '日常', budget.monthlyDaily),
    legacyBudgetItem('legacy-family', '家庭', budget.monthlyFamily),
    legacyBudgetItem('legacy-durable', '耐用消费', budget.monthlyDurableCost),
  ].filter((item): item is FixedExpenseItem => Boolean(item))
}

function legacyBudgetItem(id: string, name: string, amount: number): FixedExpenseItem | undefined {
  return amount > 0 ? { id, category: 'custom', name, amount } : undefined
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}
</script>
