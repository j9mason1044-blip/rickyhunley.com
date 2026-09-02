import { defineType, defineField } from 'sanity'
import { PresentationIcon } from '@sanity/icons/Presentation'

/**
 * One of the signature talks listed on /speaking. Three today ("Leadership,
 * Resilience & Purpose", "The State of Football", "Football 101 for Women"),
 * numbered 01–03 in a row of cards.
 *
 * A document rather than an array on the Speaking page, because the set changes
 * as Ricky's offer changes and each one is a thing in its own right — the sort
 * of content that ends up referenced from a booking form later.
 */
export const talk = defineType({
  name: 'talk',
  title: 'Signature Talk',
  type: 'document',
  icon: PresentationIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'tagline',
      title: 'Tagline',
      type: 'string',
      description:
        'The small red line under the title, e.g. "Petersburg to Tucson". Optional.',
      validation: (rule) => rule.max(48).warning('Keep it to a few words.'),
    }),
    defineField({
      name: 'description',
      title: 'What it covers',
      type: 'text',
      rows: 5,
      description: 'A short paragraph. The three cards sit side by side, so keep them a similar length.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'order',
      title: 'Position',
      type: 'number',
      description: 'Talks are numbered on the page in this order — 1 shows as "01".',
      initialValue: 1,
      validation: (rule) => rule.required().integer().positive(),
    }),
  ],
  orderings: [
    { title: 'Page order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'tagline', order: 'order' },
    prepare: ({ title, subtitle, order }) => ({
      title: `${String(order ?? 0).padStart(2, '0')} — ${title}`,
      subtitle,
    }),
  },
})
