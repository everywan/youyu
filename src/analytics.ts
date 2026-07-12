const GOATCOUNTER_SCRIPT_URL = 'https://gc.zgo.at/count.js'

export function trackSiteOpen(endpoint = import.meta.env.VITE_GOATCOUNTER_ENDPOINT) {
  if (!endpoint) return

  const script = document.createElement('script')
  script.async = true
  script.src = GOATCOUNTER_SCRIPT_URL
  script.dataset.goatcounter = endpoint
  script.dataset.goatcounterSettings = JSON.stringify({
    path: '/open',
    title: '',
    referrer: '',
    no_events: true,
    no_session: true,
  })
  document.head.appendChild(script)
}
