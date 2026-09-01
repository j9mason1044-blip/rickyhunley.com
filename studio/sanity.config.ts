import { defineConfig } from 'sanity'
import { structureTool } from 'sanity/structure'
import { visionTool } from '@sanity/vision'

import { schemaTypes } from './schemaTypes'
import { structure } from './structure'

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

    // Hide the singleton from global "create new" menus. Structure pins it to a
    // fixed document ID; this stops a second one being created from the + button.
    templates: (prev) => prev.filter((t) => t.schemaType !== 'siteSettings'),
  },

  document: {
    // Same reason, for the "Create new document" action list.
    newDocumentOptions: (prev) =>
      prev.filter((item) => item.templateId !== 'siteSettings'),

    actions: (prev, { schemaType }) =>
      schemaType === 'siteSettings'
        ? prev.filter(({ action }) => action !== 'unpublish' && action !== 'delete')
        : prev,
  },
})
