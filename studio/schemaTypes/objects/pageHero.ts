import { defineType, defineField } from 'sanity'
import { ImageIcon } from '@sanity/icons/Image'
import { photoField } from '../shared/fields'

/**
 * The band at the top of every interior page: a photograph behind a navy
 * gradient, a small uppercase label, the page's one h1, and a line of standfirst.
 *
 * One object rather than four loose fields on each page, so the four always
 * travel together and Ricky sees them grouped the way they appear.
 */
export const pageHero = defineType({
  name: 'pageHero',
  title: 'Page header',
  type: 'object',
  icon: ImageIcon,
  fields: [
    defineField({
      name: 'eyebrow',
      title: 'Small label',
      type: 'string',
      description:
        'The little uppercase line above the headline, e.g. "SPEAKING ENGAGEMENTS". Two or three words.',
      validation: (rule) =>
        rule.max(40).warning('Long labels wrap awkwardly in small caps.'),
    }),
    defineField({
      name: 'heading',
      title: 'Headline',
      type: 'string',
      description:
        'The big headline. This is the page’s main heading, so make it describe the page.',
      validation: (rule) =>
        rule
          .required()
          .max(70)
          .warning('Over about 70 characters the headline runs to four lines.'),
    }),
    defineField({
      name: 'intro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      description: 'The paragraph under the headline. Two sentences is about right.',
      validation: (rule) =>
        rule.max(260).warning('Longer than this and it crowds the photograph.'),
    }),
    photoField({
      name: 'image',
      title: 'Background photograph',
      description:
        'Sits behind the headline, tinted navy. Pick something with room on the left — the text sits over that side. Use the crop tool to mark the subject.',
    }),
  ],
  preview: {
    select: { title: 'heading', subtitle: 'eyebrow', media: 'image' },
  },
})
