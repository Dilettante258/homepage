// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import react from '@astrojs/react';
import viewTimelinePlugin from './src/remark/view-timeline';

export default defineConfig({
  integrations: [
    react({
      include: ['**/react/*'],
    }),
    solidJs({
      include: ['**/solid/*'],
    }),
  ],
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'zh'],
    routing: {
      prefixDefaultLocale: true,
      redirectToDefaultLocale: true
    }
  },
  markdown: {
    rehypePlugins: [viewTimelinePlugin]
  }

});