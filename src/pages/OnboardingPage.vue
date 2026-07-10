<template>
  <section class="app-screen page">
    <header class="page-header">
      <div>
        <h1 class="page-title">先得到第一张仪表盘</h1>
        <p class="page-subtitle">三步轻量录入，每一步都可以跳过。</p>
      </div>
      <a-button size="small" @click="$emit('skip')">跳过</a-button>
    </header>

    <a-steps :current="step" size="small" :items="stepItems" />

    <section v-if="step === 0" class="panel">
      <div class="section-label">三档预算</div>
      <div class="form-grid">
        <a-input-number v-model:value="budgetBasics.basic" :min="0" :controls="false" addon-before="基础/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.comfortable" :min="0" :controls="false" addon-before="舒适/月" style="width: 100%" />
        <a-input-number v-model:value="budgetBasics.ideal" :min="0" :controls="false" addon-before="理想/月" style="width: 100%" />
      </div>
    </section>

    <section v-else-if="step === 1" class="panel">
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
      <a-button type="primary" block @click="next">{{ step === 2 ? '进入首页' : '下一步' }}</a-button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { createDefaultFixedExpenseItems } from '../domain/budgetPresets'
import type { AppDataPackage } from '../domain/types'
import { createId, formatCurrency, monthNow } from '../utils/format'

const props = defineProps<{ data: AppDataPackage }>()
const emit = defineEmits<{
  complete: [data: AppDataPackage]
  skip: []
}>()

const step = ref(0)
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

const stepItems = [{ title: '预算' }, { title: '资产' }, { title: '现金流' }]

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
    assets:
      assetAmount.value > 0
        ? [
            ...props.data.assets,
            {
              id: createId('asset'),
              name: '当前收益型资产',
              type: 'fund',
              assetCategory: 'income_generating',
              amount: assetAmount.value,
              isDisposable: true,
              isLocked: false,
              reservedAmount: reservedAmount.value,
              annualYieldRate: 0,
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
