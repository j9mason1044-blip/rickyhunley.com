import { defineType, defineField } from 'sanity'
import { StackCompactIcon } from '@sanity/icons/StackCompact'

/**
 * A season of the Hunley Huddle. Episodes point at one of these, and the Studio
 * lists episodes season by season under Podcast Episodes.
 *
 * A document rather than a number on the episode so a season can carry its own
 * name and a line about it, and so starting "Season 2" is one new document
 * instead of retyping the same number on every episode.
 */
export const season = defineType({
  name: 'season',
  title: 'Podcast Season',
  type: 'document',
  icon: StackCompactIcon,
  fields: [
    defineField({
      name: 'number',
      title: 'Season number',
      type: 'number',
      description: 'Seasons are listed newest (highest number) first.',
      validation: (rule) =>
        rule
          .required()
          .integer()
          .positive()
          .custom(async (number, { document, getClient }) => {
            if (number == null || !document) return true
            const id = document._id.replace(/^drafts\./, '')
            const taken = await getClient({ apiVersion: '2025-02-19' }).fetch(
              'count(*[_type == "season" && number == $number && !(_id in [$id, "drafts." + $id])])',
              { number, id }
            )
            return taken ? `There is already a Season ${number}.` : true
          }),
    }),
    defineField({
      name: 'title',
      title: 'Name',
      type: 'string',
      description: 'Optional. Leave empty to show "Season 1", "Season 2", and so on.',
    }),
    defineField({
      name: 'description',
      title: 'About this season',
      type: 'text',
      rows: 2,
      description: 'Optional. A line on what the season covered.',
    }),
  ],
  orderings: [
    { title: 'Newest first', name: 'numberDesc', by: [{ field: 'number', direction: 'desc' }] },
  ],
  preview: {
    select: { number: 'number', title: 'title', subtitle: 'description' },
    prepare: ({ number, title, subtitle }) => ({
      title: title ? `Season ${number} — ${title}` : `Season ${number}`,
      subtitle,
    }),
  },
})

/**
 * "New episode" from inside a season's list in the Studio: the episode starts
 * out filed under that season. Needs the season's ID, so it is kept out of the
 * global create menus in sanity.config.ts.
 */
export const episodeInSeason = {
  id: 'episode-in-season',
  title: 'Episode in this season',
  schemaType: 'episode',
  parameters: [{ name: 'seasonId', type: 'string' }],
  value: ({ seasonId }: { seasonId: string }) => ({
    season: { _type: 'reference', _ref: seasonId },
  }),
}
