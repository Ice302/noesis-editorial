/**
 * Process-wide store, opened lazily on the first API request so that
 * prerendering (which never calls the API) doesn't create a database file.
 */
import { NOESIS_DB_PATH } from '$app/env/private';
import { EditorialStore } from './store.ts';

let store: EditorialStore | undefined;

export function getStore(): EditorialStore {
  if (!store) {
    store = new EditorialStore(NOESIS_DB_PATH);
    store.purgeExpiredSessions();
  }
  return store;
}
