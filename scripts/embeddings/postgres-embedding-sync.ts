/**
 * PostgreSQL Embedding Sync for RuVector
 *
 * Generates embeddings for entries with NULL embedding_json using
 * claude-flow's ONNX-based embedding system (all-MiniLM-L6-v2, 384 dimensions)
 *
 * Usage:
 *   npx tsx scripts/embeddings/postgres-embedding-sync.ts
 *
 * Environment:
 *   POSTGRES_HOST=localhost (default: localhost via docker)
 *   POSTGRES_PORT=5432 (default: 5432)
 *   POSTGRES_USER=ruvector
 *   POSTGRES_PASSWORD=ruvector_secure_pass
 *   POSTGRES_DB=ruvector
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

interface EmbeddingResult {
  success: boolean;
  embedding?: number[];
  metadata?: {
    model: string;
    dimension: number;
    geometry: string;
    norm: number;
  };
  error?: string;
}

interface DbEntry {
  id: string;
  text_content: string;
  table_name: string;
}

const POSTGRES_CONFIG = {
  host: process.env.POSTGRES_HOST || 'localhost',
  port: process.env.POSTGRES_PORT || '5432',
  user: process.env.POSTGRES_USER || 'ruvector',
  password: process.env.POSTGRES_PASSWORD || 'ruvector_secure_pass',
  database: process.env.POSTGRES_DB || 'ruvector',
  container: 'ruvector-postgres'
};

async function runPsqlQuery(query: string): Promise<string> {
  const escapedQuery = query.replace(/"/g, '\\"').replace(/'/g, "'\\''");
  const cmd = `docker exec ${POSTGRES_CONFIG.container} psql -U ${POSTGRES_CONFIG.user} -d ${POSTGRES_CONFIG.database} -t -A -c "${escapedQuery}"`;

  try {
    const { stdout, stderr } = await execAsync(cmd);
    if (stderr && !stderr.includes('NOTICE')) {
      console.error('PostgreSQL warning:', stderr);
    }
    return stdout.trim();
  } catch (error: any) {
    throw new Error(`PostgreSQL query failed: ${error.message}`);
  }
}

async function generateEmbedding(text: string): Promise<EmbeddingResult> {
  // Use MCP tool via CLI to generate embeddings
  const escapedText = text.replace(/"/g, '\\"').replace(/\n/g, ' ').substring(0, 512);

  try {
    // Call claude-flow embeddings via MCP
    const cmd = `npx @claude-flow/cli@latest embeddings embed --text "${escapedText}" --format json 2>/dev/null`;
    const { stdout } = await execAsync(cmd, { timeout: 30000 });

    const result = JSON.parse(stdout);
    if (result.success && result.embedding) {
      return {
        success: true,
        embedding: result.embedding,
        metadata: result.metadata
      };
    }
    return { success: false, error: 'No embedding in response' };
  } catch (error: any) {
    // Fallback: use memory store which triggers embedding
    console.log(`  Using fallback embedding method for: ${text.substring(0, 50)}...`);
    return { success: false, error: error.message };
  }
}

async function getEntriesWithoutEmbeddings(tableName: string, textColumn: string): Promise<DbEntry[]> {
  const query = `
    SELECT id, ${textColumn} as text_content
    FROM ${tableName}
    WHERE embedding_json IS NULL
    LIMIT 100
  `;

  const result = await runPsqlQuery(query);
  if (!result) return [];

  return result.split('\n').filter(Boolean).map(line => {
    const [id, ...textParts] = line.split('|');
    return {
      id,
      text_content: textParts.join('|'),
      table_name: tableName
    };
  });
}

async function updateEmbedding(tableName: string, id: string, embedding: number[]): Promise<boolean> {
  const embeddingJson = JSON.stringify(embedding);
  const query = `
    UPDATE ${tableName}
    SET embedding_json = '${embeddingJson}'::jsonb,
        updated_at = NOW()
    WHERE id = '${id}'
  `;

  try {
    await runPsqlQuery(query);
    return true;
  } catch (error) {
    console.error(`Failed to update ${tableName}.${id}:`, error);
    return false;
  }
}

async function syncEmbeddings(): Promise<{
  processed: number;
  succeeded: number;
  failed: number;
  tables: Record<string, { processed: number; succeeded: number }>;
}> {
  const stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    tables: {} as Record<string, { processed: number; succeeded: number }>
  };

  // Table configurations: table_name -> text column to embed
  const tableConfigs = [
    { table: 'patterns', textColumn: 'pattern' },
    { table: 'memory_entries', textColumn: "value->>'content'" },
    { table: 'trajectories', textColumn: 'task' }
  ];

  console.log('Starting embedding sync for RuVector PostgreSQL...\n');
  console.log(`Config: ${POSTGRES_CONFIG.container}/${POSTGRES_CONFIG.database}`);
  console.log('Model: all-MiniLM-L6-v2 (384 dimensions)\n');

  for (const config of tableConfigs) {
    console.log(`Processing table: ${config.table}`);
    stats.tables[config.table] = { processed: 0, succeeded: 0 };

    try {
      const entries = await getEntriesWithoutEmbeddings(config.table, config.textColumn);
      console.log(`  Found ${entries.length} entries without embeddings`);

      for (const entry of entries) {
        stats.processed++;
        stats.tables[config.table].processed++;

        if (!entry.text_content || entry.text_content.trim().length < 3) {
          console.log(`  Skipping ${entry.id}: insufficient text content`);
          stats.failed++;
          continue;
        }

        const result = await generateEmbedding(entry.text_content);

        if (result.success && result.embedding) {
          const updated = await updateEmbedding(config.table, entry.id, result.embedding);
          if (updated) {
            stats.succeeded++;
            stats.tables[config.table].succeeded++;
            console.log(`  [OK] ${entry.id}: embedded (${result.embedding.length} dims)`);
          } else {
            stats.failed++;
          }
        } else {
          stats.failed++;
          console.log(`  [FAIL] ${entry.id}: ${result.error}`);
        }

        // Rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    } catch (error: any) {
      console.error(`  Error processing ${config.table}:`, error.message);
    }

    console.log('');
  }

  return stats;
}

async function getEmbeddingStats(): Promise<void> {
  console.log('Current embedding statistics:\n');

  const tables = ['patterns', 'memory_entries', 'trajectories'];

  for (const table of tables) {
    try {
      const result = await runPsqlQuery(`
        SELECT
          COUNT(*) as total,
          COUNT(embedding_json) as with_embeddings,
          COUNT(*) - COUNT(embedding_json) as missing
        FROM ${table}
      `);

      if (result) {
        const [total, withEmb, missing] = result.split('|');
        console.log(`  ${table}:`);
        console.log(`    Total: ${total}, With embeddings: ${withEmb}, Missing: ${missing}`);
      }
    } catch (error) {
      console.log(`  ${table}: (table not accessible)`);
    }
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);

  if (args.includes('--stats')) {
    await getEmbeddingStats();
    return;
  }

  if (args.includes('--help')) {
    console.log(`
PostgreSQL Embedding Sync for RuVector

Usage:
  npx tsx scripts/embeddings/postgres-embedding-sync.ts [options]

Options:
  --stats    Show current embedding statistics
  --help     Show this help message

Environment Variables:
  POSTGRES_HOST      PostgreSQL host (default: localhost)
  POSTGRES_PORT      PostgreSQL port (default: 5432)
  POSTGRES_USER      PostgreSQL user (default: ruvector)
  POSTGRES_PASSWORD  PostgreSQL password
  POSTGRES_DB        PostgreSQL database (default: ruvector)
`);
    return;
  }

  // Run sync
  const startTime = Date.now();
  const stats = await syncEmbeddings();
  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('='.repeat(50));
  console.log('Embedding Sync Complete');
  console.log('='.repeat(50));
  console.log(`Duration: ${duration}s`);
  console.log(`Processed: ${stats.processed}`);
  console.log(`Succeeded: ${stats.succeeded}`);
  console.log(`Failed: ${stats.failed}`);
  console.log(`Success Rate: ${stats.processed > 0 ? ((stats.succeeded / stats.processed) * 100).toFixed(1) : 0}%`);

  console.log('\nPer-table breakdown:');
  for (const [table, tableStats] of Object.entries(stats.tables)) {
    console.log(`  ${table}: ${tableStats.succeeded}/${tableStats.processed}`);
  }
}

main().catch(console.error);
