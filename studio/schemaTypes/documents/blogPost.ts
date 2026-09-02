import { defineType, defineField, defineArrayMember } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { photoField } from '../shared/fields'

/**
 * A blog post — the thing Ricky actually logs in to do.
 *
 * Where a post lands on /blog is derived, not chosen:
 *
 *   no series  ->  a photo card in "Latest posts" at the top
 *   a series   ->  a row inside that series' section further down
 *
 * There is deliberately no "featured" switch. A switch is one more thing to get
 * wrong, and the placement already follows from what the post *is*: a standalone
 * piece, or the fourth instalment of something.
 */
export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  icon: DocumentTextIcon,
  groups: [
    { name: 'content', title: 'The post', default: true },
    { name: 'listing', title: 'How it is listed' },
  ],
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      group: 'content',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      group: 'content',
      description:
        'The end of the link, e.g. "life-after-the-snap". Press Generate to make one from the title. Changing it later breaks any link already shared.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) =>
        rule.required().custom(async (slug, context) => {
          if (!slug?.current) return true
          if (!/^[a-z0-9-]+$/.test(slug.current)) {
            return 'Use lowercase letters, numbers and hyphens only.'
          }
          // Two posts sharing a slug would silently overwrite each other's page
          // at build time, so it is caught here instead — where Ricky can see it.
          const client = context.getClient({ apiVersion: '2026-09-01' })
          const id = context.document?._id?.replace(/^drafts\./, '')
          const clash = await client.fetch(
            'count(*[_type == "blogPost" && slug.current == $slug && !(_id in [$id, "drafts." + $id])])',
            { slug: slug.current, id }
          )
          return clash === 0 || 'Another post already uses this web address.'
        }),
    }),
    defineField({
      name: 'dek',
      title: 'Standfirst',
      type: 'text',
      rows: 3,
      group: 'content',
      description:
        'The larger line under the title, shown on the post itself and on the blog page. Write it as a reason to keep reading.',
      validation: (rule) =>
        rule
          .required()
          .max(200)
          .warning('Over 200 characters will crowd the card on the blog page.'),
    }),

    defineField({
      name: 'body',
      title: 'The post',
      type: 'array',
      group: 'content',
      description:
        'Write here. Use Heading to break up a long piece, and Quote to pull out a line.',
      of: [
        defineArrayMember({
          type: 'block',
          /**
           * Narrower than Sanity's default, and narrower than it first looks
           * like it should be.
           *
           * The article page is rendered from the design's own template, which
           * has markup for exactly three things: a paragraph, a heading and a
           * pull quote. Anything offered here that the template cannot render
           * would be written by Ricky and then quietly vanish from the page.
           * Bulleted lists and sub-subheadings are a small addition to the
           * design, not a schema change — until they exist there, they are not
           * offered here.
           */
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [],
          marks: {
            decorators: [
              { title: 'Bold', value: 'strong' },
              { title: 'Italic', value: 'em' },
            ],
            annotations: [
              defineArrayMember({
                name: 'link',
                type: 'object',
                title: 'Link',
                fields: [
                  defineField({
                    name: 'href',
                    type: 'url',
                    title: 'Link to',
                    validation: (rule) =>
                      rule.required().uri({ scheme: ['http', 'https', 'mailto'] }),
                  }),
                ],
              }),
            ],
          },
        }),
      ],
      validation: (rule) =>
        rule.required().min(1).error('A post needs something in it.'),
    }),

    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      group: 'listing',
      description:
        'The small red label above the title. For a post in a series, use the series name.',
      options: {
        list: [
          { title: 'Leadership', value: 'Leadership' },
          { title: 'Mentorship', value: 'Mentorship' },
          { title: 'The game', value: 'The game' },
          { title: 'Community', value: 'Community' },
          { title: 'Perspective', value: 'Perspective' },
          { title: 'Seven lessons', value: 'Seven lessons' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'datetime',
      group: 'listing',
      description: 'Standalone posts are listed newest first.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'series',
      title: 'Part of a series',
      type: 'reference',
      group: 'listing',
      to: [{ type: 'series' }],
      description:
        'Leave this empty for a standalone post — it gets a photo card at the top of the blog page. Choose a series and it becomes a row in that section instead.',
    }),
    defineField({
      name: 'numberInSeries',
      title: 'Number in the series',
      type: 'number',
      group: 'listing',
      description:
        'Shown at the left of the row: 4 becomes "04". Leave empty for a series that is not numbered. Gaps are fine — the lessons run 01, 03, 04 … because there is no post for 02.',
      hidden: ({ parent }) => !parent?.series,
      validation: (rule) => rule.integer().positive(),
    }),
    photoField({
      name: 'coverImage',
      title: 'Card photograph',
      description:
        'Shown on the blog page card, and when the post is shared on social. Only standalone posts get a card, but it is worth setting either way.',
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
    {
      title: 'By series',
      name: 'seriesAsc',
      by: [
        { field: 'series.title', direction: 'asc' },
        { field: 'numberInSeries', direction: 'asc' },
      ],
    },
  ],
  preview: {
    select: {
      title: 'title',
      category: 'category',
      seriesTitle: 'series.title',
      number: 'numberInSeries',
      date: 'publishedAt',
      media: 'coverImage',
    },
    prepare: ({ title, category, seriesTitle, number, date, media }) => ({
      title,
      media,
      subtitle: [
        seriesTitle
          ? `${seriesTitle}${number ? ` · ${String(number).padStart(2, '0')}` : ''}`
          : category,
        date ? new Date(date).toLocaleDateString('en-US') : null,
      ]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
