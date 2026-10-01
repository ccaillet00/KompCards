import { describe, expect, it } from 'vitest'
import { mountSuspended } from '@nuxt/test-utils/runtime'
import InformationPage from '../pages/information.vue'

describe('Noch nicht veröffentlichte Informationen', () => {
  it('benennt den offenen Stand für alle verlinkten Bereiche ohne erfundenen Kontakt', async () => {
    const wrapper = await mountSuspended(InformationPage)
    for (const id of ['terms', 'privacy', 'imprint', 'contact']) {
      expect(wrapper.get(`#${id}`).text()).toContain('noch nicht verfügbar')
    }
    expect(wrapper.findAll('main')).toHaveLength(1)
    expect(wrapper.find('a[href^="mailto:"]').exists()).toBe(false)
  })
})
