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
      <div class="section-heading compact">
        <div>
          <div class="section-label">推演过程</div>
          <div class="section-title">{{ selectedLevelLabel }}为什么是 {{ formatFreedomTime(selectedResult) }}</div>
        </div>
        <a-segmented v-model:value="scenario.budgetLevel" :options="levelOptions" size="small" />
      </div>

      <div v-if="selectedExplanation" class="projection-detail">
        <div class="formula-grid">
          <div>
            <span>年预算门槛</span>
            <strong>{{ formatCurrency(selectedExplanation.annualBudgetExpense) }}</strong>
          </div>
          <div>
            <span>需要资产总额</span>
            <strong>{{ formatRequiredInvestable(selectedExplanation.requiredInvestableNetWorth) }}</strong>
          </div>
          <div>
            <span>收益型资产总额</span>
            <strong>{{ formatCurrency(selectedExplanation.startingAssetBase) }}</strong>
          </div>
          <div>
            <span>实际年化</span>
            <strong>{{ formatPercent(selectedExplanation.annualReturn, 1) }}</strong>
          </div>
          <div>
            <span>月收入(到手工资+公积金)</span>
            <strong>{{ formatCurrency(selectedExplanation.monthlyCashIncome) }}</strong>
          </div>
          <div>
            <span>月净流入(收入-预算)</span>
            <strong>{{ formatCurrency(selectedExplanation.monthlyInvestableCashflow) }}</strong>
          </div>
        </div>

        <div class="projection-rule">
          <div class="projection-rule-list">
            <p><strong>达成条件：</strong><span class="projection-formula">（综合年化收益率 − CPI）× 总资产 ≥ 当前档年预算</span></p>
            <p><strong>备注：</strong>工资收入=税后工资+双方公积金；所有持续支出都应包含在预算中；年终奖等意外收入、意外支出不计入推演。
            <br/>
            综合年化收益率按当前资产配置加权计算。</p>
          </div>
        </div>

        <div class="projection-steps">
          <div v-for="step in selectedExplanation.checkpoints" :key="step.month" class="projection-step" :class="{ covered: step.covered }">
            <div class="row-main">
              <div class="row-title">{{ step.monthLabel }} · {{ formatMonthOffset(step.month) }}</div>
              <div class="row-description">
                资产 {{ formatCurrency(step.assetBase) }}，月收益 {{ formatCurrency(step.monthlyAssetIncome) }}，年收益 {{ formatCurrency(step.annualPassiveIncome) }}
              </div>
            </div>
            <div class="row-side">
              <div>{{ step.covered ? '达成' : '未达成' }}</div>
              <div class="metric-note">门槛 {{ formatCurrency(step.annualBudgetExpense) }}</div>
            </div>
          </div>
        </div>
      </div>
      <div v-else class="empty-state">{{ selectedResult.reason ?? '先补齐预算和收入，才能展示推演过程。' }}</div>
    </section>

    <section class="panel">
      <div class="section-label">参数</div>
      <div class="form-grid">
        <a-input-number v-model:value="scenario.monthlyActiveIncome" :min="0" :controls="false" addon-before="月收入" style="width: 100%" />
        <a-input-number v-model:value="selectedBudgetMonthlyExpense" disabled addon-before="当前档预算" style="width: 100%" />
        <a-input-number v-model:value="selectedMonthlyInvestableCashflow" disabled addon-before="预算后净流入" style="width: 100%" />
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

  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { buildMonthlyCashflowFromRecurring, buildScenarioComparison } from '../domain/calculations'
import type { AppDataPackage, BudgetLevel, DashboardSnapshot, ProjectionParameters } from '../domain/types'
import { formatCurrency, formatFreedomTime, formatPercent } from '../utils/format'

const props = defineProps<{
  data: AppDataPackage
  snapshot: DashboardSnapshot
}>()
const latestCashflow = buildMonthlyCashflowFromRecurring(props.data.recurringCashflows, currentMonth())

const scenario = reactive<ProjectionParameters>({
  monthlyActiveIncome: latestCashflow ? latestCashflow.activeIncome + latestCashflow.passiveIncome : 0,
  lockedAssetAmount: props.snapshot.lockedAssetAmount,
  reservedAssetAmount: props.snapshot.reservedAssetAmount,
  budgetLevel: 'basic',
})

const levels: { key: BudgetLevel; label: string }[] = [
  { key: 'basic', label: '基础自由' },
  { key: 'comfortable', label: '标准自由' },
  { key: 'ideal', label: '高级自由' },
]
const levelOptions = levels.map((level) => ({ label: level.label.replace('自由', ''), value: level.key }))

const comparison = computed(() => buildScenarioComparison({ data: props.data, current: props.snapshot, scenario }))
const selectedResult = computed(() => comparison.value.results[scenario.budgetLevel])
const selectedExplanation = computed(() => selectedResult.value.explanation)
const selectedLevelLabel = computed(() => levels.find((level) => level.key === scenario.budgetLevel)?.label ?? '当前档位')
const selectedBudgetMonthlyExpense = computed(() => selectedExplanation.value?.monthlyBudgetExpense ?? 0)
const selectedMonthlyInvestableCashflow = computed(() => selectedExplanation.value?.monthlyInvestableCashflow ?? 0)

function formatDelta(delta: number | undefined): string {
  if (delta === undefined) return '待补齐'
  if (delta === 0) return '达成时间不变'
  const months = Math.abs(delta)
  const label = months >= 12 ? `${(months / 12).toFixed(1)} 年` : `${months} 个月`
  return delta < 0 ? `提前 ${label}` : `推迟 ${label}`
}

function formatRequiredInvestable(value: number | undefined): string {
  return value === undefined ? '收益率不足' : formatCurrency(value)
}

function formatMonthOffset(month: number): string {
  if (month === 0) return '起点'
  if (month < 12) return `第 ${month} 个月`
  const years = Math.floor(month / 12)
  const restMonths = month % 12
  return restMonths === 0 ? `第 ${years} 年` : `第 ${years} 年 ${restMonths} 个月`
}

function currentMonth(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}
</script>
