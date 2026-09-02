import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes, SINGLETON_TYPES } from './schemaTypes'
import { structure } from './structure'

const isSingleton = (type?: string) =>
  SINGLETON_TYPES.includes(type as (typeof SINGLETON_TYPES)[number])

export default defineConfig({
  name: 'default',
  title: 'RickyHunley.com',

  projectId: '0m77etlx',
  dataset: 'production',

  plugins: [
    structureTool({ structure }),
    // Vision is the GROQ query playground. Useful while building, and harmless
    // to leave in — it is read-only and only visible to logged-in members.
    visionTool({ defaultApiVersion: '2026-09-01' }),
  ],

  schema: {
    types: schemaTypes,

    // Keep the singletons out of the global "create new" menus. Structure pins
    // each to a fixed document ID; this stops a second one being made from the
    // + button, which would be invisible on the site and confusing in the Studio.
    templates: (prev) => prev.filter((t) => !isSingleton(t.schemaType)),
  },

  document: {
    // Same reason, for the "Create new document" action list.
    newDocumentOptions: (prev) =>
      prev.filter((item) => !isSingleton(item.templateId)),

    // A page cannot be deleted or unpublished — the site expects it to exist,
    // and a build against a missing About page should not be possible from a
    // menu Ricky can reach by accident.
    actions: (prev, { schemaType }) =>
      isSingleton(schemaType)
        ? prev.filter(({ action }) => action !== 'unpublish' && action !== 'delete')
        : prev,
  },
})
