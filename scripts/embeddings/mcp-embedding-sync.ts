/**
 * MCP-Based Embedding Sync for RuVector PostgreSQL
 *
 * Uses claude-flow MCP tools to generate real embeddings (all-MiniLM-L6-v2, 384 dims)
 * Designed to be called from Claude Code or MCP client
 *
 * This module exports functions that can be used by the MCP server or Claude Code Task agents
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface EmbeddingConfig {
  postgresContainer: string;
  postgresUser: string;
  postgresDatabase: string;
  batchSize: number;
  dimension: number;
}

export interface SyncResult {
  success: boolean;
  processed: number;
  succeeded: number;
  failed: number;
  skipped: number;
  duration: number;
  message: string;
}

const DEFAULT_CONFIG: EmbeddingConfig = {
  postgresContainer: 'ruvector-postgres',
  postgresUser: 'ruvector',
  postgresDatabase: 'ruvector',
  batchSize: 50,
  dimension: 384
};

async function runPsql(config: EmbeddingConfig, query: string): Promise<string> {
  const escapedQuery = query.replace(/'/g, "'\\''");
  const cmd = `docker exec ${config.postgresContainer} psql -U ${config.postgresUser} -d ${config.postgresDatabase} -t -A -c '${escapedQuery}'`;
  const { stdout } = await execAsync(cmd, { maxBuffer: 50 * 1024 * 1024 });
  return stdout.trim();
}

function extractTextForEmbedding(valueJson: string): string {
  try {
    const parsed = JSON.parse(valueJson);
    const fields = [
      parsed.content, parsed.pattern, parsed.task, parsed.description,
      parsed.command, parsed.output, parsed.message, parsed.key, parsed.name,
      parsed.text, parsed.query, parsed.prompt
    ].filter(Boolean);

    return fields.length > 0
      ? fields.join(' ').substring(0, 500)
      : JSON.stringify(parsed).substring(0, 500);
  } catch {
    return valueJson.substring(0, 500);
  }
}

/**
 * Get entries that need embeddings
 */
export async function getEntriesNeedingEmbeddings(
  config: EmbeddingConfig = DEFAULT_CONFIG,
  limit: number = 100
): Promise<{ id: string; text: string }[]> {
  const query = `
    SELECT id, value::text
    FROM memory_entries
    WHERE embedding_json IS NULL
    ORDER BY created_at DESC
    LIMIT ${limit}
  `;

  const result = await runPsql(config, query);
  if (!result) return [];

  return result.split('\n').filter(Boolean).map(line => {
    const [id, ...valueParts] = line.split('|');
    const valueJson = valueParts.join('|');
    return {
      id,
      text: extractTextForEmbedding(valueJson)
    };
  });
}

/**
 * Update entry with embedding
 */
export async function updateEntryEmbedding(
  config: EmbeddingConfig = DEFAULT_CONFIG,
  id: string,
  embedding: number[]
): Promise<boolean> {
  const embeddingJson = JSON.stringify(embedding);
  const query = `
    UPDATE memory_entries
    SET embedding_json = '${embeddingJson}'::jsonb, updated_at = NOW()
    WHERE id = '${id}'
  `;

  try {
    await runPsql(config, query);
    return true;
  } catch {
    return false;
  }
}

/**
 * Get embedding statistics
 */
export async function getEmbeddingStats(
  config: EmbeddingConfig = DEFAULT_CONFIG
): Promise<{ total: number; withEmbeddings: number; missing: number }> {
  const query = `
    SELECT
      COUNT(*) as total,
      COUNT(embedding_json) as with_embeddings,
      COUNT(*) - COUNT(embedding_json) as missing
    FROM memory_entries
  `;

  const result = await runPsql(config, query);
  const [total, withEmbeddings, missing] = result.split('|').map(Number);
  return { total, withEmbeddings, missing };
}

/**
 * Sync embeddings using provided embedding function
 * This is designed to be called with the MCP embeddings_generate function
 */
export async function syncEmbeddings(
  generateEmbedding: (text: string) => Promise<number[] | null>,
  options: {
    config?: EmbeddingConfig;
    limit?: number;
    onProgress?: (current: number, total: number) => void;
  } = {}
): Promise<SyncResult> {
  const config = options.config || DEFAULT_CONFIG;
  const limit = options.limit || 1000;
  const startTime = Date.now();

  const stats = {
    processed: 0,
    succeeded: 0,
    failed: 0,
    skipped: 0
  };

  const entries = await getEntriesNeedingEmbeddings(config, limit);
  const total = entries.length;

  for (const entry of entries) {
    stats.processed++;

    if (entry.text.length < 3) {
      stats.skipped++;
      continue;
    }

    try {
      const embedding = await generateEmbedding(entry.text);
      if (!embedding || embedding.length !== config.dimension) {
        stats.failed++;
        continue;
      }

      const success = await updateEntryEmbedding(config, entry.id, embedding);
      if (success) {
        stats.succeeded++;
      } else {
        stats.failed++;
      }
    } catch {
      stats.failed++;
    }

    if (options.onProgress) {
      options.onProgress(stats.processed, total);
    }
  }

  const duration = (Date.now() - startTime) / 1000;

  return {
    success: stats.failed === 0,
    processed: stats.processed,
    succeeded: stats.succeeded,
    failed: stats.failed,
    skipped: stats.skipped,
    duration,
    message: `Synced ${stats.succeeded}/${stats.processed} entries in ${duration.toFixed(2)}s`
  };
}

// Export for direct usage
export default {
  getEntriesNeedingEmbeddings,
  updateEntryEmbedding,
  getEmbeddingStats,
  syncEmbeddings,
  DEFAULT_CONFIG
};
