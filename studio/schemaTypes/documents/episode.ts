import { defineType, defineField } from 'sanity'
import { PlayIcon } from '@sanity/icons/Play'

/**
 * A Hunley Huddle podcast episode, as listed on /huddle. Like news items these
 * link straight out to whichever platform hosts the episode, so there is no
 * audio file or detail page to model.
 *
 * Each episode belongs to a `season`; the Studio lists them season by season.
 */
export const episode = defineType({
  name: 'episode',
  title: 'Podcast Episode',
  type: 'document',
  icon: PlayIcon,
  fields: [
    defineField({
      name: 'season',
      title: 'Season',
      type: 'reference',
      to: [{ type: 'season' }],
      description:
        'Which season this episode belongs to. New seasons are added under Podcast Episodes → Seasons.',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'episodeNumber',
      title: 'Episode number',
      type: 'number',
      description: 'Shown as "EP. 8". Numbers only.',
      validation: (rule) => rule.required().integer().positive(),
    }),
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Usually the guest, e.g. "Rob Gronkowski".',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'platform',
      title: 'Where it is hosted',
      type: 'string',
      description: 'The label on the link.',
      options: {
        list: [
          { title: 'Apple Podcasts', value: 'Apple Podcasts' },
          { title: 'iHeart', value: 'iHeart' },
          { title: 'Listen Notes', value: 'Listen Notes' },
          { title: 'Spotify', value: 'Spotify' },
          { title: 'Spreaker', value: 'Spreaker' },
          { title: 'YouTube', value: 'YouTube' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'url',
      title: 'Link to the episode',
      type: 'url',
      validation: (rule) => rule.required().uri({ scheme: ['http', 'https'] }),
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'episodeNumberDesc',
      by: [{ field: 'episodeNumber', direction: 'desc' }],
    },
  ],
  preview: {
    select: {
      number: 'episodeNumber',
      title: 'title',
      platform: 'platform',
      season: 'season.number',
    },
    prepare: ({ number, title, platform, season }) => ({
      title: `EP. ${number} — ${title}`,
      subtitle: [season ? `Season ${season}` : 'No season', platform]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
