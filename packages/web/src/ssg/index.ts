/**
 * SSG module exports
 */
export { render, getRoutes, getTitle } from './entry-server'
export { StaticDataProvider, useStaticData, useStaticSnapshot, useIsStaticMode, useBasePath } from './static-data-context'
export type { ExportSnapshot } from '@openspecui/core'
