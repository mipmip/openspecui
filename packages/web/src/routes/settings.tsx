import { CliTerminalModal } from '@/components/cli-terminal-modal'
import { CopyablePath } from '@/components/copyable-path'
import { getApiBaseUrl } from '@/lib/api-config'
import { trpc, trpcClient } from '@/lib/trpc'
import { useServerStatus } from '@/lib/use-server-status'
import { useConfigSubscription, useConfiguredToolsSubscription } from '@/lib/use-subscription'
import { useMutation, useQuery } from '@tanstack/react-query'
import {
  ArrowUp,
  Check,
  CheckCircle,
  Download,
  FolderOpen,
  FolderPlus,
  Loader2,
  Monitor,
  Moon,
  Settings as SettingsIcon,
  Sun,
  Terminal,
  Wifi,
  WifiOff,
  XCircle,
} from 'lucide-react'
import { useCallback, useEffect, useState } from 'react'

type Theme = 'light' | 'dark' | 'system'

function getStoredTheme(): Theme {
  const stored = localStorage.getItem('theme')
  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored
  }
  return 'system'
}

function applyTheme(theme: Theme) {
  const root = document.documentElement
  if (theme === 'system') {
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    root.classList.toggle('dark', prefersDark)
  } else {
    root.classList.toggle('dark', theme === 'dark')
  }
}

export function Settings() {
  const [theme, setTheme] = useState<Theme>(getStoredTheme)
  const [apiUrl, setApiUrl] = useState(getApiBaseUrl() || '')
  const [cliCommand, setCliCommand] = useState('')
  const [selectedTools, setSelectedTools] = useState<string[]>([])
  const [showInitModal, setShowInitModal] = useState(false)
  const [showInstallModal, setShowInstallModal] = useState(false)
  const [initTools, setInitTools] = useState<string[] | 'all' | 'none'>('none')

  // 服务器状态（包含项目路径）
  const serverStatus = useServerStatus()

  // 订阅配置
  const { data: config } = useConfigSubscription()

  // 嗅探全局 CLI（每次进入 settings 页面都会重新嗅探）
  const {
    data: cliSniffResult,
    isLoading: isSniffingCli,
    refetch: resniffCli,
  } = useQuery({
    ...trpc.cli.sniffGlobalCli.queryOptions(),
    // 每次进入页面都重新嗅探
    staleTime: 0,
    gcTime: 0,
  })

  // CLI 可用性检查（基于配置或嗅探结果）
  const {
    data: cliAvailability,
    isLoading: isCheckingCli,
    refetch: recheckCli,
  } = useQuery(trpc.cli.checkAvailability.queryOptions())

  // 获取所有工具列表（包括 available: false 的）
  const { data: allTools } = useQuery(trpc.cli.getAllTools.queryOptions())

  // 分组：available: true 的工具和 available: false 的工具
  const nativeTools = allTools?.filter((t) => t.available) ?? []
  const otherTools = allTools?.filter((t) => !t.available) ?? []

  // 订阅已配置的工具列表（响应式）
  const { data: configuredTools } = useConfiguredToolsSubscription()

  // 同步配置到本地状态（只有用户配置了才显示）
  useEffect(() => {
    // 只有当配置中有值时才同步到 input
    if (config?.cli?.command) {
      setCliCommand(config.cli.command)
    } else {
      // 用户没有配置时，清空 input
      setCliCommand('')
    }
  }, [config?.cli?.command])

  // 安装完成后重新嗅探
  const handleInstallSuccess = useCallback(() => {
    // 重新嗅探全局 CLI
    resniffCli()
    // 重新检查 CLI 可用性
    recheckCli()
    // 关闭安装模态框
    setShowInstallModal(false)
  }, [resniffCli, recheckCli])

  // 计算显示的 placeholder
  const cliPlaceholder = cliSniffResult?.hasGlobal
    ? `openspec (v${cliSniffResult.version || 'detected'})`
    : 'npx @fission-ai/openspec'

  // 同步已配置的工具到选中状态
  useEffect(() => {
    if (configuredTools && configuredTools.length > 0) {
      setSelectedTools(configuredTools)
    }
  }, [configuredTools])

  // 打开 init modal
  const startInit = (tools: string[] | 'all' | 'none') => {
    setInitTools(tools)
    setShowInitModal(true)
  }

  // 判断工具是否已配置（不可取消）
  const isToolConfigured = (tool: string) => configuredTools?.includes(tool) ?? false

  // 切换工具选择（已配置的工具不能取消）
  const toggleTool = (tool: string) => {
    if (isToolConfigured(tool)) return // 已配置的工具不能取消
    setSelectedTools((prev) =>
      prev.includes(tool) ? prev.filter((t) => t !== tool) : [...prev, tool]
    )
  }

  // 全选/取消全选（保留已配置的工具）
  const toggleAllTools = () => {
    if (!allTools) return
    const allToolIds = allTools.map((t) => t.value)
    const unconfiguredTools = allToolIds.filter((t) => !isToolConfigured(t))
    const allUnconfiguredSelected = unconfiguredTools.every((t) => selectedTools.includes(t))

    if (allUnconfiguredSelected) {
      // 取消所有未配置的工具，保留已配置的
      setSelectedTools(configuredTools ?? [])
    } else {
      // 全选所有工具
      setSelectedTools([...allToolIds])
    }
  }

  // 计算新工具数量（未配置但已选中的）
  const newToolsCount = selectedTools.filter((t) => !isToolConfigured(t)).length

  // 保存 CLI 命令配置
  const saveCliCommandMutation = useMutation({
    mutationFn: (command: string) => trpcClient.config.setCliCommand.mutate({ command }),
    onSuccess: () => {
      recheckCli()
    },
  })

  useEffect(() => {
    applyTheme(theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme !== 'system') return

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => applyTheme('system')
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [theme])

  const handleApiUrlChange = () => {
    const currentUrl = new URL(window.location.href)
    if (apiUrl) {
      currentUrl.searchParams.set('api', apiUrl)
    } else {
      currentUrl.searchParams.delete('api')
    }
    window.location.href = currentUrl.toString()
  }
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    setLoading(false)
  }, [])
  if (loading) {
    return <div className="route-loading animate-pulse">Loading settings...</div>
  }

  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="font-nav flex items-center gap-2 text-2xl font-bold">
        <SettingsIcon className="h-6 w-6 shrink-0" />
        Settings
      </h1>

      {/* Theme */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Appearance</h2>
        <div className="border-border rounded-lg border p-4">
          <label className="mb-3 block text-sm font-medium">Theme</label>
          <div className="flex gap-2">
            <button
              onClick={() => setTheme('light')}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 transition-colors ${
                theme === 'light'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Sun className="h-4 w-4" />
              Light
            </button>
            <button
              onClick={() => setTheme('dark')}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 transition-colors ${
                theme === 'dark'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Moon className="h-4 w-4" />
              Dark
            </button>
            <button
              onClick={() => setTheme('system')}
              className={`flex items-center gap-2 rounded-md border px-4 py-2 transition-colors ${
                theme === 'system'
                  ? 'border-primary bg-primary text-primary-foreground'
                  : 'border-border hover:bg-muted'
              }`}
            >
              <Monitor className="h-4 w-4" />
              System
            </button>
          </div>
        </div>
      </section>

      {/* Project Directory */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Project Directory</h2>
        <div className="border-border rounded-lg border p-4">
          <div className="flex items-start gap-2">
            <FolderOpen className="text-muted-foreground mt-1 h-4 w-4 shrink-0" />
            {serverStatus.projectDir ? (
              <CopyablePath path={serverStatus.projectDir} className="flex-1" />
            ) : (
              <span className="text-muted-foreground text-sm">Loading...</span>
            )}
          </div>
        </div>
      </section>

      {/* CLI Configuration */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">CLI Configuration</h2>
        <div className="border-border space-y-4 rounded-lg border p-4">
          {/* Global CLI Detection */}
          <div>
            <label className="mb-2 block text-sm font-medium">Global CLI Detection</label>
            <div className="mb-2 flex items-center gap-2">
              {isSniffingCli ? (
                <span className="text-muted-foreground flex items-center gap-2 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Detecting global openspec command...
                </span>
              ) : cliSniffResult?.hasGlobal ? (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="h-4 w-4" />
                    Global CLI installed:{' '}
                    <code className="bg-muted rounded px-1">openspec {cliSniffResult.version}</code>
                  </span>
                  {cliSniffResult.hasUpdate && cliSniffResult.latestVersion && (
                    <span className="flex items-center gap-2 text-sm text-amber-600">
                      <ArrowUp className="h-4 w-4" />
                      Update available:{' '}
                      <code className="bg-muted rounded px-1">v{cliSniffResult.latestVersion}</code>
                    </span>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-1">
                  <span className="flex items-center gap-2 text-sm text-yellow-600">
                    <XCircle className="h-4 w-4" />
                    Global CLI not found
                  </span>
                  {cliSniffResult?.latestVersion && (
                    <span className="text-muted-foreground text-xs">
                      Latest version:{' '}
                      <code className="bg-muted rounded px-1">v{cliSniffResult.latestVersion}</code>
                    </span>
                  )}
                </div>
              )}
            </div>
            {/* 显示安装/更新按钮：当没有全局 CLI 或有更新可用时 */}
            {!isSniffingCli && (!cliSniffResult?.hasGlobal || cliSniffResult?.hasUpdate) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowInstallModal(true)}
                  className="bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-3 py-1.5 text-sm hover:opacity-90"
                >
                  {cliSniffResult?.hasUpdate ? (
                    <>
                      <ArrowUp className="h-4 w-4" />
                      Update to v{cliSniffResult.latestVersion}
                    </>
                  ) : (
                    <>
                      <Download className="h-4 w-4" />
                      Install Globally
                    </>
                  )}
                </button>
                <span className="text-muted-foreground text-xs">
                  Run:{' '}
                  <code className="bg-muted rounded px-1">npm install -g @fission-ai/openspec</code>
                </span>
              </div>
            )}
            {cliSniffResult?.error && (
              <p className="mt-1 text-sm text-red-500">Detection error: {cliSniffResult.error}</p>
            )}
          </div>

          {/* CLI Command Override */}
          <div className="border-border border-t pt-3">
            <label className="mb-2 block text-sm font-medium">Custom CLI Command (Optional)</label>
            <p className="text-muted-foreground mb-3 text-sm">
              Override the auto-detected CLI command. Leave empty to use the detected default.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={cliCommand}
                onChange={(e) => setCliCommand(e.target.value)}
                placeholder={cliPlaceholder}
                className="border-border bg-background text-foreground flex-1 rounded-md border px-3 py-2 font-mono text-sm"
              />
              <button
                onClick={() => saveCliCommandMutation.mutate(cliCommand)}
                disabled={
                  saveCliCommandMutation.isPending || cliCommand === (config?.cli?.command ?? '')
                }
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:opacity-90 disabled:opacity-50"
              >
                {saveCliCommandMutation.isPending ? 'Saving...' : 'Save'}
              </button>
            </div>
            {config?.cli?.command && (
              <p className="text-muted-foreground mt-2 text-xs">
                Currently using custom command:{' '}
                <code className="bg-muted rounded px-1">{config.cli.command}</code>
              </p>
            )}
          </div>

          {/* CLI Status */}
          <div className="border-border border-t pt-3">
            <div className="flex items-center gap-2">
              <Terminal className="text-muted-foreground h-4 w-4" />
              <span className="text-sm font-medium">CLI Status:</span>
              {isCheckingCli ? (
                <span className="text-muted-foreground flex items-center gap-1 text-sm">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Checking...
                </span>
              ) : cliAvailability?.available ? (
                <span className="flex items-center gap-1 text-sm text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  Available {cliAvailability.version && `(${cliAvailability.version})`}
                </span>
              ) : (
                <span className="flex items-center gap-1 text-sm text-red-600">
                  <XCircle className="h-4 w-4" />
                  Not available
                </span>
              )}
            </div>
            {cliAvailability && !cliAvailability.available && cliAvailability.error && (
              <p className="text-muted-foreground ml-6 mt-1 text-sm">{cliAvailability.error}</p>
            )}
          </div>
        </div>
      </section>

      {/* API Configuration */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">API Configuration</h2>
        <div className="border-border space-y-4 rounded-lg border p-4">
          <div>
            <label className="mb-2 block text-sm font-medium">API Server URL</label>
            <p className="text-muted-foreground mb-3 text-sm">
              Leave empty for same-origin requests. Set a custom URL to connect to a different
              server.
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                placeholder={window.location.origin}
                className="border-border bg-background text-foreground flex-1 rounded-md border px-3 py-2"
              />
              <button
                onClick={handleApiUrlChange}
                className="bg-primary text-primary-foreground rounded-md px-4 py-2 hover:opacity-90"
              >
                Apply
              </button>
            </div>
            {getApiBaseUrl() && (
              <p className="text-muted-foreground mt-2 text-sm">
                Current: <code className="bg-muted rounded px-1">{getApiBaseUrl()}</code>
              </p>
            )}
          </div>
        </div>
      </section>

      {/* File Watcher Info */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">File Watcher</h2>
        <div className="border-border rounded-lg border p-4">
          <p className="text-muted-foreground mb-3 text-sm">
            File watcher is configured on the server side. Check the status bar at the bottom of the
            page to see if file watching is enabled.
          </p>
          <div className="flex items-center gap-2 text-sm">
            <Wifi className="h-4 w-4 text-green-500" />
            <span>Enabled: Real-time updates when files change</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-sm">
            <WifiOff className="h-4 w-4 text-yellow-500" />
            <span>Disabled: Manual refresh required</span>
          </div>
          <p className="text-muted-foreground mt-3 text-sm">
            To disable file watching, restart the server with{' '}
            <code className="bg-muted rounded px-1">--no-watch</code> flag.
          </p>
        </div>
      </section>

      {/* Initialize OpenSpec */}
      <section className="space-y-4">
        <h2 className="text-lg font-semibold">Initialize OpenSpec</h2>
        <div className="border-border space-y-4 rounded-lg border p-4">
          <p className="text-muted-foreground text-sm">
            Create the OpenSpec directory structure in the current project. This will create{' '}
            <code className="bg-muted rounded px-1">openspec/</code> with specs, changes, and
            archive directories.
          </p>

          {/* Tool Selection */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium">AI Tools Configuration</label>
              <button onClick={toggleAllTools} className="text-primary text-xs hover:underline">
                {allTools && selectedTools.length === allTools.length
                  ? 'Deselect All'
                  : 'Select All'}
              </button>
            </div>
            <p className="text-muted-foreground text-sm">
              Select which AI tools to configure. Already configured tools cannot be deselected.
            </p>

            {/* Natively supported providers */}
            <div>
              <p className="text-muted-foreground mb-2 text-xs font-medium">
                Natively supported providers (✔ OpenSpec custom slash commands available)
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 md:grid-cols-4">
                {nativeTools.map((tool) => {
                  const configured = isToolConfigured(tool.value)
                  const selected = selectedTools.includes(tool.value)
                  return (
                    <button
                      key={tool.value}
                      onClick={() => toggleTool(tool.value)}
                      disabled={configured}
                      title={configured ? 'Already configured' : tool.name}
                      className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-left text-xs transition-colors ${
                        configured
                          ? 'cursor-not-allowed border-green-500/50 bg-green-500/10 text-green-600'
                          : selected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border hover:bg-muted'
                      }`}
                    >
                      {(configured || selected) && (
                        <Check
                          className={`h-3 w-3 shrink-0 ${configured ? 'text-green-600' : ''}`}
                        />
                      )}
                      <span className="truncate">{tool.name}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Other tools (Universal AGENTS.md) */}
            {otherTools.length > 0 && (
              <div>
                <p className="text-muted-foreground mb-2 text-xs font-medium">
                  Other tools (use Universal AGENTS.md for Amp, VS Code, GitHub Copilot, …)
                </p>
                <div className="flex flex-wrap gap-2">
                  {otherTools.map((tool) => {
                    const configured = isToolConfigured(tool.value)
                    const selected = selectedTools.includes(tool.value)
                    // 对于 Universal AGENTS.md，显示为 "Universal AGENTS.md (always available)"
                    const displayName = tool.value === 'agents' ? 'Universal AGENTS.md' : tool.name
                    const annotation = tool.value === 'agents' ? 'always available' : undefined
                    return (
                      <button
                        key={tool.value}
                        onClick={() => toggleTool(tool.value)}
                        disabled={configured}
                        title={configured ? 'Already configured' : tool.name}
                        className={`flex items-center gap-1.5 rounded border px-2.5 py-1.5 text-xs transition-colors ${
                          configured
                            ? 'cursor-not-allowed border-green-500/50 bg-green-500/10 text-green-600'
                            : selected
                              ? 'border-primary bg-primary/10 text-primary'
                              : 'border-border hover:bg-muted'
                        }`}
                      >
                        {(configured || selected) && (
                          <Check
                            className={`h-3 w-3 shrink-0 ${configured ? 'text-green-600' : ''}`}
                          />
                        )}
                        <span>{displayName}</span>
                        {annotation && (
                          <span className="text-muted-foreground">({annotation})</span>
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {configuredTools && configuredTools.length > 0 && (
              <p className="text-muted-foreground text-xs">
                <span className="inline-flex items-center gap-1">
                  <span className="h-2 w-2 rounded-full bg-green-500/50" />
                  {configuredTools.length} tool{configuredTools.length > 1 ? 's' : ''} already
                  configured
                </span>
              </p>
            )}
          </div>

          {/* Init Buttons */}
          <div className="border-border flex flex-wrap gap-2 border-t pt-2">
            <button
              onClick={() => startInit(selectedTools.length > 0 ? selectedTools : 'none')}
              className="bg-primary text-primary-foreground flex items-center gap-2 rounded-md px-4 py-2 hover:opacity-90"
            >
              <FolderPlus className="h-4 w-4" />
              {newToolsCount > 0
                ? `Add ${newToolsCount} new tool${newToolsCount > 1 ? 's' : ''}`
                : selectedTools.length > 0
                  ? 'Refresh configuration'
                  : 'Initialize (no tools)'}
            </button>
            <button
              onClick={() => startInit('all')}
              className="border-border hover:bg-muted rounded-md border px-4 py-2"
            >
              Initialize with All Tools
            </button>
          </div>
        </div>
      </section>

      {/* Init Terminal Modal */}
      <CliTerminalModal
        title="Initialize OpenSpec"
        open={showInitModal}
        onClose={() => setShowInitModal(false)}
        type="init"
        initOptions={{ tools: initTools }}
      />

      {/* Install Global CLI Terminal Modal */}
      <CliTerminalModal
        title={cliSniffResult?.hasUpdate ? 'Update OpenSpec CLI' : 'Install OpenSpec CLI Globally'}
        open={showInstallModal}
        onClose={() => setShowInstallModal(false)}
        type="install-global"
        successConfig={{
          title: cliSniffResult?.hasUpdate ? 'Update Complete' : 'Installation Complete',
          description: cliSniffResult?.hasUpdate
            ? `OpenSpec CLI has been updated to v${cliSniffResult.latestVersion}. You can now use the latest features.`
            : 'OpenSpec CLI has been installed globally. You can now use the "openspec" command from anywhere.',
          actions: [
            {
              label: 'Close',
              onClick: () => setShowInstallModal(false),
            },
            {
              label: 'Re-detect CLI',
              onClick: handleInstallSuccess,
              primary: true,
            },
          ],
        }}
      />
    </div>
  )
}
