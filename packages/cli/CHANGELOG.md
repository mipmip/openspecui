# openspecui

## 0.9.1

### Patch Changes

- Add --format option to export command
  - Support `--format=html` (default) for full static site export
  - Support `--format=json` for data-only export
  - Fix local dev mode SSG workflow

## 0.9.0

### Minor Changes

- 28db01c: Refactor SSG to use Vite official pattern
  - Simplified SSG implementation using Vite's official pre-rendering approach
  - Added `prerender.ts` script that uses HTML template from `vite build`
  - Removed complex runtime Vite build from old `cli.ts`
  - Removed ai-provider dependency from server and cli packages
  - Added Changesets for version management
