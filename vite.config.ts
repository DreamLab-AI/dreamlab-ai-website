import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import fs from 'fs';

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    {
      name: 'configure-server',
      configureServer(server) {
        server.middlewares.use('/data/team', (req, res, next) => {
          const teamDir = path.resolve(__dirname, 'public/data/team');
          if (req.url === '/') {
            try {
              const files = fs.readdirSync(teamDir);
              res.end(files.join('\n'));
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
});
