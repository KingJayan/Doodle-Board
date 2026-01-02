import { defineConfig, loadEnv } from 'vite';
import angular from '@analogjs/vite-plugin-angular';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

  return {
    plugins: [angular()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.API_KEY),
      'process.env': JSON.stringify({}) 
    }
  };
});
