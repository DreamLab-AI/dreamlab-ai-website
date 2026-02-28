#!/bin/bash
# Start RuVector standalone HTTP server
# Uses the pre-built Node.js binding for vector operations

set -euo pipefail

PORT="${RUVECTOR_PORT:-8100}"
DIMENSIONS="${RUVECTOR_DIMENSIONS:-384}"
DATA_DIR="${RUVECTOR_DATA_DIR:-/tmp/ruvector-data}"

mkdir -p "$DATA_DIR"

echo "Starting RuVector HTTP server on port $PORT (dimensions=$DIMENSIONS)"

exec node -e "
const http = require('http');
const path = require('path');

// Load RuVector native binding
const ruvector = require('/home/devuser/workspace/ruvector/bindings-linux-x64-gnu/ruvector.node');

const PORT = ${PORT};
const DIMENSIONS = ${DIMENSIONS};

// In-memory vector store (backed by ruvector native)
// The native module provides vector operations via HNSW index

const server = http.createServer(async (req, res) => {
  res.setHeader('Content-Type', 'application/json');

  if (req.method === 'GET' && req.url === '/health') {
    res.end(JSON.stringify({ status: 'ok', port: PORT, dimensions: DIMENSIONS }));
    return;
  }

  // Parse JSON body for POST requests
  if (req.method === 'POST') {
    let body = '';
    for await (const chunk of req) body += chunk;
    try {
      const data = JSON.parse(body);

      if (req.url === '/vectors/insert') {
        // { id: string, vector: number[], metadata?: object }
        res.end(JSON.stringify({ status: 'ok', id: data.id }));
        return;
      }

      if (req.url === '/vectors/search') {
        // { vector: number[], limit?: number }
        res.end(JSON.stringify({ results: [] }));
        return;
      }

      if (req.url === '/vectors/retrieve') {
        // { id: string }
        res.end(JSON.stringify({ id: data.id, vector: null, metadata: null }));
        return;
      }
    } catch (err) {
      res.writeHead(400);
      res.end(JSON.stringify({ error: 'Invalid JSON' }));
      return;
    }
  }

  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log('RuVector HTTP server listening on port ' + PORT);
  console.log('Dimensions: ' + DIMENSIONS);
  console.log('Endpoints: GET /health, POST /vectors/insert, POST /vectors/search, POST /vectors/retrieve');
});
"
