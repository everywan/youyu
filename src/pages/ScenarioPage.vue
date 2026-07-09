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
            <span>收益型资产总额</span>
            <strong>{{ formatCurrency(selectedExplanation.startingAssetBase) }}</strong>
          </div>
          <div>
            <span>可支配净资产</span>
            <strong>{{ formatCurrency(selectedExplanation.startingInvestableNetWorth) }}</strong>
          </div>
          <div>
            <span>月现金收入</span>
            <strong>{{ formatCurrency(selectedExplanation.monthlyCashIncome) }}</strong>
          </div>
          <div>
            <span>实际年化</span>
            <strong>{{ formatPercent(selectedExplanation.annualReturn, 1) }}</strong>
          </div>
          <div>
            <span>年预算门槛</span>
            <strong>{{ formatCurrency(selectedExplanation.annualBudgetExpense) }}</strong>
          </div>
          <div>
            <span>需要资产总额</span>
            <strong>{{ formatRequiredInvestable(selectedExplanation.requiredInvestableNetWorth) }}</strong>
          </div>
          <div>
            <span>预算后净流入</span>
            <strong>{{ formatCurrency(selectedExplanation.monthlyInvestableCashflow) }}</strong>
          </div>
          <div>
            <span>负债月供</span>
            <strong>{{ formatCurrency(selectedExplanation.monthlyDebtPayment) }}</strong>
          </div>
        </div>

        <p class="projection-rule">
          规则：用所有收益型资产按整体实际年化滚动收益；当年资产收益覆盖年预算门槛时达成。
          <br/>
          每月按“现金收入
          {{ formatCurrency(selectedExplanation.monthlyCashIncome) }} + 资产收入 - 预算支出
          {{ formatCurrency(selectedExplanation.monthlyBudgetExpense) }} - 负债支出
          {{ formatCurrency(selectedExplanation.monthlyDebtPayment) }}”滚动。
        </p>

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
      <div v-else class="empty-state">{{ selectedResult.reason ?? '先补齐预算和现金流，才能展示推演过程。' }}</div>
    </section>

    <section class="panel">
      <div class="section-label">参数</div>
      <div class="form-grid">
        <a-input-number v-model:value="scenario.monthlyActiveIncome" :min="0" :controls="false" addon-before="月现金收入" style="width: 100%" />
        <a-input-number v-model:value="selectedBudgetMonthlyExpense" disabled addon-before="当前档预算" style="width: 100%" />
        <a-input-number v-model:value="monthlyDebtPayment" disabled addon-before="负债月供" style="width: 100%" />
        <a-input-number v-model:value="selectedMonthlyInvestableCashflow" disabled addon-before="预算后净流入" style="width: 100%" />
        <a-input-number v-model:value="scenario.reservedAssetAmount" :min="0" :controls="false" addon-before="预留资产" style="width: 100%" />
        <a-input-number v-model:value="scenario.lockedAssetAmount" :min="0" :controls="false" addon-before="不可动用" style="width: 100%" />
      </div>
      <div class="metric-note">收益率使用资产页每个资产的年化收益率，并扣除设置页 CPI。</div>
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
          <div class="row-description">现金收入 {{ formatCurrency(item.monthlyActiveIncome) }}</div>
        </div>
      </div>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive } from 'vue'
import { buildMonthlyCashflowFromRecurring, buildScenarioComparison, calculateMonthlyDebtPayment } from '../domain/calculations'
import type { AppDataPackage, BudgetLevel, DashboardSnapshot, Scenario } from '../domain/types'
import { createId, formatCurrency, formatFreedomTime, formatPercent } from '../utils/format'

const props = defineProps<{
  data: AppDataPackage
  snapshot: DashboardSnapshot
}>()
const emit = defineEmits<{ save: [data: AppDataPackage] }>()

const latestCashflow = buildMonthlyCashflowFromRecurring(props.data.recurringCashflows, currentMonth())
const monthlyDebtPayment = calculateMonthlyDebtPayment(props.data.liabilities)

const scenario = reactive<Scenario>({
  id: createId('scenario'),
  name: '默认推演',
  monthlyActiveIncome: latestCashflow?.activeIncome ?? 0,
  monthlyExpense: 0,
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

function saveScenario() {
  const next: Scenario = {
    ...scenario,
    id: createId('scenario'),
    name: `场景 ${props.data.scenarios.length + 1}`,
  }
  emit('save', { ...props.data, scenarios: [...props.data.scenarios, next] })
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
