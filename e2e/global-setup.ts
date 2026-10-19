// Seeds a fresh shared-editing database with two editor accounts before the
// suite runs. The preview server opens the database lazily on its first API
// request, which only happens once tests start.
import { execFileSync } from 'node:child_process';
import { rmSync } from 'node:fs';
import { E2E_DB_PATH, EDITORS } from './constants.ts';

export default function globalSetup() {
  rmSync('e2e/.data', { recursive: true, force: true });
  for (const editor of EDITORS) {
    execFileSync(
      process.execPath,
      [
        '--disable-warning=ExperimentalWarning',
        'scripts/add-editor.ts',
        editor.username,
        editor.displayName,
      ],
      {
        env: {
          ...process.env,
          NOESIS_DB_PATH: E2E_DB_PATH,
          NOESIS_EDITOR_PASSWORD: editor.password,
        },
        stdio: 'pipe',
      }
    );
  }
}
