import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs-extra';

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// Custom plugin to copy extension files
const copyExtensionFiles = () => {
  return {
    name: 'copy-extension-files',
    closeBundle: async () => {
      // Copy files from public directory
      if (fs.existsSync('public')) {
        await fs.copy('public', 'dist')
      }
    }
  }
}

export default defineConfig({
  plugins: [
    react(),
    copyExtensionFiles()
  ],
  root: 'src',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'src/index.html')
      },
      output: {
        entryFileNames: '[name].js',
        chunkFileNames: '[name].js',
        assetFileNames: '[name].[ext]'
      }
    }
  },
  server: {
    open: true
  }
})
