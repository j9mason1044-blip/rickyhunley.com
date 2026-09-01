import type { StructureResolver } from 'sanity/structure'
import { CogIcon } from '@sanity/icons/Cog'
import { DocumentTextIcon } from '@sanity/icons/DocumentText'
import { LinkIcon } from '@sanity/icons/Link'
import { PlayIcon } from '@sanity/icons/Play'

/**
 * Ricky's navigation. Ordered by how often he will actually touch things:
 * writing first, then the two link lists, then settings he may never open.
 *
 * Site Settings is a singleton — one document, fixed ID, no "create new"
 * button. There is no `singleton: true` schema option; it is enforced here by
 * pinning the document ID and excluding the type from the generic list below.
 */
/** Types given an explicit list item above, so the catch-all must skip them. */
const HANDLED = ['siteSettings', 'blogPost', 'newsItem', 'episode']

export const structure: StructureResolver = (S) =>
  S.list()
    .title('RickyHunley.com')
    .items([
      S.listItem()
        .title('Blog Posts')
        .icon(DocumentTextIcon)
        .child(S.documentTypeList('blogPost').title('Blog Posts')),

      S.listItem()
        .title('News')
        .icon(LinkIcon)
        .child(S.documentTypeList('newsItem').title('News')),

      S.listItem()
        .title('Podcast Episodes')
        .icon(PlayIcon)
        .child(S.documentTypeList('episode').title('Podcast Episodes')),

      S.divider(),

      S.listItem()
        .title('Site Settings')
        .icon(CogIcon)
        .child(
          S.document()
            .schemaType('siteSettings')
            .documentId('siteSettings')
            .title('Site Settings')
        ),

      // Anything added to the schema later shows up here automatically,
      // without duplicating what is already listed above.
      ...S.documentTypeListItems().filter(
        (item) => !HANDLED.includes(item.getId() as string)
      ),
    ])
