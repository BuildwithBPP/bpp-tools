const routes = [
  { method: "GET", pattern: /^\/api\/refresh\/status$/ },
  { method: "POST", pattern: /^\/api\/refresh\/[a-z0-9-]+$/ },
  { method: "GET", pattern: /^\/api\/bi\/hubspot$/ },
  { method: "GET", pattern: /^\/api\/data\/[a-z0-9-]+\/(?:latest|history)$/ }
];

function isGovernedRoute(request) {
  const path = new URL(request.url).pathname;
  return routes.some(({ method, pattern }) => request.method === method && pattern.test(path));
}

function json(data, status) {
  return Response.json(data, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff"
    }
  });
}

export async function onRequest(context) {
  if (!isGovernedRoute(context.request)) {
    return json({ error: "Not found." }, 404);
  }

  if (!context.env?.REFRESH_SERVICE?.fetch) {
    return json({ error: "Refresh service is unavailable." }, 503);
  }

  return context.env.REFRESH_SERVICE.fetch(context.request);
}
