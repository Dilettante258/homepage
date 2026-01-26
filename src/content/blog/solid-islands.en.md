---
title: Shipping interactive islands with Astro + Solid
description: How I use Solid islands to keep bundles small while delivering dynamic UI.
date: 2024-11-12
locale: en
tags: [astro, solid, islands]
slug: solid-islands-en
---

Astro lets me choose the right rendering mode per component. On marketing-style pages, I default to static HTML and sprinkle **Solid islands** only where live state matters: theme toggles, live playgrounds, or data viewers.

Key habits:

1. **Stateless first** — ship server-rendered markup and hydrate later only if required.
2. **Single owner per concern** — wrap multiple tiny interactions into one island to avoid hydration overhead.
3. **Move data to props** — serialize the minimum JSON the island needs; everything else stays server-side.

I keep an eye on the island boundary: anything that can be a derived prop should be computed in Astro so Solid only handles interaction. The result is predictable Lighthouse scores and a calm user experience.
