import { Check, Copy } from 'lucide-react'
import { useCallback, useState } from 'react'

interface CopyablePathProps {
  /** The path to display */
  path: string
  /** Additional className */
  className?: string
}

/**
 * A component for displaying a full path with copy functionality.
 * - Displays full path with word-break
 * - Click to copy
 * - Shows copy confirmation
 */
export function CopyablePath({ path, className = '' }: CopyablePathProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }, [path])

  return (
    <button
      onClick={handleCopy}
      className={`hover:bg-muted/50 group -m-2 flex cursor-pointer items-start gap-2 rounded p-2 text-left transition-colors ${className}`}
      title="Click to copy"
    >
      <code className="bg-muted h-7 flex-1 break-all rounded px-2 py-1 font-mono text-sm">
        {path}
      </code>
      <span className="text-muted-foreground group-hover:text-foreground mt-1 shrink-0 transition-colors">
        {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
      </span>
    </button>
  )
}
