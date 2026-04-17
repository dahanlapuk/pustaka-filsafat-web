import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

// Design system — order matters!
import './style/theme.css'      // 1. Token variables (dark/light)
import './style/bauhaus.css'    // 2. Reset, base, typography
import './style/components.css' // 3. Shared component classes

// Init theme dari localStorage sebelum render (cegah flash)
const savedTheme = localStorage.getItem('pf-theme') || 'light'
document.documentElement.setAttribute('data-theme', savedTheme)

createApp(App)
  .use(router)
  .mount('#app')

