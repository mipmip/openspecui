import { Check, Copy } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'

interface PathMarqueeProps {
  /** The path to display */
  children: string
  /** Maximum width of the container (default: 300px) */
  maxWidth?: number | string
  /** Animation duration in seconds (default: 10) */
  duration?: number
  /** Gap between repeated content (default: 20px) */
  gap?: number
  /** Additional className for the container */
  className?: string
}

/**
 * A marquee component for displaying long paths with auto-scrolling animation.
 * - Pure CSS animation using ::after pseudo-element
 * - Pauses on hover
 * - Click to copy path
 * - Only animates when content overflows
 */
export function PathMarquee({
  children: path,
  maxWidth = 300,
  duration = 10,
  gap = 20,
  className = '',
}: PathMarqueeProps) {
  const [copied, setCopied] = useState(false)
  const [shouldAnimate, setShouldAnimate] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Check if content overflows and needs animation
  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && contentRef.current) {
        const containerWidth = containerRef.current.offsetWidth
        const contentWidth = contentRef.current.scrollWidth
        setShouldAnimate(contentWidth > containerWidth)
      }
    }

    checkOverflow()
    window.addEventListener('resize', checkOverflow)
    return () => window.removeEventListener('resize', checkOverflow)
  }, [path])

  // Handle copy to clipboard
  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(path)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (err) {
      console.error('Failed to copy path:', err)
    }
  }, [path])

  const maxWidthStyle = typeof maxWidth === 'number' ? `${maxWidth}px` : maxWidth

  return (
    <button
      onClick={handleCopy}
      className={`hover:bg-muted/50 group flex cursor-pointer items-center gap-1.5 rounded transition-colors ${className}`}
      title={`${path}\n\nClick to copy`}
    >
      {/* Marquee container */}
      <div
        ref={containerRef}
        className="relative overflow-hidden whitespace-nowrap"
        style={{ maxWidth: maxWidthStyle }}
      >
        {/* Animated content */}
        <div
          ref={contentRef}
          data-content={path}
          className={`relative inline-block ${shouldAnimate ? 'animate-marquee group-hover:[animation-play-state:paused]!' : ''}`}
          style={
            shouldAnimate
              ? ({
                  '--marquee-duration': `${duration}s`,
                  '--marquee-gap': `${gap}px`,
                } as React.CSSProperties)
              : undefined
          }
        >
          {path}
        </div>
      </div>

      {/* Copy indicator */}
      <span className="text-muted-foreground group-hover:text-foreground shrink-0 transition-colors">
        {copied ? (
          <Check className="h-3.5 w-3.5 text-green-500" />
        ) : (
          <Copy className="h-3.5 w-3.5" />
        )}
      </span>
    </button>
  )
}
