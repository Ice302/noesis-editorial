// Environment variables (SvelteKit 3). Set them in `.env` for local work or in
// your host's dashboard for production; see `.env.example`.
import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  SITE_URL: {
    public: true,
    static: true,
    description:
      'Public origin of the site, without a trailing slash (e.g. https://noesis.example). ' +
      'Used for canonical URLs, Open Graph tags and the RSS feed.',
    schema: (value) => (value || 'http://localhost:4173').replace(/\/+$/, ''),
  },
  NOESIS_DB_PATH: {
    description:
      'SQLite file for shared editing (editor accounts, sessions, revisions). ' +
      'Needs a persistent disk; defaults to data/noesis.db.',
    schema: (value) => value || 'data/noesis.db',
  },
});
