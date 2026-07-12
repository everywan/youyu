import 'ant-design-vue/dist/reset.css'
import './styles.css'

import Antd from 'ant-design-vue'
import { createApp } from 'vue'
import App from './App.vue'
import { trackSiteOpen } from './analytics'

createApp(App).use(Antd).mount('#app')
trackSiteOpen()
