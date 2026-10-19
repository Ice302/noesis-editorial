import { ESSAYS_DB } from '#lib/data/essayContent.js';
import type { PageLoad } from './$types';

// The home page opens the studio on the issue's first essay.
export const load: PageLoad = () => ({ essay: ESSAYS_DB[0] });
