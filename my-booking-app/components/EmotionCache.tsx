'use client';

import * as React from 'react';
import type { EmotionCache, Options as EmotionCacheOptions } from '@emotion/cache';
import { useServerInsertedHTML } from 'next/navigation';
import { CacheProvider as EmotionCacheProvider } from '@emotion/react';
import createCache from '@emotion/cache';

export type NextAppDirEmotionCacheProviderProps = {
  options: Omit<EmotionCacheOptions, 'insertionPoint'>;
  CacheProvider?: (props: {
    value: EmotionCache;
    children: React.ReactNode;
  }) => React.JSX.Element | null;
  children: React.ReactNode;
};

// Dies ist die von MUI empfohlene Implementierung für den Next.js App Router.
export default function NextAppDirEmotionCacheProvider(
  props: NextAppDirEmotionCacheProviderProps
) {
  const { options, CacheProvider = EmotionCacheProvider, children } = props;

  const [registry] = React.useState(() => {
    const cache = createCache(options);
    cache.compat = true;
    const prevInsert = cache.insert;
    let inserted: string[] = [];
    cache.insert = (...args) => {
      const serialized = args[1];
      if (cache.inserted[serialized.name] === undefined) {
        inserted.push(serialized.name);
      }
      return prevInsert(...args);
    };
    const flush = () => {
      const prevInserted = inserted;
      inserted = [];
      return prevInserted;
    };
    return { cache, flush };
  });

  useServerInsertedHTML(() => {
    const names = registry.flush();
    if (names.length === 0) {
      return null;
    }
    let styles = '';
    for (const name of names) {
      styles += registry.cache.inserted[name];
    }
    return (
      <style
        key={registry.cache.key}
        data-emotion={`${registry.cache.key} ${names.join(' ')}`}
        dangerouslySetInnerHTML={{
          __html: styles,
        }}
      />
    );
  });

  return <CacheProvider value={registry.cache}>{children}</CacheProvider>;
}