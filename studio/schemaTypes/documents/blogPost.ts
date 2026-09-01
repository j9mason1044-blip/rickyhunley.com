import { defineType, defineField, defineArrayMember } from 'sanity'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'

/**
 * A blog post. The three currently on /blog are design placeholders — the page
 * says so out loud — so these are the first documents worth making real.
 *
 * `body` has no home on the site yet: the design has cards on /blog but no
 * detail page to click through to. The field is here because a post without a
 * body is not a post, and because the detail page is a small piece of design
 * work rather than a schema change.
 */
export const blogPost = defineType({
  name: 'blogPost',
  title: 'Blog Post',
  type: 'document',
  icon: DocumentTextIcon,
  fields: [
    defineField({
      name: 'title',
      title: 'Title',
      type: 'string',
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'slug',
      title: 'Web address',
      type: 'slug',
      description:
        'The end of the link for this post. Click Generate to make one from the title.',
      options: { source: 'title', maxLength: 96 },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'The small label above the title on the blog page.',
      options: {
        list: [
          { title: 'Leadership', value: 'Leadership' },
          { title: 'Mentorship', value: 'Mentorship' },
          { title: 'The game', value: 'The game' },
          { title: 'Community', value: 'Community' },
        ],
      },
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'publishedAt',
      title: 'Date',
      type: 'datetime',
      description: 'Posts are listed newest first.',
      initialValue: () => new Date().toISOString(),
      validation: (rule) => rule.required(),
    }),
    defineField({
      name: 'excerpt',
      title: 'Summary',
      type: 'text',
      rows: 3,
      description:
        'The couple of lines shown under the title on the blog page. Write it as a reason to click.',
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
      description:
        'Not shown on the site yet — the blog page lists posts but has no page to open. Write here anyway; nothing is lost.',
      of: [
        defineArrayMember({
          type: 'block',
          // Deliberately narrow. The client can structure writing, not restyle
          // the site: no colours, no font choices, no custom blocks.
          styles: [
            { title: 'Normal', value: 'normal' },
            { title: 'Heading', value: 'h2' },
            { title: 'Subheading', value: 'h3' },
            { title: 'Quote', value: 'blockquote' },
          ],
          lists: [
            { title: 'Bulleted', value: 'bullet' },
            { title: 'Numbered', value: 'number' },
          ],
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
    }),
  ],
  orderings: [
    {
      title: 'Newest first',
      name: 'publishedAtDesc',
      by: [{ field: 'publishedAt', direction: 'desc' }],
    },
  ],
  preview: {
    select: { title: 'title', subtitle: 'category', date: 'publishedAt' },
    prepare: ({ title, subtitle, date }) => ({
      title,
      subtitle: [subtitle, date ? new Date(date).toLocaleDateString() : null]
        .filter(Boolean)
        .join(' · '),
    }),
  },
})
