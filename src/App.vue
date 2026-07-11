<template>
  <main class="app-shell">
    <a-spin :spinning="loading">
      <OnboardingPage
        v-if="data && showOnboarding"
        :data="data"
        @complete="handleOnboardingComplete"
        @skip="handleOnboardingSkip"
      />
      <template v-else-if="data && snapshot">
        <section class="app-screen">
          <HomePage v-if="activeTab === 'home'" :data="data" :snapshot="snapshot" />
          <EntryPage v-else-if="activeTab === 'entry'" :data="data" @save="saveData" />
          <ScenarioPage v-else-if="activeTab === 'scenario'" :data="data" :snapshot="snapshot" @save="saveData" />
          <SettingsPage v-else :data="data" :import-json="importJson" @save="saveData" @replace="replaceData" />
        </section>
        <nav class="bottom-tabs" aria-label="主导航">
          <button
            v-for="tab in tabs"
            :key="tab.key"
            class="tab-button"
            :class="{ active: activeTab === tab.key }"
            type="button"
            @click="activeTab = tab.key"
          >
            <component :is="tab.icon" class="tab-icon" />
            <span>{{ tab.label }}</span>
          </button>
        </nav>
      </template>
    </a-spin>
  </main>
</template>

<script setup lang="ts">
import {
  CalculatorOutlined,
  HomeOutlined,
  SettingOutlined,
  WalletOutlined,
} from '@ant-design/icons-vue'
import { computed, onMounted, ref } from 'vue'
import { calculateDashboard } from './domain/calculations'
import type { AppDataPackage } from './domain/types'
import { LocalAppDataRepository } from './repositories/LocalAppDataRepository'
import EntryPage from './pages/EntryPage.vue'
import HomePage from './pages/HomePage.vue'
import OnboardingPage from './pages/OnboardingPage.vue'
import ScenarioPage from './pages/ScenarioPage.vue'
import SettingsPage from './pages/SettingsPage.vue'

type TabKey = 'home' | 'entry' | 'scenario' | 'settings'

const repository = new LocalAppDataRepository()
const data = ref<AppDataPackage>()
const loading = ref(true)
const activeTab = ref<TabKey>('home')
const showOnboarding = ref(false)

const tabs = [
  { key: 'home' as const, label: '首页', icon: HomeOutlined },
  { key: 'entry' as const, label: '录入', icon: WalletOutlined },
  { key: 'scenario' as const, label: '推演', icon: CalculatorOutlined },
  { key: 'settings' as const, label: '设置', icon: SettingOutlined },
]

const snapshot = computed(() => (data.value ? calculateDashboard(data.value) : undefined))

onMounted(async () => {
  data.value = await repository.loadAppData()
  showOnboarding.value = !data.value.onboardingCompleted
  loading.value = false
})

async function saveData(next: AppDataPackage) {
  await repository.saveAppData(next)
  data.value = await repository.loadAppData()
}

async function replaceData(next: AppDataPackage) {
  await saveData(next)
  showOnboarding.value = !next.onboardingCompleted
  activeTab.value = 'home'
}

async function importJson(json: string) {
  await repository.importAppData(json)
  data.value = await repository.loadAppData()
  showOnboarding.value = false
  activeTab.value = 'home'
}

async function handleOnboardingComplete(next: AppDataPackage) {
  await saveData({ ...next, onboardingCompleted: true })
  showOnboarding.value = false
  activeTab.value = 'home'
}

async function handleOnboardingSkip() {
  if (!data.value) return
  await saveData({ ...data.value, onboardingCompleted: true })
  showOnboarding.value = false
}
</script>
