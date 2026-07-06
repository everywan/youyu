<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">推演</h1>
        <p class="page-subtitle">调整变量看自由时间变化，推演不会覆盖真实数据。</p>
      </div>
    </header>

    <section class="panel">
      <div class="section-label">推演结果</div>
      <div v-for="level in levels" :key="level.key" class="progress-row">
        <div class="row-main">
          <div class="row-title">{{ level.label }}</div>
          <div class="row-description">当前 {{ formatFreedomTime(snapshot.freedomTimeByBudget[level.key]) }}</div>
        </div>
        <div class="row-side">
          <div>{{ formatFreedomTime(comparison.results[level.key]) }}</div>
          <div class="metric-note">{{ formatDelta(comparison.deltas[level.key]) }}</div>
        </div>
      </div>
    </section>

    <section class="panel">
      <div class="section-label">参数</div>
      <div class="form-grid">
        <a-input-number v-model:value="scenario.monthlyActiveIncome" :min="0" :controls="false" addon-before="月主动收入" style="width: 100%" />
        <a-input-number v-model:value="scenario.monthlyExpense" :min="0" :controls="false" addon-before="月总支出" style="width: 100%" />
        <a-input-number v-model:value="monthlySurplus" disabled addon-before="月结余" style="width: 100%" />
        <a-input-number v-model:value="annualReturnPercent" :min="0" :step="0.1" :controls="false" addon-before="年化" addon-after="%" style="width: 100%" />
        <a-input-number v-model:value="scenario.reservedAssetAmount" :min="0" :controls="false" addon-before="预留资产" style="width: 100%" />
        <a-input-number v-model:value="scenario.lockedAssetAmount" :min="0" :controls="false" addon-before="不可动用" style="width: 100%" />
      </div>
      <div class="sticky-actions">
        <a-button type="primary" block @click="saveScenario">保存为场景</a-button>
      </div>
    </section>

    <section class="panel">
      <div class="section-label">当前主要瓶颈</div>
      <article class="insight" :class="comparison.bottleneck.type">
        <span class="insight-dot" />
        <div>
          <div class="row-title">{{ comparison.bottleneck.title }}</div>
          <div class="row-description">{{ comparison.bottleneck.description }}</div>
        </div>
      </article>
    </section>

    <section class="panel">
      <div class="section-label">已保存场景</div>
      <div v-if="data.scenarios.length === 0" class="empty-state">还没有保存场景。</div>
      <div v-for="item in data.scenarios" :key="item.id" class="list-row">
        <div class="row-main">
          <div class="row-title">{{ item.name }}</div>
          <div class="row-description">结余 {{ formatCurrency(item.monthlyActiveIncome - item.monthlyExpense) }} · 年化 {{ Math.round(item.expectedAnnualReturn * 1000) / 10 }}%</div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { buildMonthlyCashflowFromRecurring, buildScenarioComparison } from '../domain/calculations'
import type { AppDataPackage, BudgetLevel, DashboardSnapshot, Scenario } from '../domain/types'
import { createId, formatCurrency, formatFreedomTime } from '../utils/format'

const props = defineProps<{
  data: AppDataPackage
  snapshot: DashboardSnapshot
}>()
const emit = defineEmits<{ save: [data: AppDataPackage] }>()

const latestCashflow = buildMonthlyCashflowFromRecurring(props.data.recurringCashflows, currentMonth())
const latestExpense = latestCashflow
  ? latestCashflow.fixedExpense +
    latestCashflow.dailyExpense +
    latestCashflow.familyExpense +
    latestCashflow.annualExpenseAllocated +
    latestCashflow.durableCostAllocated
  : 0

const scenario = reactive<Scenario>({
  id: createId('scenario'),
  name: '默认推演',
  monthlyActiveIncome: latestCashflow?.activeIncome ?? 0,
  monthlyExpense: latestExpense,
  expectedAnnualReturn: props.data.settings.defaultAnnualReturn,
  lockedAssetAmount: props.snapshot.lockedAssetAmount,
  reservedAssetAmount: props.snapshot.reservedAssetAmount,
  budgetLevel: 'basic',
})

const levels: { key: BudgetLevel; label: string }[] = [
  { key: 'basic', label: '基础自由' },
  { key: 'comfortable', label: '标准自由' },
  { key: 'ideal', label: '高级自由' },
]

const monthlySurplus = computed(() => scenario.monthlyActiveIncome - scenario.monthlyExpense)
const annualReturnPercent = computed({
  get: () => Math.round(scenario.expectedAnnualReturn * 1000) / 10,
  set: (value: number) => {
    scenario.expectedAnnualReturn = value / 100
  },
})
const comparison = computed(() => buildScenarioComparison({ data: props.data, current: props.snapshot, scenario }))

function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return '待补齐'
  if (delta === 0) return '无变化'
  const months = Math.abs(delta)
  const label = months >= 12 ? `${(months / 12).toFixed(1)} 年` : `${months} 个月`
  return delta < 0 ? `提前 ${label}` : `推迟 ${label}`
}

function saveScenario() {
  const next: Scenario = {
    ...scenario,
    id: createId('scenario'),
    name: `场景 ${props.data.scenarios.length + 1}`,
  }
  emit('save', { ...props.data, scenarios: [...props.data.scenarios, next] })
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
</script>
