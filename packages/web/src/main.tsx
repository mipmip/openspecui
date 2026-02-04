/**
 * Main entry point - re-exports from entry-client
 *
 * This file exists for backwards compatibility with Vite's default entry.
 */
export * from './entry-client'

// Import to trigger side effects (the actual app initialization)
import './entry-client'
