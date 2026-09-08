/**
 * @fileoverview Server Actions Index — barrel for the WRITE / privileged layer.
 *
 * SERVER BOUNDARY — READ BEFORE ADDING ANYTHING HERE.
 *
 * Every module re-exported below starts with `'use server'`. Next.js replaces
 * those exports with client-reference stubs when a Client Component imports
 * them, so the server implementation (and `lib/supabase-server`, which reads
 * cookies via `next/headers`) never reaches the browser bundle.
 *
 * That guarantee only holds while this file re-exports `'use server'` modules
 * and NOTHING else. Do not add components, hooks, client utilities or the
 * isomorphic readers from `functions/api/*` to this barrel — mixing them would
 * pull `next/headers` into the client graph and break the build.
 *
 * Layering: entities/ (types) → functions/api/ (isomorphic readers)
 *           → actions/ (server-only wrappers around those readers).
 *
 * @module actions
 */

export * from './assets';
export * from './fire-safety';
export * from './water-readings';
