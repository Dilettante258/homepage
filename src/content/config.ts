import { defineCollection, z } from 'astro:content';

const blog = defineCollection({
	type: 'content',
	schema: z.object({
		title: z.string(),
		description: z.string(),
		date: z.date(),
		locale: z.enum(['en', 'zh']),
		tags: z.array(z.string()).default([]),
		hero: z.string().url().optional()
	})
});

export const collections = { blog };
