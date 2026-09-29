import { defineType, defineField, defineArrayMember } from 'sanity'
import { PlayIcon } from '@sanity/icons/Play'
import { photoMember } from '../shared/fields'

/**
 * The Hunley Huddle page. Episodes are `episode` documents; everything here is
 * the furniture around them.
 */
export const huddlePage = defineType({
  name: 'huddlePage',
  title: 'Huddle Page',
  type: 'document',
  icon: PlayIcon,
  groups: [
    { name: 'top', title: 'Top of the page', default: true },
    { name: 'strands', title: 'What it is' },
    { name: 'f101', title: 'Football 101' },
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
      name: 'heroButton',
      title: 'Button',
      type: 'linkCta',
      group: 'top',
    }),

    defineField({
      name: 'strands',
      title: 'The three strands',
      type: 'array',
      group: 'strands',
      description:
        'The row of cards: the radio show, the events, the podcast. Each has a small label above its heading.',
      of: [
        defineArrayMember({
          type: 'object',
          name: 'strand',
          fields: [
            defineField({
              name: 'eyebrow',
              title: 'Small label',
              type: 'string',
              description: 'e.g. "EVERY GAME DAY".',
            }),
            defineField({
              name: 'heading',
              title: 'Heading',
              type: 'string',
              validation: (rule) => rule.required(),
            }),
            defineField({
              name: 'body',
              title: 'Text',
              type: 'text',
              rows: 5,
              validation: (rule) => rule.required(),
            }),
          ],
          preview: { select: { title: 'heading', subtitle: 'eyebrow' } },
        }),
      ],
      validation: (rule) => rule.max(3).warning('The row fits three across.'),
    }),
    defineField({
      name: 'episodesHeading',
      title: 'Heading over the episodes',
      type: 'string',
      group: 'strands',
      description: 'Currently "Episodes". The episodes themselves are edited under Episodes.',
    }),
    defineField({
      name: 'episodesNote',
      title: 'Note under the episodes',
      type: 'string',
      group: 'strands',
      description: 'Currently "New episodes and behind-the-scenes on Instagram."',
    }),

    defineField({
      name: 'f101Heading',
      title: 'Heading',
      type: 'string',
      group: 'f101',
    }),
    defineField({
      name: 'f101Body',
      title: 'Text',
      type: 'text',
      rows: 4,
      group: 'f101',
    }),
    /**
     * The switch, and it is a switch rather than "is the URL filled in?" on
     * purpose: between sessions the Eventbrite link is still the most recent
     * one, and deleting it to hide the button means pasting it back in from an
     * email six months later. Off keeps the link where it is and shows the
     * placeholder below instead.
     */
    defineField({
      name: 'f101ButtonEnabled',
      title: 'Show the tickets button',
      type: 'boolean',
      group: 'f101',
      description:
        'On: the button appears with the text and link below. Off: the grey "coming soon" wording appears instead and the link is kept for next time.',
      initialValue: false,
    }),
    defineField({
      name: 'f101Button',
      title: 'Tickets button',
      type: 'linkCta',
      group: 'f101',
      description:
        'The Eventbrite link, and what the button says. It only appears when the switch above is on — and if either the text or the address is missing it stays hidden rather than shown pointing nowhere.',
    }),
    defineField({
      name: 'f101ButtonPlaceholder',
      title: 'Wording when the button is off',
      type: 'string',
      group: 'f101',
      description:
        'The grey, unclickable wording where the button would be. Currently "Tickets coming soon".',
    }),
    defineField({
      name: 'f101Note',
      title: 'Note under the button',
      type: 'string',
      group: 'f101',
      description: 'Currently "Dates for the next session are announced each season."',
    }),
    defineField({
      name: 'f101Photos',
      title: 'Photographs',
      type: 'array',
      group: 'f101',
      description: 'The grid of session photographs. Four fills it.',
      of: [photoMember()],
    }),
  ],
  preview: { prepare: () => ({ title: 'Huddle Page' }) },
})
