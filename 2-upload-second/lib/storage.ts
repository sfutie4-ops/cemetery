import postgres from 'postgres';
import {rootCertificates} from 'node:tls';
import {SUPABASE_ROOT_CA} from './supabase-ca';

let connection: ReturnType<typeof postgres> | undefined;
function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Database connection is not configured.');
  return connection ??= postgres(url, {
    max: 2, prepare: false, ssl: {ca: [SUPABASE_ROOT_CA, ...rootCertificates], rejectUnauthorized: true},
    idle_timeout: 60, connect_timeout: 15,
  });
}

export class Statement {
  constructor(readonly query: string, readonly parameters: any[] = []) {}
  bind(...parameters: any[]) { return new Statement(this.query, parameters); }
  async all() { return (await execute([this]))[0]; }
  async run() { return this.all(); }
  async first() { return (await this.all()).results[0] ?? null; }
}

async function execute(statements: Statement[]): Promise<{results: any[]; meta: {changes: number}}[]> {
  return pool().begin(async tx => {
    if (statements.every(s => /^\s*SELECT\b/i.test(s.query))) {
      // Read-only batches are sent together in one network trip instead of one trip per query.
      const pending: Promise<any>[] = [tx.unsafe('SET LOCAL search_path TO cemetery, pg_catalog')];
      for (const statement of statements) {
        let index = 0;
        const query = statement.query.replace(/\?/g, () => '$' + ++index);
        if (index !== statement.parameters.length) throw new Error('Invalid database parameters.');
        pending.push(tx.unsafe(query, statement.parameters));
      }
      const [, ...sets] = await Promise.all(pending);
      return sets.map((rows: any) => ({results: [...rows], meta: {changes: rows.count}}));
    }
    await tx.unsafe('SET LOCAL search_path TO cemetery, pg_catalog');
    if (statements.some(s => !/^\s*SELECT\b/i.test(s.query))) {
      // A transaction-scoped lock serializes numbering and atomic form transfers.
      await tx.unsafe('SELECT pg_advisory_xact_lock(6761842026)');
    }
    const results = [];
    for (const statement of statements) {
      let index = 0;
      const query = statement.query.replace(/\?/g, () => '$' + ++index);
      if (index !== statement.parameters.length) throw new Error('Invalid database parameters.');
      const rows = await tx.unsafe(query, statement.parameters);
      results.push({results: [...rows], meta: {changes: rows.count}});
    }
    return results;
  }) as Promise<{results: any[]; meta: {changes: number}}[]>;
}

// Reads skip BEGIN / SET / COMMIT and go to the database as one message, so loading records is a single
// network round trip instead of four or more. Queries passed here must name their tables with the
// cemetery schema. Values are written into the text as safely quoted literals (simple query protocol).
function literal(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  if (typeof value === 'string' && !value.includes('\0')) return "'" + value.replace(/'/g, "''") + "'";
  throw new Error('Invalid database parameters.');
}
export async function readOnly(statements: Statement[]) {
  const text = statements.map(statement => {
    let index = 0;
    const query = statement.query.replace(/\?/g, () => literal(statement.parameters[index++]));
    if (index !== statement.parameters.length) throw new Error('Invalid database parameters.');
    return query;
  }).join(';\n');
  const result: any = await pool().unsafe(text);
  const sets: any[] = statements.length === 1 ? [result] : result;
  return sets.map((rows: any) => ({results: [...rows], meta: {changes: rows.count}}));
}

export function database() {
  return {prepare: (query: string) => new Statement(query), batch: execute};
}
