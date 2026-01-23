import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from 'fs';

export default defineConfig({
  base: '/',
  optimizeDeps: {
    // Force development mode for React JSX runtime
    esbuildOptions: {
      define: {
        'process.env.NODE_ENV': '"development"'
      }
    }
  },
  plugins: [
    react(),
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use('/data/team', (req, res, next) => {
          // Security: Validate request URL to prevent path traversal
          if (!req.url || req.url.includes('..') || req.url.includes('%2e')) {
            res.statusCode = 400;
            res.end('Invalid request');
            return;
          }

          const teamDir = path.resolve(__dirname, 'public/data/team');
          if (req.url === '/') {
            try {
              const files = fs.readdirSync(teamDir);
              // Security: Only return .md files, no system files
              const safeFiles = files.filter(f => f.endsWith('.md') && !f.startsWith('.'));
              res.setHeader('Content-Type', 'text/plain; charset=utf-8');
              res.end(safeFiles.join('\n'));
            } catch (error) {
              console.error('Error reading team directory:', error);
              res.statusCode = 500;
              res.end('Error reading directory');
            }
          } else {
            next();
          }
        });
      }
    }
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor': ['react', 'react-dom', 'react-router-dom'],
          'three': ['three', '@react-three/fiber', '@react-three/drei'],
          'ui': ['@radix-ui/react-accordion', '@radix-ui/react-alert-dialog',
                 '@radix-ui/react-avatar', '@radix-ui/react-checkbox', '@radix-ui/react-dialog',
                 '@radix-ui/react-dropdown-menu', '@radix-ui/react-popover',
                 '@radix-ui/react-scroll-area', '@radix-ui/react-select',
                 '@radix-ui/react-separator', '@radix-ui/react-slider',
                 '@radix-ui/react-switch', '@radix-ui/react-tabs', '@radix-ui/react-toast',
                 '@radix-ui/react-tooltip']
        }
      }
    },
    chunkSizeWarningLimit: 1000,
    minify: 'esbuild'
  }
});
