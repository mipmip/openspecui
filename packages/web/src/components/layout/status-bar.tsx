import { PathMarquee } from '@/components/path-marquee'
import { useManualReconnect, useServerStatus } from '@/lib/use-server-status'
import { FolderOpen, RefreshCw, Wifi, WifiOff } from 'lucide-react'

/** Status indicator - simplified for mobile, full for desktop */
export function StatusIndicator() {
  const status = useServerStatus()
  const reconnect = useManualReconnect()

  if (status.connected) {
    return (
      <div className="status-indicator flex items-center gap-1.5 text-xs">
        <Wifi className="h-3.5 w-3.5 text-green-500" />
        <span className="status-text text-green-600">Live</span>
      </div>
    )
  }

  // 断开连接时显示重连提示
  return (
    <div className="status-indicator flex items-center gap-1.5 text-xs">
      <WifiOff className="h-3.5 w-3.5 text-red-500" />
      <span className="status-text text-red-600">Offline</span>
      {status.reconnectCountdown !== null && (
        <button
          onClick={reconnect}
          className="text-muted-foreground hover:text-foreground flex cursor-pointer items-center gap-1 transition-colors"
          title="Click to reconnect now"
        >
          <span className="text-xs">({status.reconnectCountdown}s)</span>
          <RefreshCw className="h-3 w-3" />
        </button>
      )}
    </div>
  )
}

/** Desktop status bar - full information */
export function DesktopStatusBar() {
  const status = useServerStatus()

  return (
    <div className="desktop-status border-border bg-muted/30 text-muted-foreground flex h-8 items-center justify-between gap-4 border-t px-4 text-xs">
      <div className="flex items-center gap-4">
        <StatusIndicator />
        {status.projectDir && (
          <div className="flex items-center gap-1.5">
            <FolderOpen className="h-3.5 w-3.5 shrink-0" />
            <PathMarquee
              children={status.projectDir}
              maxWidth={300}
              duration={12}
              className="text-xs"
            />
          </div>
        )}
      </div>
      {status.connected && (
        <div className="flex items-center gap-1.5">
          {status.watcherEnabled ? (
            <span className="text-green-600">Watching for changes</span>
          ) : (
            <span className="text-yellow-600">File watcher disabled</span>
          )}
        </div>
      )}
    </div>
  )
}
