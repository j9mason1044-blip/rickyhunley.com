import { defineType, defineField } from 'sanity'
import { LinkIcon } from '@sanity/icons/Link'

/**
 * A press mention on /news. Every one of these links straight out to the
 * publication — there are no detail pages, by design — so the only thing that
 * matters is that the outlet, the headline and the link are right.
 */
export const newsItem = defineType({
  name: 'newsItem',
  title: 'News Item',
  type: 'document',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'outlet',
      title: 'Publication',
      type: 'string',
      description: 'Who published it — the small label above the headline, e.g. "Tucson.com".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'title',
      title: 'Headline',
      type: 'string',
      description: 'Use their headline, not your own wording.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link',
      type: 'url',
      description: 'Opens in a new tab. Check it still works before publishing.',
      validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
    }),
    defineField({
      name: 'kind',
      title: 'Type',
      type: 'string',
      description: 'Decides whether the link reads "Read" or "Watch".',
      options: {
        list: [
          { title: 'Article — reads "Read"', value: 'article' },
          { title: 'Video — reads "Watch"', value: 'video' },
        ],
        layout: 'radio',
      },
      initialValue: 'article',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'datetime',
      description: 'Newest appears first on the news page.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'outlet' },
  },
})
