import { defineConfig } from 'vite';

export default defineConfig({
  base: './', // relative asset paths: the build works from any folder or sub-path
  build: { target: 'es2020' },
  test: { environment: 'node' },
});
