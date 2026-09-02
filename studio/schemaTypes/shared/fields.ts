import { defineField, defineArrayMember } from 'sanity'

/**
 * Field builders shared across the page singletons.
 *
 * These exist because most of RickyHunley.com is the same three ideas repeated:
 * a photograph, a heading with a paragraph under it, and a link. Defining them
 * once means every page describes them to Ricky in the same words.
 */

/**
 * A photograph.
 *
 * `hotspot` is not optional here. Every photograph on the site is cropped by
 * CSS to a fixed aspect ratio — 4:5 columns, 16:10 cards, full-bleed heroes —
 * and several of them carry a hand-tuned `object-position` because the subject
 * is off-centre. The hotspot is how Ricky sets that himself: he marks the face,
 * and the build turns the hotspot into the `object-position` the design expects.
 * Without it, every replacement photo is a coin flip on whether Ricky's head is
 * in the frame.
 */
export const photoField = (opts: {
  name: string
  title: string
  description: string
}) =>
  defineField({
    name: opts.name,
    title: opts.title,
    type: 'image',
    description: opts.description,
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Describe the photo',
        type: 'string',
        description:
          'For people using a screen reader, and for search engines. Say what is happening, e.g. "Ricky speaking to students at a Football 101 session".',
        validation: (rule) =>
          rule
            .required()
            .warning('Without this, the photo is invisible to screen readers.'),
      }),
    ],
  })

/**
 * A heading with body copy under it — the shape of nearly every section on
 * About, Community, Contact and Speaking.
 *
 * `body` is plain text rather than rich text on purpose. These sit inside a
 * fixed layout with typography tuned to them; a heading or a bulleted list
 * dropped in here would have nowhere to render. Rich text belongs in blog
 * posts, which have a template built for it.
 */
export const sectionsField = (opts: {
  name?: string
  title: string
  description: string
  max?: number
}) =>
  defineField({
    name: opts.name ?? 'sections',
    title: opts.title,
    type: 'array',
    description: opts.description,
    of: [{ type: 'contentSection' }],
    validation: (rule) =>
      opts.max
        ? rule.max(opts.max).warning(`More than ${opts.max} will crowd the page.`)
        : rule,
  })

/** The same photograph, as a member of an array — a gallery, a photo grid. */
export const photoMember = () =>
  defineArrayMember({
    type: 'image',
    name: 'photo',
    title: 'Photograph',
    options: { hotspot: true },
    fields: [
      defineField({
        name: 'alt',
        title: 'Describe the photo',
        type: 'string',
        description:
          'For people using a screen reader, and for search engines. Say what is happening in the picture.',
        validation: (rule) =>
          rule
            .required()
            .warning('Without this, the photo is invisible to screen readers.'),
      }),
    ],
  })
