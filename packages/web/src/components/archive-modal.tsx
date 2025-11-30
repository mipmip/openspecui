import { useMemo, useState } from 'react'
import { X, Archive, AlertTriangle } from 'lucide-react'
import { useNavigate } from '@tanstack/react-router'
import { CliTerminalModal, type SuccessConfig } from './cli-terminal-modal'

export interface ArchiveModalProps {
  /** Change ID to archive */
  changeId: string
  /** Change name for display */
  changeName: string
  /** Whether the modal is open */
  open: boolean
  /** Close handler */
  onClose: () => void
}

type Step = 'options' | 'terminal'

/**
 * Archive Modal
 *
 * Two-step modal:
 * 1. Options selection (--skip-specs, --no-validate)
 * 2. Terminal output showing CLI execution with success view
 */
export function ArchiveModal({
  changeId,
  changeName,
  open,
  onClose,
}: ArchiveModalProps) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('options')
  const [skipSpecs, setSkipSpecs] = useState(false)
  const [noValidate, setNoValidate] = useState(false)

  // Reset state when modal closes
  const handleClose = () => {
    setStep('options')
    setSkipSpecs(false)
    setNoValidate(false)
    onClose()
  }

  // Start archive
  const handleStartArchive = () => {
    setStep('terminal')
  }

  // Generate archive name (same format as CLI)
  const archiveName = useMemo(() => {
    const date = new Date().toISOString().split('T')[0]
    return `${date}-${changeId}`
  }, [changeId])

  // Success configuration for terminal modal
  const successConfig: SuccessConfig = useMemo(
    () => ({
      title: 'Archive Successful',
      description: `"${changeName}" has been archived as ${archiveName}`,
      actions: [
        {
          label: 'Close',
          onClick: () => {
            handleClose()
            navigate({ to: '/changes' })
          },
        },
        {
          label: 'View Archive',
          onClick: () => {
            handleClose()
            navigate({ to: '/archive' })
          },
          primary: true,
        },
      ],
    }),
    [changeName, archiveName, navigate]
  )

  if (!open) return null

  // Step 2: Terminal output with success view
  if (step === 'terminal') {
    return (
      <CliTerminalModal
        title={`Archive: ${changeName}`}
        open={true}
        onClose={handleClose}
        successConfig={successConfig}
        type="archive"
        archiveOptions={{
          changeId,
          skipSpecs,
          noValidate,
        }}
      />
    )
  }

  // Step 1: Options selection
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />

      {/* Modal */}
      <div className="relative w-full max-w-md mx-4 bg-background border border-border rounded-lg shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="flex items-center gap-2">
            <Archive className="w-5 h-5 text-red-500" />
            <h2 className="font-semibold">Archive Change</h2>
          </div>
          <button onClick={handleClose} className="p-1 hover:bg-muted rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Warning */}
          <div className="flex items-start gap-3 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
            <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-medium text-amber-600 dark:text-amber-400">
                This action will archive the change
              </p>
              <p className="text-muted-foreground mt-1">
                Archiving moves the change to the archive directory and updates affected specs.
              </p>
            </div>
          </div>

          {/* Change info */}
          <div className="p-3 bg-muted/50 rounded-lg">
            <p className="text-sm text-muted-foreground">Change to archive:</p>
            <p className="font-medium">{changeName}</p>
            <p className="text-xs text-muted-foreground mt-1">ID: {changeId}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            <p className="text-sm font-medium">Options</p>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={skipSpecs}
                onChange={(e) => setSkipSpecs(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium">Skip specs update</p>
                <p className="text-xs text-muted-foreground">
                  Don't update spec files with delta changes (--skip-specs)
                </p>
              </div>
            </label>

            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={noValidate}
                onChange={(e) => setNoValidate(e.target.checked)}
                className="mt-1 w-4 h-4 rounded border-border"
              />
              <div>
                <p className="text-sm font-medium">Skip validation</p>
                <p className="text-xs text-muted-foreground">
                  Don't validate the change before archiving (--no-validate)
                </p>
              </div>
            </label>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 border-t border-border">
          <button
            onClick={handleClose}
            className="px-4 py-2 bg-muted hover:bg-muted/80 rounded-md"
          >
            Cancel
          </button>
          <button
            onClick={handleStartArchive}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md"
          >
            <Archive className="w-4 h-4" />
            Archive
          </button>
        </div>
      </div>
    </div>
  )
}
