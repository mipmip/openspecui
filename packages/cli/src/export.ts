import { OpenSpecAdapter, type ExportSnapshot } from '@openspecui/core'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { spawn } from 'node:child_process'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))

// This version is replaced at build time by tsdown
declare const __WEB_PACKAGE_VERSION__: string
const WEB_PACKAGE_VERSION = typeof __WEB_PACKAGE_VERSION__ !== 'undefined' ? __WEB_PACKAGE_VERSION__ : '0.1.0'

export interface ExportOptions {
  /** Project directory containing openspec/ */
  projectDir: string
  /** Output directory for static export */
  outputDir: string
  /** Base path for deployment */
  basePath?: string
  /** Clean output directory before export */
  clean?: boolean
  /** Start preview server and open in browser */
  open?: boolean
  /** Port for preview server */
  previewPort?: number
  /** Host for preview server */
  previewHost?: string
}

// Re-export ExportSnapshot from core for backwards compatibility
export type { ExportSnapshot } from '@openspecui/core'

/**
 * Generate a complete data snapshot of the OpenSpec project
 * (Kept for backwards compatibility and testing)
 */
export async function generateSnapshot(projectDir: string): Promise<ExportSnapshot> {
  const adapter = new OpenSpecAdapter(projectDir)

  // Check if initialized
  const isInit = await adapter.isInitialized()
  if (!isInit) {
    throw new Error(`OpenSpec not initialized in ${projectDir}`)
  }

  // Get all specs with parsed content
  const specsMeta = await adapter.listSpecsWithMeta()
  const specs = await Promise.all(
    specsMeta.map(async (meta) => {
      const raw = await adapter.readSpecRaw(meta.id)
      const parsed = await adapter.readSpec(meta.id)
      return {
        id: meta.id,
        name: meta.name,
        content: raw || '',
        overview: parsed?.overview || '',
        requirements: parsed?.requirements || [],
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      }
    })
  )

  // Get all changes with parsed content
  const changesMeta = await adapter.listChangesWithMeta()
  const changes = await Promise.all(
    changesMeta.map(async (meta) => {
      const change = await adapter.readChange(meta.id)
      if (!change) return null

      const files = await adapter.readChangeFiles(meta.id)
      const proposalFile = files.find((f) => f.path === 'proposal.md')
      const tasksFile = files.find((f) => f.path === 'tasks.md')
      const designFile = files.find((f) => f.path === 'design.md')

      // Get delta spec content
      const deltas = (change.deltaSpecs || []).map((ds) => ({
        capability: ds.specId,
        content: ds.content || '',
      }))

      return {
        id: meta.id,
        name: meta.name,
        proposal: proposalFile?.content || '',
        tasks: tasksFile?.content,
        design: designFile?.content,
        why: change.why || '',
        whatChanges: change.whatChanges || '',
        parsedTasks: change.tasks || [],
        deltas,
        progress: meta.progress,
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      }
    })
  )

  // Get all archives with parsed content
  const archivesMeta = await adapter.listArchivedChangesWithMeta()
  const archives = await Promise.all(
    archivesMeta.map(async (meta) => {
      const files = await adapter.readArchivedChangeFiles(meta.id)
      const proposalFile = files.find((f) => f.path === 'proposal.md')
      const tasksFile = files.find((f) => f.path === 'tasks.md')
      const designFile = files.find((f) => f.path === 'design.md')

      // Parse the proposal to extract why and whatChanges
      const change = await adapter.readArchivedChange(meta.id)

      return {
        id: meta.id,
        name: meta.name || meta.id,
        proposal: proposalFile?.content || '',
        tasks: tasksFile?.content,
        design: designFile?.content,
        why: change?.why || '',
        whatChanges: change?.whatChanges || '',
        parsedTasks: change?.tasks || [],
        createdAt: meta.createdAt,
        updatedAt: meta.updatedAt,
      }
    })
  )

  // Get project.md and AGENTS.md
  let projectMd: string | undefined
  let agentsMd: string | undefined

  try {
    const projectMdContent = await adapter.readProjectMd()
    projectMd = projectMdContent ?? undefined
  } catch {
    // project.md is optional
  }

  try {
    const agentsMdContent = await adapter.readAgentsMd()
    agentsMd = agentsMdContent ?? undefined
  } catch {
    // AGENTS.md is optional
  }

  const snapshot: ExportSnapshot = {
    meta: {
      timestamp: new Date().toISOString(),
      version: WEB_PACKAGE_VERSION,
      projectDir,
    },
    dashboard: {
      specsCount: specs.length,
      changesCount: changes.filter((c) => c !== null).length,
      archivesCount: archives.length,
    },
    specs,
    changes: changes.filter((c): c is NonNullable<typeof c> => c !== null),
    archives,
    projectMd,
    agentsMd,
  }

  return snapshot
}

/**
 * Detect the package manager being used
 */
function detectPackageManager(): 'pnpm' | 'yarn' | 'bun' | 'npm' {
  const userAgent = process.env.npm_config_user_agent || ''
  if (userAgent.includes('pnpm')) return 'pnpm'
  if (userAgent.includes('yarn')) return 'yarn'
  if (userAgent.includes('bun')) return 'bun'
  return 'npm'
}

/**
 * Get the command to execute a package binary
 */
function getExecCommand(pm: 'pnpm' | 'yarn' | 'bun' | 'npm'): { cmd: string; args: string[] } {
  const packageSpec = WEB_PACKAGE_VERSION.startsWith('__')
    ? '@openspecui/web' // Development: use latest
    : `@openspecui/web@${WEB_PACKAGE_VERSION}` // Production: use pinned version

  switch (pm) {
    case 'pnpm':
      return { cmd: 'pnpm', args: ['dlx', packageSpec] }
    case 'yarn':
      return { cmd: 'yarn', args: ['dlx', packageSpec] }
    case 'bun':
      return { cmd: 'bunx', args: [packageSpec] }
    case 'npm':
    default:
      return { cmd: 'npx', args: [packageSpec] }
  }
}

/**
 * Check if running in local monorepo development mode
 * Returns the path to local SSG CLI if available, null otherwise
 */
function findLocalSSGCli(): string | null {
  // Check for local development (tsx) - packages/cli/src -> packages/web/src/ssg/cli.ts
  const localSsgTs = join(__dirname, '..', '..', 'web', 'src', 'ssg', 'cli.ts')
  if (existsSync(localSsgTs)) {
    return localSsgTs
  }

  return null
}

/**
 * Export the OpenSpec UI as a static website with SSG (pre-rendered HTML)
 *
 * This function:
 * 1. Generates a data snapshot from the openspec/ directory
 * 2. Writes data.json to the output directory
 * 3. Delegates to @openspecui/web's SSG CLI for rendering
 *
 * In development (monorepo), it uses the local web package.
 * In production, it uses npx/pnpm dlx to fetch the published package.
 */
export async function exportStaticSite(options: ExportOptions): Promise<void> {
  const { projectDir, outputDir, basePath, clean, open, previewPort, previewHost } = options

  // 1. Clean output directory if requested
  if (clean && existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true })
  }

  // 2. Create output directory
  mkdirSync(outputDir, { recursive: true })

  // 3. Generate data snapshot and write to data.json
  console.log('Generating data snapshot...')
  const snapshot = await generateSnapshot(projectDir)
  const dataJsonPath = join(outputDir, 'data.json')
  writeFileSync(dataJsonPath, JSON.stringify(snapshot, null, 2))
  console.log(`Data snapshot written to ${dataJsonPath}`)

  // 4. Build SSG arguments - pass data.json path instead of project dir
  const ssgOnlyArgs = [
    '--data', dataJsonPath,
    '--output', outputDir,
  ]

  if (basePath !== undefined) {
    ssgOnlyArgs.push('--base-path', basePath)
  }

  if (open) {
    ssgOnlyArgs.push('--open')
    if (previewPort !== undefined) {
      ssgOnlyArgs.push('--preview-port', String(previewPort))
    }
    if (previewHost !== undefined) {
      ssgOnlyArgs.push('--host', previewHost)
    }
  }

  // Check for local development mode first
  const localCli = findLocalSSGCli()

  let cmd: string
  let args: string[]

  if (localCli) {
    // Local development: use tsx to run local CLI
    cmd = 'npx'
    args = ['tsx', localCli, ...ssgOnlyArgs]
  } else {
    // Production: use package manager to fetch and run from npm
    const pm = detectPackageManager()
    const execCmd = getExecCommand(pm)
    cmd = execCmd.cmd
    args = [...execCmd.args, ...ssgOnlyArgs]
  }

  // 5. Run the SSG CLI
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      cwd: projectDir,
    })

    child.on('close', (code) => {
      if (code === 0) {
        resolvePromise()
      } else {
        reject(new Error(`SSG export failed with exit code ${code}`))
      }
    })

    child.on('error', (err) => {
      reject(new Error(`Failed to start SSG CLI: ${err.message}`))
    })
  })
}
