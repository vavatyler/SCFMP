import assert from 'node:assert/strict';
import test from 'node:test';

import { createWorker } from '../src/index.js';

test('proxies the path, query, authorization, origin, referer, and request body', async () => {
  let captured;
  const worker = createWorker(async (request, options) => {
    captured = {
      url: request.url,
      authorization: request.headers.get('authorization'),
      origin: request.headers.get('origin'),
      referer: request.headers.get('referer'),
      forwardedHost: request.headers.get('x-forwarded-host'),
      body: await request.text(),
      redirect: options.redirect,
    };
    return Response.json({ success: true });
  });

  const response = await worker.fetch(new Request(
    'https://scfmp-demo.example.workers.dev/api/production?page=2',
    {
      method: 'POST',
      headers: {
        authorization: 'Bearer test-token',
        'content-type': 'application/json',
        origin: 'https://scfmp-demo.example.workers.dev',
        referer: 'https://scfmp-demo.example.workers.dev/production?mode=group',
      },
      body: JSON.stringify({ production_mode: 'group' }),
    }
  ), { SCFMP_ORIGIN: 'https://scfmp.vercel.app' });

  assert.equal(response.status, 200);
  assert.deepEqual(captured, {
    url: 'https://scfmp.vercel.app/api/production?page=2',
    authorization: 'Bearer test-token',
    origin: 'https://scfmp.vercel.app',
    referer: 'https://scfmp.vercel.app/production?mode=group',
    forwardedHost: 'scfmp-demo.example.workers.dev',
    body: JSON.stringify({ production_mode: 'group' }),
    redirect: 'manual',
  });
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('x-scfmp-edge'), 'cloudflare');
});

test('rewrites same-origin redirects and CORS response headers to the edge URL', async () => {
  const worker = createWorker(async () => new Response(null, {
    status: 302,
    headers: {
      location: 'https://scfmp.vercel.app/login?next=%2Fmembers',
      'access-control-allow-origin': 'https://scfmp.vercel.app',
    },
  }));

  const response = await worker.fetch(
    new Request('https://scfmp-demo.example.workers.dev/members'),
    { SCFMP_ORIGIN: 'https://scfmp.vercel.app' }
  );

  assert.equal(
    response.headers.get('location'),
    'https://scfmp-demo.example.workers.dev/login?next=%2Fmembers'
  );
  assert.equal(
    response.headers.get('access-control-allow-origin'),
    'https://scfmp-demo.example.workers.dev'
  );
});

test('fails closed when the configured origin is not HTTPS', async () => {
  const worker = createWorker(async () => {
    throw new Error('The upstream must not be called');
  });

  const response = await worker.fetch(
    new Request('https://scfmp-demo.example.workers.dev/api/health'),
    { SCFMP_ORIGIN: 'http://insecure.example.com' }
  );

  assert.equal(response.status, 502);
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.deepEqual(await response.json(), {
    success: false,
    message: 'SCFMP is temporarily unavailable. Please retry.',
  });
});

test('returns a safe retry page when the Vercel origin cannot be reached', async () => {
  const worker = createWorker(async () => {
    throw new Error('Simulated network failure');
  });

  const response = await worker.fetch(
    new Request('https://scfmp-demo.example.workers.dev/login'),
    { SCFMP_ORIGIN: 'https://scfmp.vercel.app' }
  );

  assert.equal(response.status, 502);
  assert.match(await response.text(), /temporarily unavailable/i);
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
});
