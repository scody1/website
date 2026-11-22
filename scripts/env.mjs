// Minimal .env loader for the CLI scripts (Next.js loads these files itself at runtime).
import fs from 'node:fs';
import path from 'node:path';

export function loadEnv() {
  for (const file of ['.env.local', '.env']) {
    const p = path.resolve(process.cwd(), file);
    if (!fs.existsSync(p)) continue;
    for (const line of fs.readFileSync(p, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || line.trim().startsWith('#')) continue;
      let v = m[2];
      if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
      if (process.env[m[1]] === undefined) process.env[m[1]] = v;
    }
  }
}

export function connectionOptions(url) {
  let local = false;
  try {
    const h = new URL(url).hostname;
    local = h === 'localhost' || h === '127.0.0.1' || h === '::1';
  } catch {
    /* ignore */
  }
  const mode = process.env.DATABASE_SSL;
  return { ssl: mode === 'disable' || (mode !== 'require' && local) ? false : 'require', prepare: false, max: 1, onnotice: () => {} };
}
