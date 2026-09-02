const DEFAULT_ORIGIN = 'https://scfmp.vercel.app';

const normalizeOrigin = (value) => {
  const origin = new URL(value || DEFAULT_ORIGIN);
  if (origin.protocol !== 'https:' || origin.username || origin.password) {
    throw new Error('SCFMP_ORIGIN must be a public HTTPS origin');
  }
  origin.pathname = '/';
  origin.search = '';
  origin.hash = '';
  return origin;
};

const parseHosts = (value) => new Set(
  String(value || '')
    .split(',')
    .map((host) => host.trim().toLowerCase())
    .filter(Boolean)
);

const canonicalRedirect = (incomingUrl, env) => {
  const redirectHosts = parseHosts(env.SCFMP_REDIRECT_HOSTS);
  if (!redirectHosts.has(incomingUrl.hostname.toLowerCase())) return null;

  const canonicalOrigin = normalizeOrigin(env.SCFMP_CANONICAL_ORIGIN);
  const destination = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, canonicalOrigin);
  return Response.redirect(destination, 308);
};

const rewriteSameOriginUrl = (value, sourceOrigin, targetOrigin) => {
  if (!value) return value;

  try {
    const url = new URL(value, sourceOrigin);
    if (url.origin !== sourceOrigin) return value;
    return `${targetOrigin}${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
};

const unavailableResponse = (isApiRequest) => {
  const headers = {
    'cache-control': 'no-store',
    'x-content-type-options': 'nosniff',
    'x-scfmp-edge': 'cloudflare',
  };

  if (isApiRequest) {
    return Response.json(
      { success: false, message: 'SCFMP is temporarily unavailable. Please retry.' },
      { status: 502, headers }
    );
  }

  return new Response(
    '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SCFMP</title><body><main><h1>SCFMP is temporarily unavailable</h1><p>Please retry in a moment or use the primary presentation link.</p></main></body></html>',
    { status: 502, headers: { ...headers, 'content-type': 'text/html; charset=UTF-8' } }
  );
};

export const createWorker = (fetchUpstream = fetch) => ({
  async fetch(request, env = {}) {
    const incomingUrl = new URL(request.url);
    const isApiRequest = incomingUrl.pathname === '/api'
      || incomingUrl.pathname.startsWith('/api/');

    let origin;
    try {
      const redirect = canonicalRedirect(incomingUrl, env);
      if (redirect) return redirect;
      origin = normalizeOrigin(env.SCFMP_ORIGIN);
    } catch {
      return unavailableResponse(isApiRequest);
    }

    const upstreamUrl = new URL(`${incomingUrl.pathname}${incomingUrl.search}`, origin);
    const upstreamRequest = new Request(upstreamUrl, request);

    upstreamRequest.headers.delete('host');
    upstreamRequest.headers.set('x-forwarded-host', incomingUrl.host);
    upstreamRequest.headers.set('x-forwarded-proto', 'https');
    upstreamRequest.headers.set('x-scfmp-edge', 'cloudflare');

    if (upstreamRequest.headers.has('origin')) {
      upstreamRequest.headers.set('origin', origin.origin);
    }

    const referer = upstreamRequest.headers.get('referer');
    if (referer) {
      upstreamRequest.headers.set(
        'referer',
        rewriteSameOriginUrl(referer, incomingUrl.origin, origin.origin)
      );
    }

    try {
      const upstreamResponse = await fetchUpstream(upstreamRequest, { redirect: 'manual' });
      const responseHeaders = new Headers(upstreamResponse.headers);
      const location = responseHeaders.get('location');

      if (location) {
        responseHeaders.set(
          'location',
          rewriteSameOriginUrl(location, origin.origin, incomingUrl.origin)
        );
      }

      if (responseHeaders.get('access-control-allow-origin') === origin.origin) {
        responseHeaders.set('access-control-allow-origin', incomingUrl.origin);
      }

      if (isApiRequest) {
        responseHeaders.set('cache-control', 'no-store');
      }
      responseHeaders.set('x-scfmp-edge', 'cloudflare');

      return new Response(upstreamResponse.body, {
        status: upstreamResponse.status,
        statusText: upstreamResponse.statusText,
        headers: responseHeaders,
      });
    } catch {
      return unavailableResponse(isApiRequest);
    }
  },
});

export default createWorker();
