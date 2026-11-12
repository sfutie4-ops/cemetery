import postgres from 'postgres';

let connection: ReturnType<typeof postgres> | undefined;
function pool() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error('Database connection is not configured.');
  return connection ??= postgres(url, {
    max: 2, prepare: false, ssl: 'verify-full',
    idle_timeout: 20, connect_timeout: 15,
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

export function database() {
  return {prepare: (query: string) => new Statement(query), batch: execute};
}
