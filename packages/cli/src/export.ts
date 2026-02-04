import { OpenSpecAdapter, type ExportSnapshot } from '@openspecui/core'
import { spawn } from 'node:child_process'
import { existsSync, mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import pkg from '../package.json' with { type: 'json' }

const __dirname = dirname(fileURLToPath(import.meta.url))

export type ExportFormat = 'html' | 'json'

export interface ExportOptions {
  /** Project directory containing openspec/ */
  projectDir: string
  /** Output directory for static export */
  outputDir: string
  /** Export format: 'html' (default) or 'json' */
  format?: ExportFormat
  /** Base path for deployment (html only) */
  basePath?: string
  /** Clean output directory before export */
  clean?: boolean
  /** Start preview server and open in browser (html only) */
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
      version: pkg.version,
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
 * Check if running in local monorepo development mode
 * Returns the path to web package root if available, null otherwise
 */
function findLocalWebPackage(): string | null {
  // Check for local development - packages/cli/src -> packages/web
  const localWebPkg = join(__dirname, '..', '..', 'web', 'package.json')
  if (existsSync(localWebPkg)) {
    return join(__dirname, '..', '..', 'web')
  }
  return null
}

/**
 * Run a command and wait for it to complete
 */
function runCommand(cmd: string, args: string[], cwd: string): Promise<void> {
  return new Promise((resolvePromise, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', cwd, shell: true })
    child.on('close', (code) => {
      if (code === 0) resolvePromise()
      else reject(new Error(`Command failed with exit code ${code}`))
    })
    child.on('error', (err) => reject(err))
  })
}

type PackageManager = 'npm' | 'pnpm' | 'yarn' | 'bun' | 'deno'

/**
 * Detect the package manager used in the current project
 */
function detectPackageManager(): PackageManager {
  // Deno sets DENO_VERSION environment variable
  if (process.env.DENO_VERSION) return 'deno'

  // npm_config_user_agent format: "pnpm/9.0.0 node/v20.10.0 darwin arm64"
  const userAgent = process.env.npm_config_user_agent
  if (userAgent) {
    if (userAgent.startsWith('bun')) return 'bun'
    if (userAgent.startsWith('pnpm')) return 'pnpm'
    if (userAgent.startsWith('yarn')) return 'yarn'
    if (userAgent.startsWith('npm')) return 'npm'
    if (userAgent.startsWith('deno')) return 'deno'
  }

  // Fallback: check lockfiles
  if (existsSync('deno.lock')) return 'deno'
  if (existsSync('bun.lockb') || existsSync('bun.lock')) return 'bun'
  if (existsSync('pnpm-lock.yaml')) return 'pnpm'
  if (existsSync('yarn.lock')) return 'yarn'
  return 'npm'
}

/**
 * Get the exec command for running a package binary
 * Uses appropriate flags to ensure the correct version of @openspecui/web is installed
 */
function getExecCommand(pm: PackageManager): { cmd: string; args: string[] } {
  // Use cli package version (web package is published in sync)
  const webPkgSpec = `@openspecui/web@${pkg.version}`

  switch (pm) {
    case 'bun':
      // bunx -p @openspecui/web@version openspecui-ssg
      return { cmd: 'bunx', args: ['-p', webPkgSpec, 'openspecui-ssg'] }
    case 'pnpm':
      // pnpm dlx @openspecui/web@version --package @openspecui/web@version openspecui-ssg
      // Note: pnpm dlx runs the bin from the package directly
      return { cmd: 'pnpm', args: ['dlx', webPkgSpec] }
    case 'yarn':
      // yarn dlx @openspecui/web@version
      return { cmd: 'yarn', args: ['dlx', webPkgSpec] }
    case 'deno':
      // deno run -A npm:@openspecui/web@version/openspecui-ssg
      return { cmd: 'deno', args: ['run', '-A', `npm:${webPkgSpec}/openspecui-ssg`] }
    default:
      // npx -p @openspecui/web@version openspecui-ssg
      return { cmd: 'npx', args: ['-p', webPkgSpec, 'openspecui-ssg'] }
  }
}

/**
 * Export as JSON only (data.json)
 */
async function exportJson(options: ExportOptions): Promise<void> {
  const { projectDir, outputDir, clean } = options

  if (clean && existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true })
  }
  mkdirSync(outputDir, { recursive: true })

  console.log('Generating data snapshot...')
  const snapshot = await generateSnapshot(projectDir)
  const dataJsonPath = join(outputDir, 'data.json')
  writeFileSync(dataJsonPath, JSON.stringify(snapshot, null, 2))
  console.log(`\nExported to ${dataJsonPath}`)
  console.log(`  Specs: ${snapshot.specs.length}`)
  console.log(`  Changes: ${snapshot.changes.length}`)
  console.log(`  Archives: ${snapshot.archives.length}`)
}

/**
 * Export as static HTML site
 */
async function exportHtml(options: ExportOptions): Promise<void> {
  const { projectDir, outputDir, basePath = '/', clean, open, previewPort, previewHost } = options

  if (clean && existsSync(outputDir)) {
    rmSync(outputDir, { recursive: true })
  }
  mkdirSync(outputDir, { recursive: true })

  // 1. Generate data.json
  console.log('Generating data snapshot...')
  const snapshot = await generateSnapshot(projectDir)
  const dataJsonPath = join(outputDir, 'data.json')
  writeFileSync(dataJsonPath, JSON.stringify(snapshot, null, 2))
  console.log(`Data snapshot written to ${dataJsonPath}`)

  // 2. Run SSG
  const localWebPkg = findLocalWebPackage()

  if (localWebPkg) {
    // Local development: run SSG CLI directly via tsx
    console.log('\n[Local dev mode] Running SSG from local web package...')
    const ssgCli = join(localWebPkg, 'src', 'ssg', 'cli.ts')
    await runCommand(
      'pnpm',
      ['tsx', ssgCli, '--data', dataJsonPath, '--output', outputDir, '--base-path', basePath],
      localWebPkg
    )
  } else {
    // Production: call the bundled SSG CLI from @openspecui/web
    console.log('\n[Production mode] Running SSG via @openspecui/web...')

    const pm = detectPackageManager()
    const execCmd = getExecCommand(pm)

    try {
      await runCommand(
        execCmd.cmd,
        [...execCmd.args, '--data', dataJsonPath, '--output', outputDir, '--base-path', basePath],
        process.cwd()
      )
    } catch (err) {
      console.error('\nSSG failed. Make sure @openspecui/web is installed:')
      console.error(`  ${pm} add @openspecui/web`)
      throw err
    }
  }

  console.log(`\nExport complete: ${outputDir}`)

  // 3. Start preview server if requested
  if (open) {
    console.log('\nStarting preview server...')
    const previewArgs = ['vite', 'preview', '--outDir', resolve(outputDir)]
    if (previewPort) previewArgs.push('--port', String(previewPort))
    if (previewHost) previewArgs.push('--host', previewHost)
    previewArgs.push('--open')
    const pm = detectPackageManager()

    await runCommand(pm, previewArgs, outputDir)
  }
}

/**
 * Export the OpenSpec project
 *
 * @param options Export options
 * @param options.format 'html' (default) - full static site, 'json' - data only
 */
export async function exportStaticSite(options: ExportOptions): Promise<void> {
  const format = options.format || 'html'

  if (format === 'json') {
    await exportJson(options)
  } else {
    await exportHtml(options)
  }
}
