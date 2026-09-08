/**
 * @fileoverview API Index — barrel for the READ layer of the data stack.
 *
 * DATA-LAYER LAYERING (one predictable place per concern):
 *
 *   entities/   → shapes only. Pure TypeScript types for database rows.
 *                 Isomorphic, zero runtime, safe to import anywhere.
 *   functions/  → readers. Isomorphic Supabase queries returning `entities/`
 *                 types. Client-importable. Also consumed as-is by the Expo
 *                 app in `mobile/` (Metro swaps only `supabase-client`), so
 *                 nothing under here may reference `next/*`, `window` or
 *                 `document`.
 *   actions/    → writers / privileged reads. `'use server'` Next.js Server
 *                 Actions built ON TOP of these readers. Deliberately NOT
 *                 re-exported from this barrel — see `actions/index.ts`.
 *
 * Rule of thumb: a component that can read with the anon key imports from
 * `@/functions/api/*`; one that needs the server session imports from
 * `@/actions/*`. The two never meet in a single barrel, so importing a reader
 * can never drag server-only code into the client bundle.
 *
 * @module functions/api
 */

export * from './assets';
export * from './contractors';
export * from './electricity';
export * from './stp';
export * from './water';
export * from './manual-readings';
export * from './csv-upload';
export * from './fire-safety';
export * from './gulf-expert';
