import { trackSiteOpen } from '../src/analytics'

describe('trackSiteOpen', () => {
  beforeEach(() => {
    document.head.innerHTML = ''
  })

  it('does not load GoatCounter without an endpoint', () => {
    trackSiteOpen('')

    expect(document.head.querySelector('script')).toBeNull()
  })

  it('tracks each site open under one fixed path without page metadata', () => {
    trackSiteOpen('https://youyu.goatcounter.com/count')

    const script = document.head.querySelector('script')
    expect(script?.src).toBe('https://gc.zgo.at/count.js')
    expect(script?.dataset.goatcounter).toBe('https://youyu.goatcounter.com/count')
    expect(JSON.parse(script?.dataset.goatcounterSettings ?? '')).toEqual({
      path: '/open',
      title: '',
      referrer: '',
      no_events: true,
      no_session: true,
    })
  })
})
