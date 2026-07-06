<template>
  <section class="app-screen page">
    <header class="page-header">
      <div>
        <h1 class="page-title">先得到第一张仪表盘</h1>
        <p class="page-subtitle">四步轻量录入，每一步都可以跳过。</p>
      </div>
      <a-button size="small" @click="$emit('skip')">跳过</a-button>
    </header>

    <a-steps :current="step" size="small" :items="stepItems" />

    <section v-if="step === 0" class="panel">
      <div class="section-label">选择目标模板</div>
      <a-radio-group v-model:value="template" class="template-list">
        <a-radio-button v-for="item in templates" :key="item.id" :value="item.id">{{ item.name }}</a-radio-button>
      </a-radio-group>
      <p class="row-description">模板会生成一个辅助目标，不覆盖预算模型。</p>
    </section>

    <section v-else-if="step === 1" class="panel">
      <div class="section-label">三档预算</div>
      <div class="form-grid">
        <a-input-number v-model:value="budgetBasics.basic" :min="0" :controls="false" addon-before="基础/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.comfortable" :min="0" :controls="false" addon-before="舒适/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.ideal" :min="0" :controls="false" addon-before="理想/月" style="width: 100%" />
      </div>
    </section>

    <section v-else-if="step === 2" class="panel">
      <div class="section-label">当前资产负债</div>
      <div class="form-grid">
        <a-input-number v-model:value="assetAmount" :min="0" :controls="false" addon-before="收益型资产" style="width: 100%" />
        <a-input-number v-model:value="liabilityAmount" :min="0" :controls="false" addon-before="负债余额" style="width: 100%" />
        <a-input-number v-model:value="reservedAmount" :min="0" :controls="false" addon-before="预留资产" style="width: 100%" />
      </div>
    </section>

    <section v-else class="panel">
      <div class="section-label">持续性现金流</div>
      <div class="form-grid">
        <a-input-number v-model:value="activeIncome" :min="0" :controls="false" addon-before="主动收入" style="width: 100%" />
        <a-input-number v-model:value="passiveIncome" :min="0" :controls="false" addon-before="被动收入" style="width: 100%" />
        <a-input-number v-model:value="monthlyExpense" :min="0" :controls="false" addon-before="月支出" style="width: 100%" />
      </div>
      <div class="metric-note">月结余：{{ formatCurrency(activeIncome + passiveIncome - monthlyExpense) }}</div>
    </section>

    <div class="sticky-actions">
      <a-button v-if="step > 0" @click="step -= 1">上一步</a-button>
      <a-button type="primary" block @click="next">{{ step === 3 ? '进入首页' : '下一步' }}</a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { AppDataPackage, FreedomTarget } from '../domain/types'
import { createId, formatCurrency, monthNow } from '../utils/format'

const props = defineProps<{ data: AppDataPackage }>()
const emit = defineEmits<{
  complete: [data: AppDataPackage]
  skip: []
}>()

const step = ref(0)
const template = ref('city-basic')
const assetAmount = ref(0)
const liabilityAmount = ref(0)
const reservedAmount = ref(0)
const activeIncome = ref(0)
const passiveIncome = ref(0)
const monthlyExpense = ref(0)
const budgetBasics = reactive({
  basic: 5_000,
  comfortable: 8_000,
  ideal: 12_000,
})

const stepItems = [{ title: '目标' }, { title: '预算' }, { title: '资产' }, { title: '现金流' }]
const templates = [
  { id: 'county-basic', name: '小县城基础自由', asset: 2_000_000, passive: 5_000 },
  { id: 'city-basic', name: '城市基础自由', asset: 3_000_000, passive: 8_000 },
  { id: 'standard', name: '标准自由', asset: 5_000_000, passive: 15_000 },
  { id: 'advanced', name: '高级自由', asset: 10_000_000, passive: 30_000 },
  { id: 'custom', name: '自定义', asset: 0, passive: 0 },
]

function next() {
  if (step.value < 3) {
    step.value += 1
    return
  }

  const selected = templates.find((item) => item.id === template.value) ?? templates[1]
  const target: FreedomTarget = {
    id: createId('target'),
    name: selected.name,
    level: selected.id === 'custom' ? 'custom' : 'basic',
    linkedBudgetLevel: 'basic',
    targetAssetAmount: selected.asset,
    targetMonthlyPassiveIncome: selected.passive,
    priority: 'budget_coverage_first',
  }
  const budgets = props.data.budgets.map((budget) => ({
    ...budget,
    monthlyFixed: budgetAmount(budget.level),
    fixedExpenseMode: 'items' as const,
    fixedExpenseItems:
      budgetAmount(budget.level) > 0
        ? [{ id: createId('budget-item'), category: 'custom' as const, name: '预算总额', amount: budgetAmount(budget.level) }]
        : [],
    monthlyDaily: 0,
    monthlyFamily: 0,
    monthlyDurableCost: 0,
  }))
  const nextData: AppDataPackage = {
    ...props.data,
    targets: selected.id === 'custom' ? props.data.targets : [target],
    budgets,
    assets:
      assetAmount.value > 0
        ? [
            {
              id: createId('asset'),
              name: '当前收益型资产',
              type: 'fund',
              assetCategory: 'income_generating',
              amount: assetAmount.value,
              isDisposable: true,
              isLocked: false,
              reservedAmount: reservedAmount.value,
              annualCashflow: passiveIncome.value * 12,
              updatedAt: new Date().toISOString(),
            },
          ]
        : props.data.assets,
    liabilities:
      liabilityAmount.value > 0
        ? [
            {
              id: createId('liability'),
              name: '当前负债',
              type: 'other',
              balance: liabilityAmount.value,
              updatedAt: new Date().toISOString(),
            },
          ]
        : props.data.liabilities,
    recurringCashflows:
      activeIncome.value + passiveIncome.value + monthlyExpense.value > 0
        ? [
            {
              id: createId('cashflow'),
              name: '默认持续现金流',
              startMonth: monthNow(),
              activeIncome: activeIncome.value,
              passiveIncome: passiveIncome.value,
              fixedExpense: monthlyExpense.value,
              dailyExpense: 0,
              familyExpense: 0,
              annualExpenseAllocated: 0,
              durableCostAllocated: 0,
            },
          ]
        : props.data.recurringCashflows,
  }

  emit('complete', nextData)
}

function budgetAmount(level: AppDataPackage['budgets'][number]['level']): number {
  if (level === 'basic') return budgetBasics.basic
  if (level === 'comfortable') return budgetBasics.comfortable
  return budgetBasics.ideal
}
</script>

<style scoped>
.template-list {
  display: grid;
  gap: 8px;
  margin-top: 10px;
}

.template-list :deep(.ant-radio-button-wrapper) {
  border-inline-start-width: 1px;
  border-radius: 8px;
  text-align: center;
}
</style>
