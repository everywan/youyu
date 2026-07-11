<template>
  <section class="app-screen page">
    <template v-if="phase === 'intro'">
      <header class="page-header onboarding-header">
        <div class="onboarding-brand">有余</div>
        <a-button v-if="introPage < introPages.length - 1" type="text" size="small" @click="startSetup">跳过介绍</a-button>
      </header>

      <section class="onboarding-card">
        <div class="onboarding-kicker">{{ introPage + 1 }} / {{ introPages.length }}</div>
        <h1 class="onboarding-title">{{ currentIntro.title }}</h1>
        <p v-if="currentIntro.lead" class="onboarding-lead">{{ currentIntro.lead }}</p>
        <p v-if="currentIntro.question" class="onboarding-question">{{ currentIntro.question }}</p>
        <ul v-if="currentIntro.items" class="onboarding-list">
          <li v-for="item in currentIntro.items" :key="item">{{ item }}</li>
        </ul>
        <div v-if="currentIntro.levels" class="freedom-levels">
          <div v-for="level in currentIntro.levels" :key="level.name">
            <strong>{{ level.name }}</strong>
            <span>{{ level.description }}</span>
          </div>
        </div>
        <div v-if="introPage === introPages.length - 1" class="privacy-note">
          财务数据优先保存在当前设备本地，无需上传银行卡流水，也不需要连接金融账户。
        </div>
      </section>

      <div class="onboarding-dots" aria-label="介绍进度">
        <span v-for="(_, index) in introPages" :key="index" :class="{ active: index === introPage }" />
      </div>

      <div class="sticky-actions onboarding-actions">
        <a-button v-if="introPage > 0" @click="introPage -= 1">上一页</a-button>
        <a-button type="primary" block @click="advanceIntro">
          {{ introPage === introPages.length - 1 ? '开始规划' : '下一页' }}
        </a-button>
      </div>
      <p class="onboarding-disclaimer">有余仅提供财务测算与规划工具，不构成任何投资建议。</p>
    </template>

    <template v-else>
      <header class="page-header">
      <div>
        <h1 class="page-title">先得到第一张仪表盘</h1>
          <p class="page-subtitle">录入当前财务结构，稍后也可以继续补充。</p>
      </div>
        <a-button size="small" @click="$emit('skip')">稍后填写</a-button>
      </header>

      <a-steps :current="step" size="small" :items="stepItems" />

    <section v-if="step === 0" class="panel">
      <div class="section-label">三档预算</div>
      <div class="metric-note onboarding-budget-note">请包含房贷月供、房租、保险等所有持续生活支出。</div>
      <div class="form-grid">
        <a-input-number v-model:value="budgetBasics.basic" :min="0" :controls="false" addon-before="基础/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.comfortable" :min="0" :controls="false" addon-before="舒适/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.ideal" :min="0" :controls="false" addon-before="理想/月" style="width: 100%" />
      </div>
    </section>

    <section v-else-if="step === 1" class="onboarding-finance-sections">
      <div class="panel">
        <div class="section-heading compact">
          <div><div class="section-label">资产</div><div class="section-title">资产金额与年化收益率</div></div>
        </div>
        <div class="onboarding-asset-group">
          <div class="section-heading compact">
            <div><div class="section-title">收益型资产</div><div class="metric-note">会按年化收益率计入自由推演</div></div>
            <a-button size="small" @click="addAssetRow('income_generating')">添加</a-button>
          </div>
          <div class="onboarding-row onboarding-row-heading"><span>资产</span><span>金额</span><span>年化</span><span /></div>
          <div v-for="asset in incomeAssetRows" :key="asset.id" class="onboarding-row">
            <a-input v-model:value="asset.name" />
            <a-input-number v-model:value="asset.amount" :min="0" :controls="false" style="width: 100%" />
            <a-input-number v-model:value="asset.annualYieldRatePercent" :min="0" :step="0.1" :controls="false" addon-after="%" style="width: 100%" />
            <a-button type="text" danger size="small" aria-label="删除资产" @click="removeAssetRow(asset.id)">删除</a-button>
          </div>
        </div>
        <div class="onboarding-asset-group">
          <div class="section-heading compact">
            <div><div class="section-title">非收益型资产</div><div class="metric-note">仅记录金额，不产生资产收益</div></div>
            <a-button size="small" @click="addAssetRow('non_income')">添加</a-button>
          </div>
          <div class="onboarding-row onboarding-row-heading non-income"><span>资产</span><span>金额</span><span /></div>
          <div v-if="nonIncomeAssetRows.length === 0" class="empty-state">可添加自住房等不产生收益的资产。</div>
          <div v-for="asset in nonIncomeAssetRows" :key="asset.id" class="onboarding-row non-income">
            <a-input v-model:value="asset.name" />
            <a-input-number v-model:value="asset.amount" :min="0" :controls="false" style="width: 100%" />
            <a-button type="text" danger size="small" aria-label="删除资产" @click="removeAssetRow(asset.id)">删除</a-button>
          </div>
        </div>
      </div>

      <div class="panel">
        <div class="section-label">货币贬值</div>
        <div class="section-title onboarding-field-title">推演会从资产收益率中扣除 CPI</div>
        <a-input-number v-model:value="inflationRatePercent" :min="0" :step="0.1" :controls="false" addon-before="CPI" addon-after="%" style="width: 100%" />
      </div>
    </section>

    <section v-else class="panel">
      <div class="section-label">持续性月收入</div>
      <div class="form-grid">
        <a-input-number v-model:value="monthlySalary" :min="0" :controls="false" addon-before="月工资" style="width: 100%" />
        <a-input-number v-model:value="providentFundRatePercent" :min="0" :max="100" :step="0.5" :controls="false" addon-before="公积金" addon-after="%" style="width: 100%" />
        <div v-for="income in customIncomeRows" :key="income.id" class="onboarding-custom-income full-span">
          <a-input v-model:value="income.name" placeholder="收入名称" />
          <a-input-number v-model:value="income.amount" :min="0" :controls="false" addon-after="元/月" style="width: 100%" />
          <a-button type="text" danger @click="removeCustomIncome(income.id)">删除</a-button>
        </div>
        <a-button class="full-span" @click="addCustomIncome">+ 添加自定义收入</a-button>
      </div>
      <div class="metric-note">工资为 0 时不会计入；预计每月计入推演：{{ formatCurrency(estimatedSalaryIncome + customIncomeTotal) }}</div>
    </section>

      <div class="sticky-actions">
        <a-button @click="goBack">上一步</a-button>
        <a-button type="primary" block @click="next">{{ step === 2 ? '生成我的推演' : '下一步' }}</a-button>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { createDefaultFixedExpenseItems } from '../domain/budgetPresets'
import { calculateSalaryIncomeEstimate, getProvidentFundBaseCap } from '../domain/calculations'
import type { AppDataPackage, Asset, AssetCategory } from '../domain/types'
import { createId, formatCurrency, monthNow } from '../utils/format'

const props = defineProps<{ data: AppDataPackage }>()
const emit = defineEmits<{
  complete: [data: AppDataPackage]
  skip: []
}>()

const phase = ref<'intro' | 'setup'>('intro')
const introPage = ref(0)
const step = ref(0)
const monthlySalary = ref(0)
const providentFundRatePercent = ref(12)
const customIncomeRows = reactive<{ id: string; name: string; amount: number }[]>([])
const inflationRatePercent = ref(1)
const budgetBasics = reactive({
  basic: 4_000,
  comfortable: 8_000,
  ideal: 12_000,
})

type OnboardingAssetRow = {
  id: string
  name: string
  type: Asset['type']
  assetCategory: AssetCategory
  amount: number
  annualYieldRatePercent: number
  core?: boolean
}

const assetRows = reactive<OnboardingAssetRow[]>([
  { id: 'onboarding-cash', name: '现金余额', type: 'cash', assetCategory: 'income_generating', amount: 0, annualYieldRatePercent: 1.5, core: true },
  { id: 'onboarding-provident', name: '公积金余额', type: 'deposit', assetCategory: 'income_generating', amount: 0, annualYieldRatePercent: 1, core: true },
  { id: 'onboarding-fund', name: '基金', type: 'fund', assetCategory: 'income_generating', amount: 0, annualYieldRatePercent: 4 },
  { id: 'onboarding-stock', name: '股票', type: 'stock', assetCategory: 'income_generating', amount: 0, annualYieldRatePercent: 4 },
])
const incomeAssetRows = computed(() => assetRows.filter((asset) => asset.assetCategory === 'income_generating'))
const nonIncomeAssetRows = computed(() => assetRows.filter((asset) => asset.assetCategory === 'non_income'))
const customIncomeTotal = computed(() => customIncomeRows.reduce((total, income) => total + income.amount, 0))
const salaryInput = computed(() => ({
  monthlySalary: monthlySalary.value,
  providentFundRate: providentFundRatePercent.value / 100,
  providentFundBaseCap: getProvidentFundBaseCap('上海'),
  providentFundCity: '上海' as const,
}))
const estimatedSalaryIncome = computed(() => {
  const estimate = calculateSalaryIncomeEstimate(salaryInput.value)
  return Math.round(estimate.monthlyTakeHomeIncome + estimate.monthlyProvidentFundIncome)
})

const stepItems = [{ title: '预算' }, { title: '资产' }, { title: '收入' }]

function addAssetRow(assetCategory: Exclude<AssetCategory, 'durable'>) {
  assetRows.push({ id: createId('onboarding-asset'), name: '', type: 'other', assetCategory, amount: 0, annualYieldRatePercent: 0 })
}

function removeAssetRow(id: string) {
  const index = assetRows.findIndex((asset) => asset.id === id)
  if (index >= 0) assetRows.splice(index, 1)
}

function addCustomIncome() {
  customIncomeRows.push({ id: createId('onboarding-income'), name: '', amount: 0 })
}

function removeCustomIncome(id: string) {
  const index = customIncomeRows.findIndex((income) => income.id === id)
  if (index >= 0) customIncomeRows.splice(index, 1)
}

const introPages = [
  {
    title: '按现在的节奏，多久能实现财务自由？',
    lead: '有余是一个个人财务自由规划仪表盘。它结合你现在的资产、收入、支出和生活预算，持续测算自由进度。',
    question: '如果保持当前的积累速度，你预计什么时候可以不再依赖工资覆盖生活？',
  },
  {
    title: '先用三档预算，定义你的自由',
    lead: '财务自由不是一个统一的金额。有余用资产每年产生的收益，判断它能否覆盖你选择的生活预算。',
    levels: [
      { name: '未自由', description: '资产收益还不能覆盖基础生活' },
      { name: '基础自由', description: '可以覆盖最低可接受的生活成本' },
      { name: '标准自由', description: '可以覆盖稳定、舒适的生活成本' },
      { name: '高级自由', description: '可以覆盖更理想的生活方式' },
    ],
  },
  {
    title: '每月维护一次，不用逐笔记账',
    lead: '有余关注长期财务结构。你只需要定期更新几类数据：',
    items: ['包含房贷、房租、保险在内的三档完整生活预算', '现金、存款、基金、股票等收益型资产', '房产等不产生收益的非收益资产', '工资、公积金和其他非资产收入'],
  },
  {
    title: '得到一份可以持续更新的自由仪表盘',
    lead: '录入基础数据后，你可以直接看到：',
    items: ['当前处于哪一档财务自由', '资产收益覆盖了多少生活预算', '收益型资产、年资产收益和月净收入', '基础、标准、高级自由分别预计何时达成', '当前主要是预算、收入还是资产收益在限制进度'],
  },
  {
    title: '比较选择，而不只是记录现状',
    lead: '你可以调整月收入，或切换基础、舒适、理想生活预算，比较不同选择会让自由时间提前还是推迟。先录入当前情况，就能得到第一份推演。',
  },
]

const currentIntro = computed(() => introPages[introPage.value])

function advanceIntro() {
  if (introPage.value < introPages.length - 1) {
    introPage.value += 1
    return
  }
  startSetup()
}

function startSetup() {
  phase.value = 'setup'
}

function goBack() {
  if (step.value > 0) {
    step.value -= 1
    return
  }
  phase.value = 'intro'
  introPage.value = introPages.length - 1
}

function next() {
  if (step.value < 2) {
    step.value += 1
    return
  }

  const budgets = props.data.budgets.map((budget) => ({
    ...budget,
    monthlyFixed: budgetAmount(budget.level),
    fixedExpenseMode: 'items' as const,
    fixedExpenseItems: createDefaultFixedExpenseItems(budgetAmount(budget.level)),
    monthlyDaily: 0,
    monthlyFamily: 0,
    monthlyDurableCost: 0,
  }))
  const nextData: AppDataPackage = {
    ...props.data,
    budgets,
    assets: buildAssets(),
    recurringCashflows: buildRecurringCashflows(),
    settings: {
      ...props.data.settings,
      inflationRate: inflationRatePercent.value / 100,
    },
  }

  emit('complete', nextData)
}

function buildAssets(): Asset[] {
  const updatedAt = new Date().toISOString()
  return assetRows.filter((asset) => asset.name.trim()).map((asset) => {
    const existing = props.data.assets.find((item) => item.name === asset.name)
    return existing
      ? { ...existing, name: asset.name.trim(), assetCategory: asset.assetCategory, amount: asset.amount, annualYieldRate: asset.assetCategory === 'income_generating' ? asset.annualYieldRatePercent / 100 : 0, updatedAt }
      : createAsset(asset, updatedAt)
  })
}

function buildRecurringCashflows(): AppDataPackage['recurringCashflows'] {
  const cashflows: AppDataPackage['recurringCashflows'] = []
  if (monthlySalary.value > 0) {
    cashflows.push({
      id: createId('recurring'),
      name: '工资',
      startMonth: monthNow(),
      activeIncome: Math.round(calculateSalaryIncomeEstimate(salaryInput.value).monthlyTakeHomeIncome),
      salaryInput: salaryInput.value,
      passiveIncome: 0,
    })
  }
  for (const income of customIncomeRows.filter((item) => item.name.trim() && item.amount > 0)) {
    cashflows.push({
      id: createId('recurring'),
      name: income.name.trim(),
      startMonth: monthNow(),
      activeIncome: 0,
      passiveIncome: income.amount,
    })
  }
  return cashflows
}

function createAsset(row: OnboardingAssetRow, updatedAt: string): Asset {
  return {
    id: createId('asset'),
    name: row.name.trim(),
    type: row.type,
    assetCategory: row.assetCategory,
    amount: row.amount,
    isDisposable: row.assetCategory === 'income_generating' && row.name !== '公积金余额',
    isLocked: row.assetCategory === 'income_generating' && row.name === '公积金余额',
    annualYieldRate: row.assetCategory === 'income_generating' ? row.annualYieldRatePercent / 100 : 0,
    updatedAt,
  }
}

function budgetAmount(level: AppDataPackage['budgets'][number]['level']): number {
  if (level === 'basic') return budgetBasics.basic
  if (level === 'comfortable') return budgetBasics.comfortable
  return budgetBasics.ideal
}
</script>
