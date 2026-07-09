<template>
  <section class="page">
    <header class="page-header">
      <div>
        <h1 class="page-title">设置</h1>
        <p class="page-subtitle">本地数据、默认参数、备份与恢复。</p>
      </div>
    </header>

    <section class="panel">
      <div class="section-label">基础参数</div>
      <div class="form-grid">
        <a-input value="CNY" disabled addon-before="默认货币" />
        <a-input-number v-model:value="inflationRatePercent" :min="0" :step="0.1" :controls="false" addon-before="CPI" addon-after="%" style="width: 100%" />
        <a-input-number v-model:value="settings.emergencyFundMonths" :min="0" :controls="false" addon-before="应急金月数" style="width: 100%" />
      </div>
      <div class="sticky-actions">
        <a-button type="primary" block @click="saveSettings">保存设置</a-button>
      </div>
    </section>

    <section class="panel">
      <div class="section-label">数据备份</div>
      <p class="row-description">导出完整版本化 JSON 数据包，可用于手动备份。</p>
      <a-button block @click="exportData">生成备份 JSON</a-button>
      <a-textarea v-if="exportText" v-model:value="exportText" class="textarea-mono" :rows="8" readonly />
    </section>

    <section class="panel">
      <div class="section-label">数据恢复</div>
      <a-textarea v-model:value="importText" class="textarea-mono" placeholder="粘贴备份 JSON" :rows="8" />
      <div class="sticky-actions">
        <a-button type="primary" block @click="restoreData">恢复 JSON</a-button>
      </div>
      <a-alert v-if="restoreMessage" :type="restoreType" :message="restoreMessage" show-icon />
    </section>

    <section class="panel">
      <div class="section-label">清空本地数据</div>
      <p class="row-description">会重置为默认空数据包，需要二次确认。</p>
      <a-popconfirm title="确认清空本地数据？此操作不可撤销。" @confirm="clearData">
        <a-button danger block>清空本地数据</a-button>
      </a-popconfirm>
    </section>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import type { AppDataPackage } from '../domain/types'
import { createDefaultAppData } from '../repositories/defaultData'

const props = defineProps<{
  data: AppDataPackage
  importJson: (json: string) => Promise<void>
}>()
const emit = defineEmits<{
  save: [data: AppDataPackage]
  replace: [data: AppDataPackage]
}>()

const settings = reactive({ ...props.data.settings })
const exportText = ref('')
const importText = ref('')
const restoreMessage = ref('')
const restoreType = ref<'success' | 'error'>('success')

watch(
  () => props.data.settings,
  (next) => Object.assign(settings, next),
)

const inflationRatePercent = computed({
  get: () => Math.round(settings.inflationRate * 1000) / 10,
  set: (value: number) => {
    settings.inflationRate = value / 100
  },
})

function saveSettings() {
  emit('save', { ...props.data, settings: { ...settings, currency: 'CNY' } })
}

function exportData() {
  exportText.value = JSON.stringify(props.data, null, 2)
}

async function restoreData() {
  try {
    await props.importJson(importText.value)
    restoreType.value = 'success'
    restoreMessage.value = '恢复成功，首页已重新计算。'
    importText.value = ''
  } catch (error) {
    restoreType.value = 'error'
    restoreMessage.value = error instanceof Error ? error.message : '恢复失败'
  }
}

function clearData() {
  emit('replace', createDefaultAppData())
}
</script>
