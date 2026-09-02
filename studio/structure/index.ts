import type { StructureResolver } from 'sanity/structure'
import { CogIcon } from '@sanity/icons/Cog'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { BlockquoteIcon } from '@sanity/icons/Blockquote'
import { LinkIcon } from '@sanity/icons/Link'
import { PlayIcon } from '@sanity/icons/Play'
import { PresentationIcon } from '@sanity/icons/Presentation'
import { DocumentsIcon } from '@sanity/icons/Documents'

import { SINGLETON_TYPES } from '../schemaTypes'

/**
 * Ricky's navigation.
 *
 * Ordered by how often he will actually touch things: writing first, then the
 * lists that grow, then the page text he will edit a few times a year, then
 * settings he may never open. "Write a post" should be the first thing on the
 * screen and two clicks deep at most.
 *
 * The page documents are singletons — one each, pinned to a fixed ID, no
 * "create new" button. Sanity has no schema option for that; it is enforced
 * here by naming the document ID, and in sanity.config.ts by filtering the
 * type out of the creation menus.
 */

/** A singleton's document ID is its type name. One document, one known address. */
const singleton = (
  S: Parameters<StructureResolver>[0],
  type: string,
  title: string
) =>
  S.listItem()
    .id(type)
    .title(title)
    .child(S.document().schemaType(type).documentId(type).title(title))

/** Types given an explicit item below, so the catch-all must skip them. */
const HANDLED = [
  ...SINGLETON_TYPES,
  'blogPost',
  'series',
  'newsItem',
  'episode',
  'talk',
]

export const structure: StructureResolver = (S) =>
  S.list()
    .title('RickyHunley.com')
    .items([
      S.listItem()
        .title('Blog Posts')
        .icon(DocumentTextIcon)
        .child(
          S.documentTypeList('blogPost')
            .title('Blog Posts')
            .defaultOrdering([{ field: 'publishedAt', direction: 'desc' }])
        ),

      S.listItem()
        .title('Series')
        .icon(BlockquoteIcon)
        .child(
          S.documentTypeList('series')
            .title('Series')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
        ),

      S.divider(),

      S.listItem()
        .title('News')
        .icon(LinkIcon)
        .child(S.documentTypeList('newsItem').title('News')),

      S.listItem()
        .title('Podcast Episodes')
        .icon(PlayIcon)
        .child(
          S.documentTypeList('episode')
            .title('Podcast Episodes')
            .defaultOrdering([{ field: 'episodeNumber', direction: 'desc' }])
        ),

      S.listItem()
        .title('Signature Talks')
        .icon(PresentationIcon)
        .child(
          S.documentTypeList('talk')
            .title('Signature Talks')
            .defaultOrdering([{ field: 'order', direction: 'asc' }])
        ),

      S.divider(),

      // One entry per page, in the order they appear in the site's navigation.
      S.listItem()
        .id('pages')
        .title('Page text & photos')
        .icon(DocumentsIcon)
        .child(
          S.list()
            .title('Page text & photos')
            .items([
              singleton(S, 'homePage', 'Home'),
              singleton(S, 'aboutPage', 'About'),
              singleton(S, 'speakingPage', 'Speaking'),
              singleton(S, 'huddlePage', 'The Hunley Huddle'),
              singleton(S, 'communityPage', 'Community'),
              singleton(S, 'newsPage', 'News'),
              singleton(S, 'blogPage', 'Blog'),
              singleton(S, 'contactPage', 'Contact'),
            ])
        ),

      S.divider(),

      S.listItem()
        .id('siteSettings')
        .title('Site Settings')
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),

      // Anything added to the schema later shows up here automatically, without
      // duplicating what is already listed above.
      ...S.documentTypeListItems().filter(
        (item) => !HANDLED.includes(item.getId() as string)
      ),
    ])
