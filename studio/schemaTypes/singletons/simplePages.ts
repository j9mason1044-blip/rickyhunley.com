import { defineType, defineField } from 'sanity'
import { DocumentIcon } from '@sanity/icons/Document'
import { HeartIcon } from '@sanity/icons/Heart'
import { EnvelopeIcon } from '@sanity/icons/Envelope'
import { photoMember, sectionsField } from '../shared/fields'

/**
 * The four pages that are a header and then very little: News and Blog are
 * almost entirely their own collections, Community and Contact are a header and
 * a handful of prose sections.
 *
 * Grouped in one file because separating them would be four files of a dozen
 * lines each; they are still four distinct types, so Ricky sees four clearly
 * named entries in the Studio rather than one generic "Page" with a dropdown.
 */

export const newsPage = defineType({
  name: 'newsPage',
  title: 'News Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      description: 'The press mentions below come from News Items.',
      validation: (rule) => rule.required(),
    }),
  ],
  preview: { prepare: () => ({ title: 'News Page' }) },
})

export const blogPage = defineType({
  name: 'blogPage',
  title: 'Blog Page',
  type: 'document',
  icon: DocumentIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      description:
        'The posts below come from Blog Posts, grouped by Series. Nothing here needs changing to publish a post.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'latestHeading',
      title: 'Heading over the newest posts',
      type: 'string',
      description: 'Currently "Latest posts".',
    }),
  ],
  preview: { prepare: () => ({ title: 'Blog Page' }) },
})

export const communityPage = defineType({
  name: 'communityPage',
  title: 'Community Page',
  type: 'document',
  icon: HeartIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      validation: (rule) => rule.required(),
    }),
    sectionsField({
      title: 'The work',
      description:
        'The Foundation, the Tucson partners, the education work — a heading and a paragraph each.',
    }),
    defineField({
      name: 'closingHeading',
      title: 'Closing heading',
      type: 'string',
      description: 'Currently "Bring Ricky into your community".',
    }),
    defineField({
      name: 'closingBody',
      title: 'Closing text',
      type: 'text',
      rows: 3,
    }),
    defineField({
      name: 'closingButton',
      title: 'Closing button',
      type: 'linkCta',
    }),
    defineField({
      name: 'photos',
      title: 'Photographs',
      type: 'array',
      of: [photoMember()],
    }),
  ],
  preview: { prepare: () => ({ title: 'Community Page' }) },
})

export const contactPage = defineType({
  name: 'contactPage',
  title: 'Contact Page',
  type: 'document',
  icon: EnvelopeIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      description: 'The email address comes from Site Settings, so it is only written once.',
      validation: (rule) => rule.required(),
    }),
    sectionsField({
      title: 'Sections',
      description: 'Currently just "Based in Tucson, Arizona".',
      max: 3,
    }),
    defineField({
      name: 'photos',
      title: 'Photographs',
      type: 'array',
      of: [photoMember()],
    }),
  ],
  preview: { prepare: () => ({ title: 'Contact Page' }) },
})
