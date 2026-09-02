// Shared objects, used inside the documents below.
import { pageHero } from './objects/pageHero'
import { contentSection } from './objects/contentSection'
import { linkCta } from './objects/linkCta'

// Collections — the things Ricky adds to over time.
import { blogPost } from './documents/blogPost'
import { series } from './documents/series'
import { newsItem } from './documents/newsItem'
import { episode } from './documents/episode'
import { talk } from './documents/talk'

// Singletons — one document each, pinned by ID in structure/index.ts.
import { siteSettings } from './documents/siteSettings'
import { homePage } from './singletons/homePage'
import { aboutPage } from './singletons/aboutPage'
import { speakingPage } from './singletons/speakingPage'
import { huddlePage } from './singletons/huddlePage'
import {
  newsPage,
  blogPage,
  communityPage,
  contactPage,
} from './singletons/simplePages'

/**
 * Every singleton type. There is no `singleton: true` option in Sanity — a
 * singleton is a convention held up by three things, and this list feeds two of
 * them: the "create new" filters in sanity.config.ts, and the fixed document
 * IDs in structure/index.ts. Adding a page type without adding it here gives
 * Ricky a + button that quietly creates a second About page.
 */
export const SINGLETON_TYPES = [
  'siteSettings',
  'homePage',
  'aboutPage',
  'speakingPage',
  'huddlePage',
  'newsPage',
  'blogPage',
  'communityPage',
  'contactPage',
] as const

export const schemaTypes = [
  pageHero,
  contentSection,
  linkCta,

  blogPost,
  series,
  newsItem,
  episode,
  talk,

  siteSettings,
  homePage,
  aboutPage,
  speakingPage,
  huddlePage,
  newsPage,
  blogPage,
  communityPage,
  contactPage,
]
