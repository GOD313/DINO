import { existsSync } from 'node:fs';
const required = ['public/index.html', 'public/ports/mehr-hiring/index.html', 'netlify/functions/api.mjs', 'netlify.toml'];
const missing = required.filter((file) => !existsSync(file));
if (missing.length) {
  console.error('Missing required files:', missing.join(', '));
  process.exit(1);
}
console.log('KaratShod Netlify build check passed.');
