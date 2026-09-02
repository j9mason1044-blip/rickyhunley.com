import { defineType, defineField } from 'sanity'
import { HomeIcon } from '@sanity/icons/Home'
import { photoField } from '../shared/fields'

/**
 * The home page. The most bespoke of the singletons, because it is the only
 * page assembled out of teasers for other pages rather than content of its own.
 *
 * Note what is *not* here: the three signature talks. They appear on this page
 * and on /speaking, so they live in `talk` documents and both pages read them.
 * They were written twice in the design and had already drifted apart.
 *
 * The hero video is also absent. It is a 4.3 MB re-encode of a Dropbox master
 * that `build-assets.js` produces, not something to upload through a browser.
 */
export const homePage = defineType({
  name: 'homePage',
  title: 'Home Page',
  type: 'document',
  icon: HomeIcon,
  groups: [
    { name: 'hero', title: 'Top of the page', default: true },
    { name: 'reel', title: 'The film' },
    { name: 'about', title: 'About teaser' },
    { name: 'talks', title: 'Speaking teaser' },
    { name: 'huddle', title: 'Huddle teaser' },
  ],
  fields: [
    defineField({
      name: 'hero',
      title: 'Top of the page',
      type: 'pageHero',
      group: 'hero',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'heroButtons',
      title: 'Buttons',
      type: 'array',
      group: 'hero',
      description: 'The two buttons under the opening paragraph.',
      of: [{ type: 'linkCta' }],
      validation: (rule) => rule.max(2).warning('A third button crowds the hero.'),
    }),

    defineField({
      name: 'reelHeading',
      title: 'Heading',
      type: 'string',
      group: 'reel',
      description: 'Currently "Five decades in five minutes".',
    }),
    defineField({
      name: 'reelIntro',
      title: 'Introduction',
      type: 'text',
      rows: 2,
      group: 'reel',
    }),
    defineField({
      name: 'reelUrl',
      title: 'Link to the film',
      type: 'url',
      group: 'reel',
      description: 'The YouTube or Vimeo address. Clicking the still opens it in a new tab.',
      validation: (rule) => rule.uri({ scheme: ['http', 'https'] }),
    }),
    photoField({
      name: 'reelStill',
      title: 'Still from the film',
      description: 'The image behind the play button.',
    }),

    defineField({
      name: 'aboutEyebrow',
      title: 'Small label',
      type: 'string',
      group: 'about',
      description: 'Currently "About Ricky".',
    }),
    defineField({
      name: 'aboutHeading',
      title: 'Heading',
      type: 'string',
      group: 'about',
      validation: (rule) => rule.max(60).warning('Long headings run past the photograph.'),
    }),
    defineField({
      name: 'aboutBody',
      title: 'Text',
      type: 'text',
      rows: 8,
      group: 'about',
      description:
        'Two paragraphs, separated by a blank line. This is the short version — the full story lives on the About page.',
    }),
    photoField({
      name: 'aboutPhoto',
      title: 'Photograph',
      description: 'The portrait beside the text.',
    }),

    defineField({
      name: 'talksEyebrow',
      title: 'Small label',
      type: 'string',
      group: 'talks',
      description: 'Currently "Speaking Engagements".',
    }),
    defineField({
      name: 'talksHeading',
      title: 'Heading',
      type: 'string',
      group: 'talks',
    }),
    defineField({
      name: 'talksIntro',
      title: 'Introduction',
      type: 'text',
      rows: 3,
      group: 'talks',
      description:
        'The paragraph above the three talks. The talks themselves are edited under Signature Talks.',
    }),

    defineField({
      name: 'huddleHeading',
      title: 'Heading',
      type: 'string',
      group: 'huddle',
    }),
    defineField({
      name: 'huddleBody',
      title: 'Text',
      type: 'text',
      rows: 4,
      group: 'huddle',
    }),
  ],
  preview: { prepare: () => ({ title: 'Home Page' }) },
})
