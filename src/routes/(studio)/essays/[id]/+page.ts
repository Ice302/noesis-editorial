import { error } from '@sveltejs/kit';
import { ESSAYS_DB } from '#lib/data/essayContent.js';
import type { EntryGenerator, PageLoad } from './$types';

/** Prerender one HTML page per essay. */
export const entries: EntryGenerator = () => ESSAYS_DB.map((essay) => ({ id: essay.id }));

export const load: PageLoad = ({ params }) => {
  const essay = ESSAYS_DB.find((e) => e.id === params.id);
  if (!essay) error(404, 'No essay with that catalogue number exists in the archive.');
  return { essay };
};
