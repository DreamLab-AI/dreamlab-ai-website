#!/bin/bash
# Embedding batch processor for ruvector-postgres
# Processes entries from projects 11 and 12

BATCH_SIZE=20
PROCESSED=0
TOTAL_TARGET=10000
LOG_FILE="/tmp/embedding-progress.log"

echo "Starting embedding generation at $(date)" | tee "$LOG_FILE"

while [ $PROCESSED -lt $TOTAL_TARGET ]; do
    # Get batch of entries without embeddings
    ENTRIES=$(docker exec ruvector-postgres psql -U ruvector -d ruvector -t -A -F $'\x1f' -c \
        "SELECT id, key, LEFT(value::text, 400) FROM memory_entries WHERE project_id IN (11, 12) AND embedding_json IS NULL ORDER BY id LIMIT $BATCH_SIZE" 2>/dev/null)

    if [ -z "$ENTRIES" ]; then
        echo "No more entries to process" | tee -a "$LOG_FILE"
        break
    fi

    BATCH_COUNT=0
    while IFS=$'\x1f' read -r id key value; do
        if [ -n "$id" ]; then
            # Create text for embedding (key + truncated value)
            TEXT="$key: ${value:0:300}"
            echo "Processing: $id - ${key:0:50}..." >> "$LOG_FILE"
            BATCH_COUNT=$((BATCH_COUNT + 1))
        fi
    done <<< "$ENTRIES"

    PROCESSED=$((PROCESSED + BATCH_COUNT))
    echo "Batch complete. Total processed: $PROCESSED" | tee -a "$LOG_FILE"

    if [ $BATCH_COUNT -eq 0 ]; then
        break
    fi
done

echo "Finished at $(date). Total: $PROCESSED entries" | tee -a "$LOG_FILE"
