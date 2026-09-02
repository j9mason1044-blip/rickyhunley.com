import { defineType, defineField } from 'sanity'
import { TextIcon } from '@sanity/icons/Text'

/**
 * A labelled block of prose: the heading in the left column, the paragraphs in
 * the right. About uses five of these ("Early life & college career",
 * "Professional career", …); Community uses four.
 *
 * Paragraphs are separated by blank lines in one text field rather than being
 * an array of strings. Ricky is writing prose, not assembling records, and a
 * repeater with an "Add paragraph" button makes the simple case feel like data
 * entry. The build splits on blank lines.
 */
export const contentSection = defineType({
  name: 'contentSection',
  title: 'Section',
  type: 'object',
  icon: TextIcon,
  fields: [
    defineField({
      name: 'heading',
      title: 'Heading',
      type: 'string',
      description: 'The small label beside the text, e.g. "Coaching career".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'body',
      title: 'Text',
      type: 'text',
      rows: 8,
      description: 'Leave a blank line between paragraphs.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'body' },
  },
})
