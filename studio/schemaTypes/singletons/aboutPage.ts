import { defineType, defineField, defineArrayMember } from 'sanity'
import { UserIcon } from '@sanity/icons/User'
import { photoMember, sectionsField } from '../shared/fields'

/**
 * The About page. A singleton — one document, pinned to a fixed ID in
 * structure/index.ts, with no way to create a second.
 *
 * The narrative is an array of sections rather than five fixed fields, because
 * the page already grew from four to five and there is no reason to think it is
 * finished. The honours are an array for the same reason: Ricky is still
 * collecting them.
 */
export const aboutPage = defineType({
  name: 'aboutPage',
  title: 'About Page',
  type: 'document',
  icon: UserIcon,
  groups: [
    { name: 'top', title: 'Top of the page', default: true },
    { name: 'story', title: 'The story' },
    { name: 'honours', title: 'Honours' },
    { name: 'photos', title: 'Photographs' },
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      group: 'top',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'intro',
      title: 'Opening paragraph',
      type: 'text',
      rows: 6,
      group: 'top',
      description:
        'The paragraph that opens the page, before the dated sections start.',
      validation: (rule) => rule.required(),
    }),

    sectionsField({
      title: 'The story',
      description:
        'Each one is a heading on the left with its paragraphs on the right — "Early life & college career", "Professional career", and so on. Drag to reorder.',
    }),

    defineField({
      name: 'honours',
      title: 'Achievements & honours',
      type: 'array',
      group: 'honours',
      description:
        'The two-column list near the bottom. Add a year or a detail where one belongs.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'honour',
          fields: [
            defineField({
              name: 'title',
              title: 'Honour',
              type: 'string',
              description: 'e.g. "College Football Hall of Fame inductee".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'detail',
              title: 'Year or detail',
              type: 'string',
              description: 'e.g. "1998", or "1981 · 1982 · 1983". Leave empty if there is none.',
            }),
          ],
          preview: { select: { title: 'title', subtitle: 'detail' } },
        }),
      ],
    }),

    defineField({
      name: 'gallery',
      title: 'Photographs',
      type: 'array',
      group: 'photos',
      description:
        'The block of photographs at the foot of the page. They are dealt into three columns that fade between them, so nine works best — three per column. Use the crop tool on each so the subject stays in frame.',
      of: [photoMember()],
      validation: (rule) =>
        rule
          .min(3)
          .warning('Fewer than three and the columns have nothing to fade between.'),
    }),
  ],
  preview: { prepare: () => ({ title: 'About Page' }) },
})
