import { defineType, defineField } from 'sanity'
import { BellIcon } from '@sanity/icons/Bell'

/**
 * The strip across the top of the home page, above the photograph — the one
 * place on the site that can say "the next Football 101 is on the 14th" without
 * anybody rewriting a page.
 *
 * Three things make it work: a switch, a sentence, and somewhere to send people.
 * Everything else about it — the colour, the type, the hover — belongs to the
 * design and is not editable here, so a banner switched on in a hurry still
 * looks like the rest of the site.
 *
 * It is off by default and it stays off until Ricky turns it on. A promotional
 * band for an event that has already happened is worse than no band at all, so
 * the *removal* has to be as easy as the addition: one toggle, no deploy.
 */
export const eventBanner = defineType({
  name: 'eventBanner',
  title: 'Event banner',
  type: 'object',
  icon: BellIcon,
  fields: [
    defineField({
      name: 'enabled',
      title: 'Show the banner',
      type: 'boolean',
      description:
        'Turn this on and the band appears across the top of the home page. Turn it off after the event and it disappears — the rest of the page is untouched either way.',
      // Deliberately not `required()`. On a boolean that means "must be true or
      // false, not unset", and the Home Page document predates this field — so
      // the first time Ricky typed anything in this tab he would be blocked
      // from publishing by an error about a switch he never touched. Unset
      // reads as off everywhere, which is the right default anyway.
      initialValue: false,
    }),
    defineField({
      name: 'eyebrow',
      title: 'Small label',
      type: 'string',
      description:
        'The few words in front of the message, e.g. "Football 101". Leave it empty and the message starts the line.',
      initialValue: 'Football 101',
      validation: (rule) =>
        rule.max(24).warning('Keep it to two or three words — it sits on one line.'),
    }),
    defineField({
      name: 'text',
      title: 'Message',
      type: 'string',
      description:
        'One sentence. Say when and where, e.g. "The next session is Saturday 8 November at the Tucson Convention Center."',
      validation: (rule) =>
        rule.max(110).warning('Past about 110 characters this wraps onto a second line on a phone.'),
    }),
    defineField({
      name: 'linkLabel',
      title: 'Button text',
      type: 'string',
      description: 'Short and active, e.g. "Get tickets" or "Reserve a seat".',
      initialValue: 'Get tickets',
      validation: (rule) =>
        rule.max(22).warning('Long labels push the button onto its own line.'),
    }),
    defineField({
      name: 'url',
      title: 'Where it goes',
      type: 'url',
      description:
        'The Eventbrite page, the registration form, or wherever tickets are sold. A full web address.',
      validation: (rule) =>
        rule.uri({ scheme: ['http', 'https', 'mailto'], allowRelative: true }),
    }),
  ],

  /**
   * The three fields below the switch are optional on their own and required
   * together, because the failure they prevent is specific: the banner is
   * switched on, one of them is blank, and the band either ships a sentence
   * nobody can act on or does not ship at all. The build drops an incomplete
   * banner rather than shipping a dead one — this is what makes that a message
   * in the Studio at the moment of publishing instead of a silent nothing.
   */
  validation: (rule) =>
    rule.custom((banner?: { enabled?: boolean; text?: string; linkLabel?: string; url?: string }) => {
      if (!banner || !banner.enabled) return true
      const missing = (
        [
          ['text', 'message'],
          ['linkLabel', 'button text'],
          ['url', 'link'],
        ] as const
      )
        .filter(([field]) => !String(banner[field] || '').trim())
        .map(([, label]) => label)
      if (!missing.length) return true
      return `The banner is switched on but has no ${missing.join(' and no ')}. Fill it in, or switch the banner off.`
    }),

  preview: {
    select: { enabled: 'enabled', eyebrow: 'eyebrow', text: 'text' },
    prepare: ({ enabled, eyebrow, text }) => ({
      title: enabled ? text || 'Switched on, but empty' : 'Off',
      subtitle: eyebrow,
    }),
  },
})
