import { defineType, defineField } from 'sanity'
import { BlockquoteIcon } from '@sanity/icons/Blockquote'

/**
 * A run of related posts, shown on /blog as its own titled section with an
 * introduction and a list of numbered rows.
 *
 * This exists because the blog already has two of them — "Seven lessons to my
 * younger self" and "Common sense ain't common" — and in the design they are
 * hand-written markup. Making a series a document means Ricky can start a third
 * without anyone touching code.
 *
 * A post with no series is a standalone piece and appears as a photo card at
 * the top of the page instead.
 */
export const series = defineType({
  name: 'series',
  title: 'Series',
  type: 'document',
  icon: BlockquoteIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Series title',
      type: 'string',
      description: 'The heading over the group, e.g. "Seven lessons to my younger self".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description: 'The line under the heading explaining what the series is.',
      validation: (rule) =>
        rule.max(220).warning('Longer than this pushes the first post out of view.'),
    }),
    defineField({
      name: 'order',
      title: 'Position on the blog page',
      type: 'number',
      description:
        'Series are shown low number first. "Seven lessons" is 1, "Common sense" is 2.',
      initialValue: 1,
      validation: (rule) => rule.required().integer().positive(),
    }),
  ],
  orderings: [
    { title: 'Page order', name: 'orderAsc', by: [{ field: 'order', direction: 'asc' }] },
  ],
  preview: {
    select: { title: 'title', subtitle: 'intro' },
  },
})
