<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">财务自由仪表盘</h1>
        <p class="page-subtitle">最近更新 {{ updatedAtLabel }}</p>
      </div>
    </header>

    <section class="hero-dashboard">
      <div class="hero-row">
        <div>
          <div class="hero-label">当前自由等级</div>
          <h2 class="hero-title">{{ freedomLevelLabel }}</h2>
        </div>
        <div class="hero-rate">
          <div class="hero-label">基础覆盖率</div>
          <strong>{{ formatPercent(primaryCoverage) }}</strong>
        </div>
      </div>
      <div class="hero-date">预计达成：{{ formatFreedomTime(snapshot.freedomTimeByBudget.basic) }}</div>
    </section>

    <section v-if="isEmpty" class="panel empty-state">
      <div class="row-title">待录入基础数据</div>
      <p class="row-description">补齐目标、预算、资产负债和最近现金流后，就能看到第一份自由度报告。</p>
    </section>

    <section class="metric-grid">
      <article class="metric-card">
        <div class="metric-label">收益型净资产</div>
        <div class="metric-value">{{ formatCurrency(snapshot.incomeGeneratingNetWorth) }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">年资产收益</div>
        <div class="metric-value">{{ formatCurrency(snapshot.annualAssetIncome) }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">月净收入</div>
        <div class="metric-value">{{ formatCurrency(monthlyNetIncome) }}</div>
      </article>
      <article class="metric-card">
        <div class="metric-label">赚 100 元需要</div>
        <div class="metric-value">{{ laborHoursFor100Label }}(11h/天)</div>
      </article>
    </section>

    <section class="panel">
      <div class="section-label">三档自由进度</div>
      <div v-for="row in budgetRows" :key="row.level" class="progress-row">
        <div class="row-main">
          <div class="row-title">{{ row.name }}: {{ formatFreedomTime(snapshot.freedomTimeByBudget[row.level]) }} 达成</div>
          <a-progress
            :percent="Math.min(Math.round(row.coverage * 100), 100)"
            :show-info="false"
            size="small"
            :stroke-color="row.coverage >= 1 ? '#2f855a' : '#2468a9'"
          />
          <div class="row-description">
            当前收益 {{ formatCurrency(row.monthlyAssetIncome) }} / 预算支出 {{ formatCurrency(row.monthlyBudgetExpense) }}
          </div>
        </div>
        <div class="row-side">{{ formatPercent(row.coverage) }}</div>
      </div>
    </section>

    <section class="panel">
      <div class="section-label">关键提醒</div>
      <article v-for="message in snapshot.insightMessages" :key="message.title" class="insight" :class="message.type">
        <span class="insight-dot" />
        <div>
          <div class="row-title">{{ message.title }}</div>
          <div class="row-description">{{ message.description }}</div>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="section-label">最近更新</div>
      <div class="setting-row">
        <div>
          <div class="row-title">最近月结余</div>
          <div class="row-description">{{ latestMonthLabel }}</div>
        </div>
        <div class="row-side">{{ formatCurrency(snapshot.latestMonthlySurplus) }}</div>
      </div>
      <div class="setting-row">
        <div>
          <div class="row-title">年资产收益</div>
          <div class="row-description">来自资产金额 × 年化收益率</div>
        </div>
        <div class="row-side">{{ formatCurrency(snapshot.annualAssetIncome) }}</div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { buildMonthlyCashflowFromRecurring } from '../domain/calculations'
import type { AppDataPackage, BudgetLevel, DashboardSnapshot } from '../domain/types'
import { formatCurrency, formatFreedomTime, formatPercent } from '../utils/format'

const props = defineProps<{
  data: AppDataPackage
  snapshot: DashboardSnapshot
}>()

const levelLabels: Record<DashboardSnapshot['freedomLevel'], string> = {
  none: '未自由',
  basic: '基础自由',
  comfortable: '标准自由',
  ideal: '高级自由',
}

const budgetLabels: Record<BudgetLevel, string> = {
  basic: '基础自由',
  comfortable: '标准自由',
  ideal: '高级自由',
}

const freedomLevelLabel = computed(() => levelLabels[props.snapshot.freedomLevel])
const primarySummary = computed(() => props.snapshot.budgetSummaries.find((summary) => summary.level === 'basic'))
const primaryCoverage = computed(() => primarySummary.value?.assetIncomeCoverageRate ?? 0)
const monthlyNetIncome = computed(
  () =>
    (generatedCashflow.value ? generatedCashflow.value.activeIncome + generatedCashflow.value.passiveIncome : 0) +
    props.snapshot.annualAssetIncome / 12 -
    (primarySummary.value?.annualBudgetExpense ?? 0) / 12,
)
// 月工作小时数: 11*22
const laborHoursFor100 = computed(() => (monthlyNetIncome.value > 0 ? (100 * 11*22) / monthlyNetIncome.value : undefined))
const laborHoursFor100Label = computed(() => {
  if (laborHoursFor100.value === undefined) return '无法覆盖'
  if (laborHoursFor100.value < 0.1) return '< 0.1 小时'
  return `${laborHoursFor100.value.toFixed(laborHoursFor100.value >= 10 ? 0 : 1)} 小时`
})
const budgetRows = computed(() =>
  (['basic', 'comfortable', 'ideal'] as BudgetLevel[]).map((level) => {
    const summary = props.snapshot.budgetSummaries.find((item) => item.level === level)
    return {
      level,
      name: budgetLabels[level],
      coverage: summary?.assetIncomeCoverageRate ?? 0,
      monthlyAssetIncome: props.snapshot.annualAssetIncome / 12,
      monthlyBudgetExpense: summary ? summary.annualBudgetExpense / 12 : 0,
    }
  }),
)
const generatedCashflow = computed(() => buildMonthlyCashflowFromRecurring(props.data.recurringCashflows, currentMonth()))
const latestMonthLabel = computed(() => generatedCashflow.value?.month ?? '还没有持续性现金流')
const updatedAtLabel = computed(() => new Date(props.snapshot.updatedAt).toLocaleString('zh-CN'))
const isEmpty = computed(() => {
  const nonCoreAssets = props.data.assets.filter((asset) => !['现金余额', '公积金余额'].includes(asset.name))
  const coreAssetAmount = props.data.assets.filter((asset) => ['现金余额', '公积金余额'].includes(asset.name)).reduce((total, asset) => total + asset.amount, 0)
  return nonCoreAssets.length === 0 && coreAssetAmount === 0 && props.data.recurringCashflows.length === 0 && props.data.oneTimeCashflows.length === 0
})

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
</script>
