// @ts-check
import { defineConfig } from 'astro/config';
import solidJs from '@astrojs/solid-js';
import react from '@astrojs/react';
import viewTimelinePlugin from './src/remark/view-timeline';
import { fontProviders } from "astro/config";
import cloudflare from "@astrojs/cloudflare";

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
  },

  experimental: {
    fonts: [
      {
        provider: fontProviders.google(),
        name: "EB Garamond",
        cssVariable: "--font-heading",
        weights: ["400", "500", "600", "700", "800"],
        styles: ["normal", "italic"],
        subsets: ["latin"],
        fallbacks: ["Georgia", "serif"]
      },
      {
        provider: fontProviders.google(),
        name: "Plus Jakarta Sans",
        cssVariable: "--font-body",
        weights: ["400", "500", "600", "700"],
        styles: ["normal"],
        subsets: ["latin"],
        fallbacks: ["system-ui", "-apple-system", "sans-serif"]
      }
    ]
  },

  adapter: cloudflare()
});