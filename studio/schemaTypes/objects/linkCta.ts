import { defineType, defineField } from 'sanity'
import { LinkIcon } from '@sanity/icons/Link'

/**
 * A button. Two fields, because a button with no destination is the single
 * easiest thing to ship broken — the Eventbrite CTA on /huddle spent its first
 * release pointing at "#", which is why `build-static.js` drops the whole link
 * when the URL is empty rather than rendering a dead button.
 */
export const linkCta = defineType({
  name: 'linkCta',
  title: 'Button',
  type: 'object',
  icon: LinkIcon,
  fields: [
    defineField({
      name: 'label',
      title: 'Button text',
      type: 'string',
      description: 'Short and active, e.g. "Book Ricky" or "See upcoming dates".',
      validation: (rule) =>
        rule.required().max(28).warning('Long labels break the button onto two lines.'),
    }),
    defineField({
      name: 'url',
      title: 'Where it goes',
      type: 'url',
      description:
        'A full web address, or an email link like mailto:connect@rickyhunley.com. Leave this empty and the button is hidden rather than shown broken.',
      validation: (rule) =>
        rule.uri({ scheme: ['http', 'https', 'mailto'], allowRelative: true }),
    }),
  ],
  preview: {
    select: { title: 'label', subtitle: 'url' },
  },
})
