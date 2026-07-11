<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">录入</h1>
        <p class="page-subtitle">每月维护一次：资产、预算、收入。</p>
      </div>
    </header>

    <div class="segment-wrap">
      <a-segmented v-model:value="section" :options="sectionOptions" block />
    </div>

    <section v-if="section === 'assets'" class="page">
      <div class="segment-wrap subtab-wrap">
        <a-segmented v-model:value="assetSection" :options="assetSectionOptions" block />
      </div>

      <template v-if="assetSection === 'assets'">
      <div class="panel asset-category-panel">
        <button class="asset-category-heading row-button" type="button" @click="toggleAssetCategory('income_generating')">
          <div>
            <div class="section-label">收益性资产</div>
            <div class="section-title">产生收益并参与推演</div>
          </div>
          <span class="collapse-label">{{ isAssetCategoryExpanded('income_generating') ? '收起' : '展开' }}</span>
        </button>
        <div class="asset-summary">
          <div>
            <span>资产金额</span>
            <strong>{{ formatCurrency(incomeAssetTotal) }}</strong>
          </div>
          <div>
            <span>年资产收益</span>
            <strong>{{ formatCurrency(incomeAssetAnnualCashflow) }}</strong>
          </div>
          <div>
            <span>条目</span>
            <strong>{{ incomeAssets.length }}</strong>
          </div>
        </div>
        <div v-if="isAssetCategoryExpanded('income_generating')" class="asset-category-details">
          <div v-if="incomeAssets.length === 0" class="empty-state">还没有收益性资产。</div>
          <button v-for="asset in incomeAssets" :key="asset.id" class="asset-row row-button" type="button" @click="editAsset(asset)">
            <span class="asset-mark income" />
            <div class="row-main">
              <div class="row-title">{{ asset.name }}</div>
              <div class="row-description">
                {{ assetTypeLabel(asset.type) }} · {{ asset.isLocked ? '不可动用' : '可动用' }} · 年化 {{ formatPercent(asset.annualYieldRate ?? 0, 2) }} · 年收益 {{ formatCurrency(assetAnnualIncome(asset)) }}
              </div>
            </div>
            <div class="row-side">{{ formatCurrency(asset.amount) }}</div>
          </button>
          <button class="primary-add-row" type="button" @click="openNewAsset('income_generating')">+ 新增收益性资产</button>
        </div>
      </div>

      <div class="panel asset-category-panel">
        <button class="asset-category-heading row-button" type="button" @click="toggleAssetCategory('non_income')">
          <div>
            <div class="section-label">非收益性资产</div>
            <div class="section-title">不产生收益, 只统计可变现金额</div>
          </div>
          <span class="collapse-label">{{ isAssetCategoryExpanded('non_income') ? '收起' : '展开' }}</span>
        </button>
        <div class="asset-summary non-income">
          <div>
            <span>资产金额</span>
            <strong>{{ formatCurrency(nonIncomeAssetTotal) }}</strong>
          </div>
          <div>
            <span>条目</span>
            <strong>{{ nonIncomeAssets.length }}</strong>
          </div>
        </div>
        <div v-if="isAssetCategoryExpanded('non_income')" class="asset-category-details">
          <div v-if="nonIncomeAssets.length === 0" class="empty-state">还没有非收益性资产。</div>
          <button v-for="asset in nonIncomeAssets" :key="asset.id" class="asset-row row-button" type="button" @click="editAsset(asset)">
            <span class="asset-mark non-income" />
            <div class="row-main">
              <div class="row-title">{{ asset.name }}</div>
              <div class="row-description">{{ assetTypeLabel(asset.type) }} · 不计入资产收益</div>
            </div>
            <div class="row-side">{{ formatCurrency(asset.amount) }}</div>
          </button>
          <button class="primary-add-row" type="button" @click="openNewAsset('non_income')">+ 新增非收益性资产</button>
        </div>
      </div>
      </template>

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
            <div class="row-title"><span class="tag">{{ assetCategoryLabel(asset.assetCategory) }}</span>{{ asset.name }}</div>
            <div class="row-description">{{ assetTypeLabel(asset.type) }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(asset.amount) }}</div>
        </button>
        <button class="primary-add-row" type="button" @click="openNewAsset('durable')">+ 新增耐用消费品</button>
      </div>
    </section>

    <section v-else-if="section === 'budgets'" class="page">
      <div v-for="budget in budgetDrafts" :key="budget.level" class="panel">
        <button class="budget-summary-row row-button" type="button" @click="toggleBudgetDetails(budget.level)">
          <div class="row-main">
            <div class="section-label">{{ budget.name }}</div>
            <div class="row-title">月总支出</div>
            <div class="row-description">年预算支出 {{ formatCurrency(annualBudget(budget)) }} · {{ isBudgetExpanded(budget.level) ? '收起明细' : '点击展开明细' }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(monthlyFixedExpense(budget)) }}</div>
        </button>
        <div v-if="isBudgetExpanded(budget.level)" class="form-grid budget-detail">
          <div v-for="item in budget.fixedExpenseItems" :key="item.id" class="budget-item-row full-span">
            <a-input v-model:value="item.name" placeholder="预算项" />
            <a-input-number v-model:value="item.amount" :min="0" :controls="false" placeholder="金额" style="width: 100%" />
            <a-button size="small" danger @click="removeBudgetItem(budget, item.id)">删除</a-button>
          </div>
          <a-button class="full-span" @click="addCustomBudgetItem(budget)">+ 新增自定义项</a-button>
          <a-input-number v-model:value="budget.annualLargeExpense" :min="0" :controls="false" addon-before="年度大额" style="width: 100%" />
          <a-input-number v-model:value="budget.annualReserve" :min="0" :controls="false" addon-before="年度预留" style="width: 100%" />
        </div>
      </div>
      <div class="sticky-actions">
        <a-button type="primary" block @click="saveBudgets">保存三档预算</a-button>
      </div>
    </section>

    <section v-else class="page">
      <div class="panel">
        <div class="section-label">收入来源</div>
        <button class="list-row row-button" type="button" @click="editSalaryCashflow">
          <div class="row-main">
            <div class="row-title"><span class="tag">工资</span>工资</div>
            <div class="row-description">固定收入项 · 金额为 0 时不计入推演</div>
          </div>
          <div class="row-side">{{ formatCurrency(salaryRowAmount) }}</div>
        </button>
        <button v-for="row in cashflowRows" :key="row.id" class="list-row row-button" type="button" @click="row.kind === 'one_time_income' ? undefined : editRecurringCashflow(row.source as RecurringCashflow)">
          <div class="row-main">
            <div class="row-title"><span class="tag">{{ cashflowKindLabel(row.kind) }}</span>{{ row.title }}</div>
            <div class="row-description">{{ row.description }}</div>
          </div>
          <div class="row-side">{{ formatCurrency(row.amount) }}</div>
        </button>
        <button class="list-row add-row" type="button" @click="openNewCashflow">+ 添加自定义收入</button>
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
          <a-input-number v-model:value="assetForm.annualYieldRate" :min="0" :step="0.01" :precision="2" :controls="false" addon-before="年化收益率" addon-after="%" style="width: 100%" />
          <div class="full-span metric-note">自动年收益：{{ formatCurrency(assetFormAnnualIncome) }}</div>
          <a-checkbox v-model:checked="assetForm.isLocked">不可动用</a-checkbox>
        </template>
      </div>
      <a-popconfirm v-if="editingAssetId" title="确认删除这个资产？" ok-text="删除" cancel-text="取消" @confirm="removeAsset(editingAssetId)">
        <a-button danger block class="modal-danger-action">删除资产</a-button>
      </a-popconfirm>
    </a-modal>

    <a-modal v-model:open="cashflowModalOpen" :title="editingSalary ? '编辑工资' : editingRecurringId ? '编辑收入' : '新增收入'" ok-text="保存" cancel-text="取消" @ok="saveCashflow">
      <div class="form-grid modal-form">
        <a-select v-if="!editingSalary" v-model:value="cashflowFormKind" class="full-span" :options="cashflowKindOptions" :disabled="Boolean(editingRecurringId)" />
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
            <a-select v-model:value="recurringForm.salaryInput.providentFundCity" :options="providentFundCityOptions" @change="syncProvidentFundBaseCap" />
            <a-input-number v-model:value="recurringForm.salaryInput.providentFundBaseCap" class="full-span" :min="0" :controls="false" addon-before="公积金基数上限" style="width: 100%" />
            <a-input-number v-model:value="providentFundRatePercent" :min="0" :max="100" :step="0.5" :controls="false" addon-before="公积金" addon-after="%" style="width: 100%" />
            <div class="full-span metric-note">年终奖金额和对应支出通常有波动，默认不计入持续现金流与预算推演；实际到账后可作为一次性收入单独录入。</div>
          </template>
          <a-input-number v-if="cashflowFormKind === 'passive_income'" v-model:value="recurringForm.passiveIncome" class="full-span" :min="0" :controls="false" addon-before="每月收入" style="width: 100%" />
          <a-textarea v-model:value="recurringForm.note" class="full-span" placeholder="备注" :rows="2" />
          <template v-if="cashflowFormKind === 'salary'">
            <div class="full-span summary-strip compact-summary">
              <div>
                <span>本月税后</span>
                <strong>{{ formatCurrency(salaryEstimate.monthlyTakeHomeIncome) }}</strong>
              </div>
              <div>
                <span>本月个税</span>
                <strong>{{ formatCurrency(salaryEstimate.monthlyIncomeTax) }}</strong>
              </div>
              <div>
                <span>公积金入账</span>
                <strong>{{ formatCurrency(salaryEstimate.monthlyProvidentFundIncome) }}</strong>
              </div>
            </div>
            <div class="full-span metric-note">月收入和预算推演包含税后工资与个人、单位双方公积金；资产入账时，税后工资加入“现金余额”，公积金加入“公积金余额”。</div>
          </template>
          <div class="full-span metric-note">当月自动结余：{{ formatCurrency(recurringSurplus) }}</div>
        </template>
      </div>
      <a-popconfirm v-if="editingRecurringId && !editingSalary" title="确认删除这个自定义收入？" ok-text="删除" cancel-text="取消" @confirm="removeRecurringCashflow(editingRecurringId)">
        <a-button danger block class="modal-danger-action">删除收入</a-button>
      </a-popconfirm>
    </a-modal>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import {
  applyOneTimeCashflowToAssets,
  applyRecurringSalaryIncomeToAssets,
  calculateAssetAnnualIncome,
  calculateAnnualBudgetExpense,
  calculateMonthlyFixedExpense,
  calculateMonthlySurplus,
  calculateSalaryIncomeEstimate,
  getProvidentFundBaseCap,
  providentFundCities,
} from '../domain/calculations'
import { addDefaultPresetRowsToLegacySingleItemBudget, fixedExpenseCategories, normalizeFixedExpenseCategory } from '../domain/budgetPresets'
import {
  assetCategoryLabel,
  assetCategoryOptions,
  assetTypeLabel,
  assetTypeOptions,
  cashflowKindLabel,
  recurringCashflowKind,
  type CashflowKind,
} from '../domain/display'
import type {
  AppDataPackage,
  AnnualBonusInput,
  Asset,
  AssetCategory,
  Budget,
  BudgetLevel,
  FixedExpenseItem,
  OneTimeCashflow,
  ProvidentFundCity,
  RecurringCashflow,
  SalaryIncomeInput,
} from '../domain/types'
import { createId, formatCurrency, formatPercent, monthNow } from '../utils/format'

const props = defineProps<{ data: AppDataPackage }>()
const emit = defineEmits<{ save: [data: AppDataPackage] }>()

const section = ref<'assets' | 'budgets' | 'cashflows'>('assets')
const sectionOptions = [
  { label: '资产', value: 'assets' },
  { label: '预算', value: 'budgets' },
  { label: '收入', value: 'cashflows' },
]
const assetSection = ref<'assets' | 'durables'>('assets')
const assetSectionOptions = [
  { label: '收益 / 非收益资产', value: 'assets' },
  { label: '耐用消费品', value: 'durables' },
]

const assetTypeSelectOptions = assetTypeOptions()
const assetCategorySelectOptions = assetCategoryOptions()
const providentFundCityOptions = providentFundCities.map((value) => ({ value, label: value }))
const cashflowKindOptions: { value: CashflowKind; label: string }[] = [
  { value: 'passive_income', label: cashflowKindLabel('passive_income') },
  { value: 'one_time_income', label: cashflowKindLabel('one_time_income') },
]
const editingAssetId = ref<string>()
const editingRecurringId = ref<string>()
const assetModalOpen = ref(false)
const cashflowModalOpen = ref(false)
const cashflowFormKind = ref<CashflowKind>('salary')
const editingSalary = ref(false)
const budgetDrafts = ref<Budget[]>(normalizeBudgetDrafts(props.data.budgets))
const expandedBudgetLevels = ref<BudgetLevel[]>([])
const expandedAssetCategories = ref<AssetCategory[]>(['income_generating', 'non_income'])

const assetForm = reactive({
  name: '',
  type: 'fund' as Asset['type'],
  assetCategory: 'income_generating' as AssetCategory,
  amount: 0,
  isLocked: false,
  reservedAmount: 0,
  annualYieldRate: 0,
})
const recurringForm = reactive({
  name: '工资',
  startMonth: monthNow(),
  endMonth: '',
  activeIncome: 0,
  salaryInput: defaultSalaryInput(),
  lastSalaryAssetMonth: undefined as string | undefined,
  annualBonusInput: defaultAnnualBonusInput(),
  lastBonusAssetYear: undefined as number | undefined,
  passiveIncome: 0,
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

const incomeAssets = computed(() => props.data.assets.filter((asset) => (asset.assetCategory ?? 'income_generating') === 'income_generating'))
const nonIncomeAssets = computed(() => props.data.assets.filter((asset) => asset.assetCategory === 'non_income'))
const durableAssets = computed(() => props.data.assets.filter((asset) => asset.assetCategory === 'durable'))
const incomeAssetTotal = computed(() => sum(incomeAssets.value.map((asset) => asset.amount)))
const incomeAssetAnnualCashflow = computed(() => sum(incomeAssets.value.map((asset) => calculateAssetAnnualIncome(asset))))
const nonIncomeAssetTotal = computed(() => sum(nonIncomeAssets.value.map((asset) => asset.amount)))
const durableTotal = computed(() => sum(durableAssets.value.map((asset) => asset.amount)))
const salaryCashflow = computed(() => props.data.recurringCashflows.find((cashflow) => recurringCashflowKind(cashflow) === 'salary'))
const salaryRowAmount = computed(() => salaryCashflow.value ? calculateRecurringSurplus(salaryCashflow.value) : 0)
const cashflowRows = computed(() => [
  ...props.data.recurringCashflows.filter((cashflow) => recurringCashflowKind(cashflow) !== 'salary').map((cashflow) => {
    const kind = recurringCashflowKind(cashflow)
    return {
      id: `recurring-${cashflow.id}`,
      kind,
      title: cashflow.name,
      description: cashflowRowDescription(cashflow),
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
    annualBonusInput: cashflowFormKind.value === 'salary' ? clone(recurringForm.annualBonusInput) : undefined,
    passiveIncome: cashflowFormKind.value === 'passive_income' ? recurringForm.passiveIncome : 0,
  }),
)
const assetFormAnnualIncome = computed(() => (assetForm.assetCategory === 'income_generating' ? assetForm.amount * (assetForm.annualYieldRate / 100) : 0))

function annualBudget(budget: Budget): number {
  return calculateAnnualBudgetExpense(budget)
}

function monthlyFixedExpense(budget: Budget): number {
  return calculateMonthlyFixedExpense(budget)
}

function assetAnnualIncome(asset: Asset): number {
  return calculateAssetAnnualIncome(asset)
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
    annualYieldRate: isIncomeGenerating ? assetForm.annualYieldRate / 100 : 0,
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
    annualYieldRate: (asset.annualYieldRate ?? 0) * 100,
  })
  assetModalOpen.value = true
}

function removeAsset(id: string) {
  emit('save', { ...props.data, assets: props.data.assets.filter((asset) => asset.id !== id) })
  assetModalOpen.value = false
  resetAssetForm()
}

function resetAssetForm() {
  editingAssetId.value = undefined
  Object.assign(assetForm, { name: '', type: 'fund', assetCategory: 'income_generating', amount: 0, isLocked: false, reservedAmount: 0, annualYieldRate: 0 })
}

function toggleAssetCategory(category: AssetCategory) {
  expandedAssetCategories.value = isAssetCategoryExpanded(category)
    ? expandedAssetCategories.value.filter((item) => item !== category)
    : [...expandedAssetCategories.value, category]
}

function isAssetCategoryExpanded(category: AssetCategory): boolean {
  return expandedAssetCategories.value.includes(category)
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

function toggleBudgetDetails(level: BudgetLevel) {
  if (!isBudgetExpanded(level)) {
    const budget = budgetDrafts.value.find((item) => item.level === level)
    if (budget) {
      budget.fixedExpenseItems = addDefaultPresetRowsToLegacySingleItemBudget(budget.fixedExpenseItems)
    }
  }
  expandedBudgetLevels.value = isBudgetExpanded(level)
    ? expandedBudgetLevels.value.filter((item) => item !== level)
    : [...expandedBudgetLevels.value, level]
}

function isBudgetExpanded(level: BudgetLevel): boolean {
  return expandedBudgetLevels.value.includes(level)
}

function openNewCashflow() {
  resetRecurringForm()
  resetOneTimeForm()
  cashflowFormKind.value = 'passive_income'
  recurringForm.name = ''
  cashflowModalOpen.value = true
}

function editSalaryCashflow() {
  editingSalary.value = true
  if (salaryCashflow.value) {
    editRecurringCashflow(salaryCashflow.value)
    editingSalary.value = true
    return
  }
  resetRecurringForm()
  editingSalary.value = true
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
  const cashflow: RecurringCashflow = {
    id: editingRecurringId.value ?? createId('recurring'),
    name: recurringForm.name.trim(),
    startMonth: recurringForm.startMonth,
    endMonth: recurringForm.endMonth || undefined,
    activeIncome: isSalary ? monthlyTakeHomeIncome.value : 0,
    salaryInput: isSalary ? clone(recurringForm.salaryInput) : undefined,
    lastSalaryAssetMonth: recurringForm.lastSalaryAssetMonth,
    annualBonusInput: undefined,
    lastBonusAssetYear: undefined,
    passiveIncome: isPassive ? recurringForm.passiveIncome : 0,
    note: recurringForm.note,
  }
  const salaryApplication = isSalary ? applyRecurringSalaryIncomeToAssets(props.data.assets, cashflow, monthNow()) : { assets: props.data.assets, cashflow }
  emit('save', {
    ...props.data,
    recurringCashflows: upsert(props.data.recurringCashflows, salaryApplication.cashflow),
    assets: salaryApplication.assets,
  })
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
    annualBonusInput: cashflow.annualBonusInput ? clone(cashflow.annualBonusInput) : defaultAnnualBonusInput(),
    lastBonusAssetYear: cashflow.lastBonusAssetYear,
  })
  cashflowModalOpen.value = true
}

function removeRecurringCashflow(id: string) {
  emit('save', { ...props.data, recurringCashflows: props.data.recurringCashflows.filter((cashflow) => cashflow.id !== id) })
  cashflowModalOpen.value = false
  resetRecurringForm()
}

function resetRecurringForm() {
  editingRecurringId.value = undefined
  editingSalary.value = false
  Object.assign(recurringForm, {
    name: '工资',
    startMonth: monthNow(),
    endMonth: '',
    activeIncome: 0,
    salaryInput: defaultSalaryInput(),
    lastSalaryAssetMonth: undefined,
    annualBonusInput: defaultAnnualBonusInput(),
    lastBonusAssetYear: undefined,
    passiveIncome: 0,
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
  const month = monthNow()
  return calculateMonthlySurplus({
    id: cashflow.id,
    month,
    activeIncome: calculateRecurringActiveIncome(cashflow, month),
    passiveIncome: cashflow.passiveIncome,
    note: cashflow.note,
  })
}

function cashflowRowDescription(cashflow: RecurringCashflow): string {
  return `${cashflow.startMonth} 起 · 每月收入 ${formatCurrency(calculateRecurringSurplus(cashflow))}`
}

function calculateRecurringActiveIncome(cashflow: RecurringCashflow, _month: string): number {
  if (!cashflow.salaryInput) return cashflow.activeIncome
  const estimate = calculateSalaryIncomeEstimate(cashflow.salaryInput)
  return Math.round(estimate.monthlyTakeHomeIncome + estimate.monthlyProvidentFundIncome)
}

function defaultSalaryInput(monthlySalary = 0): SalaryIncomeInput {
  return {
    monthlySalary,
    providentFundRate: 0.12,
    providentFundBaseCap: getProvidentFundBaseCap('上海'),
    providentFundCity: '上海',
  }
}

function defaultAnnualBonusInput(): AnnualBonusInput {
  return {
    enabled: false,
    payoutMonth: 12,
    amountMode: 'net',
    grossAmount: 0,
    netAmount: 0,
  }
}

function upsert<T extends { id: string }>(items: T[], next: T): T[] {
  return items.some((item) => item.id === next.id) ? items.map((item) => (item.id === next.id ? next : item)) : [...items, next]
}

function normalizeBudgetDrafts(budgets: Budget[]): Budget[] {
  return budgets.map((budget) => {
    const normalized = normalizeBudgetForSave(budget)
    return {
      ...normalized,
      fixedExpenseItems: addDefaultPresetRowsToLegacySingleItemBudget(normalized.fixedExpenseItems),
    }
  })
}

function normalizeBudgetForSave(budget: Budget): Budget {
  const next = clone(budget)
  const fixedExpenseItems = Array.isArray(next.fixedExpenseItems) ? next.fixedExpenseItems : legacyBudgetItems(next)
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
    category: normalizedBudgetCategory(item),
    name: item.name?.trim() || `自定义项 ${index + 1}`,
    amount: Number(item.amount ?? 0),
  }))
}

function normalizedBudgetCategory(item: FixedExpenseItem) {
  const category = normalizeFixedExpenseCategory(item.category, item.name)
  return fixedExpenseCategories.includes(category) ? category : 'custom'
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
