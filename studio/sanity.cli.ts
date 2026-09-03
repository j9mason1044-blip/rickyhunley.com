import { defineCliConfig } from 'sanity/cli'

export default defineCliConfig({
  api: {
    projectId: '0m77etlx',
    dataset: 'production',
  },

  // Pinned so `sanity deploy` is unattended and always targets the studio Ricky
  // has bookmarked — https://rickyhunley.sanity.studio. Without it the CLI
  // prompts for an application, and answering wrong publishes a second studio
  // at a different URL while the first goes stale.
  deployment: {
    appId: 'nhq9z1u55k617j7gfrqf39g9',
  },
})
