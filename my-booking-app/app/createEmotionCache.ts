'use client'

import createCache from '@emotion/cache'

export default function createEmotionCache() {
  // 'prepend: true' = MUI-Styles stehen oben → weniger CSS-Konflikte
  return createCache({ key: 'mui', prepend: true })
}
