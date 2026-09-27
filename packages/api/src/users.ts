// Convex Auth owns user creation and password verification now (see
// packages/convex/src/auth.ts). The lookups that used to live here call
// internal Convex functions that are deliberately unreachable from a client.
//
// Nothing imports this file any more — delete it, and its line in index.ts.
export {};
