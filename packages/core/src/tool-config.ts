/**
 * 工具配置检测模块
 *
 * 基于 @fission-ai/openspec 的 configurators 实现
 * 用于检测项目中已配置的 AI 工具
 *
 * 重要：使用响应式文件系统实现，监听配置目录，
 * 当配置文件变化时会自动触发更新。
 *
 * @see references/openspec/src/core/configurators/slash/
 * @see references/openspec/src/core/init.ts (isToolConfigured)
 */

import { stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { dirname, join, resolve } from 'node:path'
import { ReactiveState, acquireWatcher } from './reactive-fs/index.js'

/**
 * 检测路径范围
 * - project: 相对于项目根目录
 * - global: 绝对路径（如 Codex 的 ~/.codex/prompts/）
 */
type DetectionScope = 'project' | 'global'

/**
 * 工具配置信息
 */
export interface ToolConfig {
  /** 工具 ID */
  toolId: string
  /** 检测路径范围 */
  scope: DetectionScope
  /**
   * 检测路径
   * - scope='project': 相对于项目根目录的路径
   * - scope='global': 返回绝对路径的函数
   */
  detectionPath: string | (() => string)
}

/**
 * 获取 Codex 全局 prompts 目录
 * 优先使用 $CODEX_HOME 环境变量，否则使用 ~/.codex
 * @see references/openspec/src/core/configurators/slash/codex.ts
 */
function getCodexGlobalPromptsDir(): string {
  const codexHome = process.env.CODEX_HOME?.trim() || join(homedir(), '.codex')
  return join(codexHome, 'prompts')
}

/**
 * 所有支持的工具配置
 *
 * 检测路径使用 proposal 命令文件，因为这是 openspec init 创建的第一个文件
 * 如果该文件存在，说明工具已配置
 *
 * @see references/openspec/src/core/configurators/slash/registry.ts
 */
export const TOOL_CONFIGS: ToolConfig[] = [
  // Claude Code - .claude/commands/openspec/proposal.md
  { toolId: 'claude', scope: 'project', detectionPath: '.claude/commands/openspec/proposal.md' },

  // Cursor - .cursor/commands/openspec-proposal.md
  { toolId: 'cursor', scope: 'project', detectionPath: '.cursor/commands/openspec-proposal.md' },

  // Windsurf - .windsurf/workflows/openspec-proposal.md
  { toolId: 'windsurf', scope: 'project', detectionPath: '.windsurf/workflows/openspec-proposal.md' },

  // Cline - .clinerules/workflows/openspec-proposal.md
  { toolId: 'cline', scope: 'project', detectionPath: '.clinerules/workflows/openspec-proposal.md' },

  // GitHub Copilot - .github/prompts/openspec-proposal.prompt.md
  { toolId: 'github-copilot', scope: 'project', detectionPath: '.github/prompts/openspec-proposal.prompt.md' },

  // Amazon Q - .amazonq/prompts/openspec-proposal.md
  { toolId: 'amazon-q', scope: 'project', detectionPath: '.amazonq/prompts/openspec-proposal.md' },

  // Codex - 全局目录 ~/.codex/prompts/ 或 $CODEX_HOME/prompts/
  // @see references/openspec/src/core/configurators/slash/codex.ts
  {
    toolId: 'codex',
    scope: 'global',
    detectionPath: () => join(getCodexGlobalPromptsDir(), 'openspec-proposal.md'),
  },

  // Gemini - .gemini/commands/openspec/proposal.toml
  { toolId: 'gemini', scope: 'project', detectionPath: '.gemini/commands/openspec/proposal.toml' },

  // Auggie - .augment/commands/openspec-proposal.md
  { toolId: 'auggie', scope: 'project', detectionPath: '.augment/commands/openspec-proposal.md' },

  // CodeBuddy - .codebuddy/commands/openspec/proposal.md
  { toolId: 'codebuddy', scope: 'project', detectionPath: '.codebuddy/commands/openspec/proposal.md' },

  // Qoder - .qoder/commands/openspec/proposal.md
  { toolId: 'qoder', scope: 'project', detectionPath: '.qoder/commands/openspec/proposal.md' },

  // RooCode - .roo/commands/openspec-proposal.md
  { toolId: 'roocode', scope: 'project', detectionPath: '.roo/commands/openspec-proposal.md' },

  // KiloCode - .kilocode/workflows/openspec-proposal.md
  { toolId: 'kilocode', scope: 'project', detectionPath: '.kilocode/workflows/openspec-proposal.md' },

  // OpenCode - .opencode/command/openspec-proposal.md
  { toolId: 'opencode', scope: 'project', detectionPath: '.opencode/command/openspec-proposal.md' },

  // Factory - .factory/commands/openspec-proposal.md
  { toolId: 'factory', scope: 'project', detectionPath: '.factory/commands/openspec-proposal.md' },

  // Crush - .crush/commands/openspec/proposal.md
  { toolId: 'crush', scope: 'project', detectionPath: '.crush/commands/openspec/proposal.md' },

  // Costrict - .cospec/openspec/commands/openspec-proposal.md
  { toolId: 'costrict', scope: 'project', detectionPath: '.cospec/openspec/commands/openspec-proposal.md' },

  // Qwen - .qwen/commands/openspec-proposal.toml
  { toolId: 'qwen', scope: 'project', detectionPath: '.qwen/commands/openspec-proposal.toml' },

  // iFlow - .iflow/commands/openspec-proposal.md
  { toolId: 'iflow', scope: 'project', detectionPath: '.iflow/commands/openspec-proposal.md' },

  // Antigravity - .agent/workflows/openspec-proposal.md
  { toolId: 'antigravity', scope: 'project', detectionPath: '.agent/workflows/openspec-proposal.md' },
]

/**
 * 获取所有可用的工具 ID 列表
 */
export function getAvailableToolIds(): string[] {
  return TOOL_CONFIGS.map((config) => config.toolId)
}

/** 状态缓存：projectDir -> ReactiveState */
const stateCache = new Map<string, ReactiveState<string[]>>()

/** 监听器释放函数缓存 */
const releaseCache = new Map<string, () => void>()

/**
 * 检查文件是否存在
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await stat(filePath)
    return true
  } catch {
    return false
  }
}

/**
 * 解析工具的检测路径
 * @param config 工具配置
 * @param projectDir 项目根目录
 * @returns 绝对路径
 */
function resolveDetectionPath(config: ToolConfig, projectDir: string): string {
  if (config.scope === 'global') {
    // 全局路径：调用函数获取绝对路径
    return (config.detectionPath as () => string)()
  }
  // 项目路径：拼接项目根目录
  return join(projectDir, config.detectionPath as string)
}

/**
 * 扫描已配置的工具（并行检查）
 */
async function scanConfiguredTools(projectDir: string): Promise<string[]> {
  // 并行检查所有工具配置文件
  const results = await Promise.all(
    TOOL_CONFIGS.map(async (config) => {
      const filePath = resolveDetectionPath(config, projectDir)
      const exists = await fileExists(filePath)
      return exists ? config.toolId : null
    })
  )
  return results.filter((id): id is string => id !== null)
}

/**
 * 获取需要监听的项目级目录列表
 * 只监听包含工具配置的一级隐藏目录
 */
function getProjectWatchDirs(projectDir: string): string[] {
  const dirs = new Set<string>()
  for (const config of TOOL_CONFIGS) {
    if (config.scope === 'project') {
      // 获取第一级目录（如 .claude, .cursor 等）
      const firstDir = (config.detectionPath as string).split('/')[0]
      if (firstDir) {
        dirs.add(join(projectDir, firstDir))
      }
    }
  }
  return Array.from(dirs)
}

/**
 * 获取需要监听的全局目录列表
 * 如 Codex 的 ~/.codex/prompts/
 */
function getGlobalWatchDirs(): string[] {
  const dirs = new Set<string>()
  for (const config of TOOL_CONFIGS) {
    if (config.scope === 'global') {
      const filePath = (config.detectionPath as () => string)()
      // 监听文件所在的目录
      dirs.add(dirname(filePath))
    }
  }
  return Array.from(dirs)
}

/**
 * 检测项目中已配置的工具（响应式）
 *
 * 监听两类目录：
 * 1. 项目级配置目录（如 .claude, .cursor 等）
 * 2. 全局配置目录（如 ~/.codex/prompts/）
 *
 * @param projectDir 项目根目录
 * @returns 已配置的工具 ID 列表
 */
export async function getConfiguredTools(projectDir: string): Promise<string[]> {
  const normalizedPath = resolve(projectDir)
  const key = `tools:${normalizedPath}`

  let state = stateCache.get(key)

  if (!state) {
    // 初始扫描
    const initialValue = await scanConfiguredTools(normalizedPath)

    // 创建响应式状态
    state = new ReactiveState<string[]>(initialValue, {
      // 数组相等性比较
      equals: (a, b) => a.length === b.length && a.every((v, i) => v === b[i]),
    })
    stateCache.set(key, state)

    const releases: (() => void)[] = []
    const onUpdate = async () => {
      const newValue = await scanConfiguredTools(normalizedPath)
      state!.set(newValue)
    }

    // 1. 监听项目级配置目录（如 .claude, .cursor 等）
    const projectWatchDirs = getProjectWatchDirs(normalizedPath)
    for (const dir of projectWatchDirs) {
      const release = acquireWatcher(dir, onUpdate, { recursive: true })
      releases.push(release)
    }

    // 2. 监听全局配置目录（如 ~/.codex/prompts/）
    const globalWatchDirs = getGlobalWatchDirs()
    for (const dir of globalWatchDirs) {
      const release = acquireWatcher(dir, onUpdate, { recursive: false })
      releases.push(release)
    }

    // 3. 监听项目根目录（非递归），以捕获新创建的配置目录
    const rootRelease = acquireWatcher(normalizedPath, onUpdate, { recursive: false })
    releases.push(rootRelease)

    releaseCache.set(key, () => releases.forEach((r) => r()))
  }

  return state.get()
}

/**
 * 检查特定工具是否已配置
 *
 * @param projectDir 项目根目录
 * @param toolId 工具 ID
 * @returns 是否已配置
 */
export async function isToolConfigured(projectDir: string, toolId: string): Promise<boolean> {
  const configured = await getConfiguredTools(projectDir)
  return configured.includes(toolId)
}
