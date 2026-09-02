import { defineType, defineField } from 'sanity'
import { PresentationIcon } from '@sanity/icons/Presentation'
import { photoMember } from '../shared/fields'

/**
 * The Speaking page. The three talks are not here — they are `talk` documents,
 * shared with the home page.
 */
export const speakingPage = defineType({
  name: 'speakingPage',
  title: 'Speaking Page',
  type: 'document',
  icon: PresentationIcon,
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroButton',
      title: 'Button',
      type: 'linkCta',
    }),
    defineField({
      name: 'talksHeading',
      title: 'Heading over the talks',
      type: 'string',
      description: 'Currently "Signature talks". The talks are edited under Signature Talks.',
    }),
    defineField({
      name: 'audiencesHeading',
      title: 'Heading over the audiences',
      type: 'string',
      description: 'Currently "Audiences he serves".',
    }),
    defineField({
      name: 'audiences',
      title: 'Audiences',
      type: 'array',
      description:
        'The list of the kinds of room Ricky speaks to — teams, banquets, corporate events, schools.',
      of: [{ type: 'string' }],
      options: { layout: 'tags' },
    }),
    defineField({
      name: 'bookingNote',
      title: 'Booking line',
      type: 'text',
      rows: 3,
      description:
        'The sentence under the audiences, with the email address in it. The address itself comes from Site Settings.',
    }),
    defineField({
      name: 'photos',
      title: 'Photographs',
      type: 'array',
      description:
        'The column beside the audiences. They fade between each other, so two or three works best.',
      of: [photoMember()],
    }),
  ],
  preview: { prepare: () => ({ title: 'Speaking Page' }) },
})
