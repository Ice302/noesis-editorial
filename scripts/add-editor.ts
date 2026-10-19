/**
 * Creates an editor account (or resets an existing editor's password).
 *
 *   npm run editor:add -- <username> "<Display Name>"
 *   npm run editor:add -- <username> --reset
 *
 * The password is read from NOESIS_EDITOR_PASSWORD if set (for scripts/CI),
 * otherwise prompted for without echo. The database path comes from
 * NOESIS_DB_PATH (default data/noesis.db), loaded from .env if present.
 *
 * Runs directly on Node ≥ 22.18 thanks to built-in TypeScript type stripping.
 */
import { createInterface } from 'node:readline';
import { stdin, stdout, exit, env, argv } from 'node:process';
import { EditorialStore } from '../src/lib/server/store.ts';
import { PASSWORD_MIN_LENGTH, USERNAME_RE, hashPassword } from '../src/lib/server/auth.ts';

function usage(message?: string): never {
  if (message) console.error(`\n  ${message}\n`);
  console.error('  Usage: npm run editor:add -- <username> "<Display Name>"');
  console.error('         npm run editor:add -- <username> --reset\n');
  exit(1);
}

/** Prompts for a password without echoing it to the terminal. */
function promptHidden(question: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = createInterface({ input: stdin, output: stdout, terminal: true });
    const write = (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput;
    (rl as unknown as { _writeToOutput: (s: string) => void })._writeToOutput = (s: string) => {
      write.call(rl, s.startsWith(question) ? s : '');
    };
    rl.question(question, (answer) => {
      rl.close();
      stdout.write('\n');
      resolve(answer);
    });
  });
}

const [username, nameOrFlag] = argv.slice(2);
const reset = nameOrFlag === '--reset';
if (!username || !nameOrFlag) usage();
if (!USERNAME_RE.test(username)) {
  usage('Username must be 2–32 characters: letters, digits, dot, dash or underscore.');
}

let password = env.NOESIS_EDITOR_PASSWORD ?? '';
if (!password) {
  password = await promptHidden(`Password for ${username}: `);
  const again = await promptHidden('Repeat password: ');
  if (password !== again) usage('Passwords do not match.');
}
if (password.length < PASSWORD_MIN_LENGTH) {
  usage(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`);
}

const dbPath = env.NOESIS_DB_PATH || 'data/noesis.db';
const store = new EditorialStore(dbPath);
const hash = await hashPassword(password);

try {
  if (reset) {
    if (!store.setPassword(username, hash)) usage(`No editor named "${username}".`);
    console.log(`Password reset for ${username} (${dbPath}).`);
  } else {
    if (store.findUser(username))
      usage(`"${username}" already exists. Use --reset to change the password.`);
    store.createUser(username, nameOrFlag.trim() || username, hash);
    console.log(`Created editor ${username} (${dbPath}).`);
  }
} finally {
  store.close();
}
