import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Plugin to rewrite .html requests to the SPA fallback
const rewriteHtmlPlugin = () => {
  return {
    name: 'rewrite-html',
    enforce: 'pre',
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        // Rewrite /rosary-site-react.html and /rosary-site-react/*.html to the standard entry
        if (
          req.url === '/rosary-site-react.html' || 
          (req.url.startsWith('/rosary-site-react/') && req.url.endsWith('.html') && req.url !== '/rosary-site-react/index.html')
        ) {
          req.url = '/rosary-site-react/index.html';
        }
        next();
      });
    }
  };
};

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss(), rewriteHtmlPlugin()],
  base: '/rosary-site-react/',
})
