// No-op replacement for `server-only`. Next.js's runtime blocks any client
// bundle that imports this package; at test time we have no bundler boundary,
// so returning nothing is safe and lets tests import server modules directly.
export {};
