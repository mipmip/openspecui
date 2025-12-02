import { formatRelativeTime } from '@/lib/format-time'
import { useChangesSubscription } from '@/lib/use-subscription'
import { Link } from '@tanstack/react-router'
import { ChevronRight, GitBranch } from 'lucide-react'
import { useEffect, useState } from 'react'

export function ChangeList() {
  const { data: changes, isLoading } = useChangesSubscription()
  const [firstFrameLoading, setFirstFrameLoading] = useState(true)
  useEffect(() => {
    const id = requestAnimationFrame(() => setFirstFrameLoading(false))
    return () => cancelAnimationFrame(id)
  }, [])

  if (firstFrameLoading || (isLoading && !changes)) {
    return <div className="route-loading animate-pulse">Loading changes...</div>
  }

  return (
    <div className="space-y-6">
      <h1 className="font-nav flex items-center gap-2 text-2xl font-bold">
        <GitBranch className="h-6 w-6 shrink-0" />
        Changes
      </h1>

      <p className="text-muted-foreground">
        Active change proposals. Completed changes are moved to{' '}
        <Link to="/archive" className="text-primary hover:underline">
          Archive
        </Link>
        .
      </p>

      <div className="border-border divide-border divide-y rounded-lg border">
        {changes?.map((change) => (
          <Link
            key={change.id}
            to="/changes/$changeId"
            params={{ changeId: change.id }}
            className="hover:bg-muted/50 flex items-center justify-between p-4"
          >
            <div className="flex items-center gap-3">
              <GitBranch className="text-muted-foreground h-5 w-5" />
              <div>
                <div className="font-medium">{change.name}</div>
                <div className="text-muted-foreground text-sm">
                  {change.progress.completed}/{change.progress.total} tasks
                  {change.updatedAt > 0 && <> · {formatRelativeTime(change.updatedAt)}</>}
                </div>
              </div>
            </div>
            <ChevronRight className="text-muted-foreground h-4 w-4" />
          </Link>
        ))}
        {changes?.length === 0 && (
          <div className="text-muted-foreground p-4 text-center">
            No active changes. Create one in <code>openspec/changes/</code>
          </div>
        )}
      </div>
    </div>
  )
}
