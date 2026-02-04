---
"openspecui": minor
"@openspecui/web": minor
"@openspecui/server": minor
"@openspecui/core": minor
---

Refactor SSG to use Vite official pattern

- Simplified SSG implementation using Vite's official pre-rendering approach
- Added `prerender.ts` script that uses HTML template from `vite build`
- Removed complex runtime Vite build from old `cli.ts`
- Removed ai-provider dependency from server and cli packages
- Added Changesets for version management
