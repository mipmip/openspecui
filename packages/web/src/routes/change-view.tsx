import { useCallback, useMemo, useEffect, useRef } from 'react'
import { useMutation } from '@tanstack/react-query'
import { trpcClient } from '@/lib/trpc'
import { useChangeSubscription } from '@/lib/use-subscription'
import { useArchiveModal } from '@/lib/archive-modal-context'
import { useParams, Link, useNavigate } from '@tanstack/react-router'
import { ArrowLeft, Archive, AlertCircle, FileText, FolderTree, ListChecks } from 'lucide-react'
import { TasksView } from '@/components/tasks-view'
import { Tabs, type Tab } from '@/components/tabs'
import { ChangeOverview } from '@/components/change-overview'
import { FolderEditorViewer } from '@/components/folder-editor-viewer'

export function ChangeView() {
  const { changeId } = useParams({ from: '/changes/$changeId' })
  const navigate = useNavigate()
  const { openArchiveModal, state: archiveModalState } = useArchiveModal()

  const { data: change, isLoading } = useChangeSubscription(changeId)

  // 保存最后一次有效的 changeName，用于在 change 被删除后打开 Modal
  const lastChangeNameRef = useRef(change?.name ?? changeId)
  if (change?.name) {
    lastChangeNameRef.current = change.name
  }

  // 当 change 不存在且不在加载中且 Archive Modal 打开时，自动返回到 /changes
  useEffect(() => {
    if (!isLoading && !change && archiveModalState.open) {
      navigate({ to: '/changes' })
    }
  }, [isLoading, change, archiveModalState.open, navigate])
  // TODO: validation 暂时不支持订阅，后续可以添加
  const validation = null as { valid: boolean; issues: Array<{ severity: string; message: string; path?: string }> } | null

  const toggleTaskMutation = useMutation({
    mutationFn: (params: { taskIndex: number; completed: boolean }) =>
      trpcClient.change.toggleTask.mutate({
        changeId,
        taskIndex: params.taskIndex,
        completed: params.completed,
      }),
    // 订阅模式下无需手动 invalidate，文件变更会自动触发更新
  })

  const handleToggleTask = useCallback(
    (taskIndex: number, completed: boolean) => {
      toggleTaskMutation.mutate({ taskIndex, completed })
    },
    [toggleTaskMutation]
  )

  const togglingIndex = toggleTaskMutation.isPending
    ? toggleTaskMutation.variables?.taskIndex ?? null
    : null

  // 点击 Archive 按钮：打开全局 Modal
  const handleArchiveClick = useCallback(() => {
    openArchiveModal(changeId, lastChangeNameRef.current)
  }, [changeId, openArchiveModal])

  const tabs: Tab[] = useMemo(() => {
    if (!change) return []

    return [
      {
        id: 'overview',
        label: 'Overview',
        icon: <FileText className="h-4 w-4" />,
        content: <ChangeOverview change={change} />,
      },
      {
        id: 'tasks',
        label: `Tasks (${change.progress.completed}/${change.progress.total})`,
        icon: <ListChecks className="h-4 w-4" />,
        content: (
          <TasksView
            tasks={change.tasks}
            progress={change.progress}
            onToggleTask={handleToggleTask}
            togglingIndex={togglingIndex}
          />
        ),
      },
      {
        id: 'folder',
        label: 'Folder',
        icon: <FolderTree className="h-4 w-4" />,
        content: <FolderEditorViewer changeId={changeId} />,
        unmountOnHide: true,
      },
    ]
  }, [change, changeId, handleToggleTask, togglingIndex])

  if (isLoading) {
    return <div className="animate-pulse">Loading change...</div>
  }

  // 当 change 不存在时，显示空白（useEffect 会自动导航到 /changes）
  // 如果 Archive Modal 打开着，用户看到的是 Modal 覆盖的 /changes 页面
  if (!change) {
    return null
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/changes" className="p-2 hover:bg-muted rounded-md">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold">{change.name}</h1>
            <p className="text-muted-foreground">ID: {change.id}</p>
          </div>
        </div>

        <button
          onClick={handleArchiveClick}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
        >
          <Archive className="w-4 h-4" />
          Archive
        </button>
      </div>

      {validation && !validation.valid && (
        <div className="border border-red-500 bg-red-500/10 rounded-lg p-4">
          <div className="flex items-center gap-2 text-red-600 font-medium mb-2">
            <AlertCircle className="w-5 h-5" />
            Validation Issues
          </div>
          <ul className="text-sm space-y-1">
            {validation.issues.map((issue, i) => (
              <li key={i} className="text-red-600">
                {issue.message}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Tabs tabs={tabs} defaultTab={tabs[0]?.id} className="min-h-0 flex-1 gap-6" />
    </div>
  )
}
