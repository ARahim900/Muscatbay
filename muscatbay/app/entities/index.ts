/**
 * @fileoverview Entity Index — the bottom layer of the data stack.
 *
 * Types only: the shape of each Supabase table row. Zero runtime, no imports
 * beyond other entities, safe to import from server code, client components
 * and the Expo app in `mobile/` alike.
 *
 * Layering: entities/ (these types) → functions/api/ (isomorphic readers that
 * return them) → actions/ (`'use server'` writers on top of those readers).
 *
 * @module entities
 */

// Asset entity
export * from './asset';

// Contractor entities
export * from './contractor';

// Electricity entities
export * from './electricity';

// STP entity
export * from './stp';

// Water entity
export * from './water';

// Hand-recorded meter readings (potable bulk meters + irrigation network)
export * from './manual-readings';

// Fire safety entities
export * from './fire-safety';
