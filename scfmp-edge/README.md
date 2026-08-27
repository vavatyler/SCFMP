# SCFMP demo edge

This Worker provides a second, domain-free entry point for the SCFMP board
demonstration. It proxies the complete application to the existing Vercel
production origin, including same-origin `/api` requests. It does not duplicate
the application, authentication system, or database.

## Commands

```powershell
npm install
npm test
node node_modules/wrangler/wrangler-dist/cli.js login
npm run deploy
```

The deployed URL has the form:

```text
https://scfmp-demo-edge.<account-subdomain>.workers.dev
```

Keep `https://scfmp.vercel.app` as the primary URL and use the Worker URL as the
cellular-friendly presentation URL and fallback.
