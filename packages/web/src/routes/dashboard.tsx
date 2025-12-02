import { useDashboardSubscription, useInitializedSubscription } from '@/lib/use-subscription'
import { Link } from '@tanstack/react-router'
import {
  AlertCircle,
  Archive,
  CheckCircle,
  FileText,
  GitBranch,
  LayoutDashboard,
} from 'lucide-react'
import { useMemo } from 'react'

export function Dashboard() {
  const { data, isLoading, error } = useDashboardSubscription()
  const { data: initialized } = useInitializedSubscription()

  const sortedSpecs = useMemo(() => {
    if (!data?.specs) return []
    return [...data.specs].sort((a, b) => b.requirements.length - a.requirements.length)
  }, [data?.specs])

  if (isLoading && !data) {
    return <div className="route-loading animate-pulse">Loading dashboard...</div>
  }

  if (error) {
    return (
      <div className="text-destructive flex items-center gap-2">
        <AlertCircle className="h-5 w-5" />
        Error loading dashboard: {error.message}
      </div>
    )
  }

  if (!initialized) {
    return (
      <div className="py-12 text-center">
        <h2 className="font-nav mb-4 flex items-center justify-center gap-2 text-2xl font-bold">
          <LayoutDashboard className="h-6 w-6 shrink-0" />
          OpenSpec Not Initialized
        </h2>
        <p className="text-muted-foreground mb-6">
          This project doesn't have an OpenSpec directory yet.
        </p>
        <Link
          to="/settings"
          className="bg-primary text-primary-foreground inline-flex items-center gap-2 rounded-md px-4 py-2 hover:opacity-90"
        >
          Initialize OpenSpec
        </Link>
      </div>
    )
  }

  if (!data) return null

  const { summary } = data

  return (
    <div className="space-y-6">
      <h1 className="font-nav flex items-center gap-2 text-2xl font-bold">
        <LayoutDashboard className="h-6 w-6 shrink-0" />
        Dashboard
      </h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={<FileText className="h-5 w-5" />}
          label="Specifications"
          value={summary.specCount}
          sublabel={`${summary.requirementCount} requirements`}
        />
        <StatCard
          icon={<GitBranch className="h-5 w-5" />}
          label="Active Changes"
          value={summary.activeChangeCount}
          sublabel="in progress"
        />
        <StatCard
          icon={<Archive className="h-5 w-5" />}
          label="Completed"
          value={summary.archivedChangeCount}
          sublabel="archived"
        />
        <StatCard
          icon={<CheckCircle className="h-5 w-5" />}
          label="Task Progress"
          value={`${summary.completedTasks}/${summary.totalTasks}`}
          sublabel={`${summary.progressPercent}% complete`}
        />
      </div>

      {/* Active Changes with Progress Bars */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Active Changes</h2>
          {data.changes.length > 0 && (
            <Link to="/changes" className="text-primary text-sm hover:underline">
              View all
            </Link>
          )}
        </div>
        <div className="border-border divide-border divide-y rounded-lg border">
          {data.changes.map((change) => {
            const percent =
              change.progress.total > 0
                ? Math.round((change.progress.completed / change.progress.total) * 100)
                : 0
            return (
              <Link
                key={change.id}
                to="/changes/$changeId"
                params={{ changeId: change.id }}
                className="hover:bg-muted/50 block p-4"
              >
                <div className="mb-2 flex items-center justify-between">
                  <div className="font-medium">{change.name}</div>
                  <span className="text-muted-foreground text-sm">
                    {change.progress.completed}/{change.progress.total} tasks
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <div className="bg-muted h-2 flex-1 rounded-full">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${percent}%` }}
                    />
                  </div>
                  <span className="w-12 text-right text-sm font-medium">{percent}%</span>
                </div>
              </Link>
            )
          })}
          {data.changes.length === 0 && (
            <div className="text-muted-foreground p-4 text-center">
              No active changes. Create one in{' '}
              <code className="bg-muted rounded px-1">openspec/changes/</code>
            </div>
          )}
        </div>
      </section>

      {/* Specifications sorted by requirement count */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Specifications</h2>
          {sortedSpecs.length > 0 && (
            <Link to="/specs" className="text-primary text-sm hover:underline">
              View all
            </Link>
          )}
        </div>
        <div className="border-border divide-border divide-y rounded-lg border">
          {sortedSpecs.map((spec) => (
            <Link
              key={spec.id}
              to="/specs/$specId"
              params={{ specId: spec.id }}
              className="hover:bg-muted/50 flex items-center justify-between p-3"
            >
              <div className="flex items-center gap-3">
                <FileText className="text-muted-foreground h-4 w-4" />
                <span className="font-medium">{spec.name}</span>
              </div>
              <span className="text-muted-foreground text-sm">
                {spec.requirements.length} requirement{spec.requirements.length !== 1 ? 's' : ''}
              </span>
            </Link>
          ))}
          {sortedSpecs.length === 0 && (
            <div className="text-muted-foreground p-4 text-center">
              No specs yet. Create one in{' '}
              <code className="bg-muted rounded px-1">openspec/specs/</code>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

function StatCard({
  icon,
  label,
  value,
  sublabel,
}: {
  icon: React.ReactNode
  label: string
  value: number | string
  sublabel: string
}) {
  return (
    <div className="border-border rounded-lg border p-4">
      <div className="text-muted-foreground mb-2 flex items-center gap-2">
        {icon}
        <span className="text-sm">{label}</span>
      </div>
      <div className="text-2xl font-bold">{value}</div>
      <div className="text-muted-foreground text-sm">{sublabel}</div>
    </div>
  )
}
