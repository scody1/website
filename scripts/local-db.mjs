// Starts a throw-away local Postgres (PGlite, no install needed) on port 54329 for
// development and testing. Data is kept in ./.localdb. Not for production.
// Usage: npm run db:local   then use DATABASE_URL=postgres://postgres:postgres@127.0.0.1:54329/postgres
import { PGlite } from '@electric-sql/pglite';
import { PGLiteSocketServer } from '@electric-sql/pglite-socket';

const port = Number(process.env.LOCAL_DB_PORT || 54329);
const dataDir = process.env.LOCAL_DB_DIR || './.localdb';
const db = await PGlite.create(dataDir);
// PGlite is a single backend: keep the app's pool at 1 (DB_POOL_MAX=1) and leave one
// extra slot for migrate/seed scripts.
const server = new PGLiteSocketServer({ db, port, host: '127.0.0.1', maxConnections: Number(process.env.LOCAL_DB_MAX_CONNECTIONS || 2) });
await server.start();
console.log(`Local Postgres (PGlite) ready on 127.0.0.1:${port} — data in ${dataDir}`);
console.log(`DATABASE_URL=postgres://postgres:postgres@127.0.0.1:${port}/postgres`);

const stop = async () => {
  await server.stop();
  await db.close();
  process.exit(0);
};
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
