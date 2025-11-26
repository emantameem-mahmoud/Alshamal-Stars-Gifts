import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    // Increase the chunk size limit to suppress the warning
    chunkSizeWarningLimit: 1600,
    rollupOptions: {
      output: {
        // Separate vendor libraries into their own chunks for better caching and loading
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'ui-vendor': ['lucide-react', 'canvas-confetti'],
          'ai-vendor': ['@google/genai']
        }
      }
    }
  }
});