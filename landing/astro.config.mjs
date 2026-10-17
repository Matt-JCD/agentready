import { defineConfig } from 'astro/config';

// Static marketing site that sits in front of the Next.js checker app.
export default defineConfig({
  output: 'static',
  trailingSlash: 'always',
  site: process.env.PUBLIC_SITE_URL || 'https://agentready.onrender.com',
});
