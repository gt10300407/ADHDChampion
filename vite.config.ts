import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';

export default defineConfig({
  plugins: [react()],
  build: {
    target: 'es2020',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
  },
});
