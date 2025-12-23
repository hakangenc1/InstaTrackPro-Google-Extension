
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { resolve, dirname } from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

// Fix: Define __dirname for ES modules environment
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'copy-manifest',
      closeBundle() {
        const root = resolve(__dirname);
        const dist = resolve(__dirname, 'dist');
        
        // Manifest dosyasını dist klasörüne kopyala
        if (fs.existsSync(resolve(root, 'manifest.json'))) {
          if (!fs.existsSync(dist)) {
            fs.mkdirSync(dist, { recursive: true });
          }
          fs.copyFileSync(
            resolve(root, 'manifest.json'),
            resolve(dist, 'manifest.json')
          );
          console.log('\x1b[32m✓\x1b[0m manifest.json dist klasörüne kopyalandı.');
        }
      }
    }
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        background: resolve(__dirname, 'background.ts'),
      },
      output: {
        entryFileNames: (chunkInfo) => {
          // background.ts dosyasını background.js olarak dışarı aktar
          return chunkInfo.name === 'background' ? '[name].js' : 'assets/[name]-[hash].js';
        },
      }
    },
  },
});
