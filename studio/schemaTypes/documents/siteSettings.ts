import { defineType, defineField, defineArrayMember } from 'sanity'
import { CogIcon } from '@sanity/icons/Cog'

/**
 * Site-wide values that appear in the header and footer of every page.
 * A singleton — enforced in structure/index.ts, not here.
 *
 * Field descriptions are written for Ricky, not for a developer. He is an
 * Administrator on the free plan (there is no Editor role), so the wording is
 * doing part of the job that permissions would otherwise do.
 */
export const siteSettings = defineType({
  name: 'siteSettings',
  title: 'Site Settings',
  type: 'document',
  icon: CogIcon,
  fields: [
    defineField({
      name: 'email',
      title: 'Contact email',
      type: 'string',
      description:
        'Where the "Book Ricky" buttons send people. Appears in the footer too.',
      validation: (rule) => rule.required().email(),
    }),
    defineField({
      name: 'footerBlurb',
      title: 'Footer description',
      type: 'text',
      rows: 3,
      description:
        'The short paragraph under your name in the footer of every page. Two lines is about right.',
      validation: (rule) =>
        rule.required().max(200).warning('Keep it short — it sits in a narrow column.'),
    }),
    defineField({
      name: 'location',
      title: 'Location',
      type: 'string',
      description: 'Shown at the bottom right of every page. Currently "Tucson, Arizona".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'socials',
      title: 'Social links',
      type: 'array',
      description: 'The icons in the footer, in the order you want them shown.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'social',
          fields: [
            defineField({
              name: 'platform',
              title: 'Platform',
              type: 'string',
              options: {
                list: [
                  { title: 'Instagram', value: 'instagram' },
                  { title: 'Podcast', value: 'podcast' },
                  { title: 'Email', value: 'email' },
                ],
                layout: 'radio',
              },
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'label',
              title: 'Label',
              type: 'string',
              description: 'How it reads in the footer list, e.g. "Instagram @hunley.ricky".',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'url',
              title: 'Link',
              type: 'url',
              validation: (rule) =>
                rule.required().uri({ scheme: ['http', 'https', 'mailto'] }),
            }),
          ],
          preview: {
            select: { title: 'label', subtitle: 'url' },
          },
        }),
      ],
    }),
  ],
  preview: {
    prepare: () => ({ title: 'Site Settings' }),
  },
})
