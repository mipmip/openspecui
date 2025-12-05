import { Activity, useState, type ReactNode } from 'react'

export interface Tab {
  id: string
  label: ReactNode
  icon?: ReactNode
  content: ReactNode
  /** Unmount the tab content when hidden to avoid heavy components lingering (e.g., Monaco) */
  unmountOnHide?: boolean
}

interface TabsProps {
  tabs: Tab[]
  defaultTab?: string
  /** Controlled active tab id */
  activeTab?: string
  onTabChange?: (id: string) => void
  className?: string
}

/**
 * Tabs component with React 19 Activity for state preservation.
 * Hidden tabs are pre-rendered at lower priority and preserve their state.
 * Supports both controlled and uncontrolled active tab.
 */
export function Tabs({
  tabs,
  defaultTab,
  activeTab: controlled,
  onTabChange,
  className = '',
}: TabsProps) {
  const [uncontrolled, setUncontrolled] = useState(defaultTab || tabs[0]?.id)
  const activeTab = controlled ?? uncontrolled

  if (tabs.length === 0) return null

  const handleChange = (id: string) => {
    if (!controlled) {
      setUncontrolled(id)
    }
    onTabChange?.(id)
  }

  return (
    <div className={`flex min-h-0 flex-1 flex-col ${className}`}>
      {/* Tab buttons */}
      <div className="z-2 border-border bg-background oveflow-x-auto sticky top-0 flex gap-1 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => handleChange(tab.id)}
            className={`-mb-px flex shrink-0 items-center gap-2 border-b-2 px-4 py-2 text-sm font-medium transition-colors ${
              activeTab === tab.id
                ? 'border-primary text-foreground'
                : 'text-muted-foreground hover:text-foreground border-transparent'
            }`}
          >
            {tab.icon}
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content with Activity for state preservation */}
      {tabs.map((tab) =>
        tab.unmountOnHide ? (
          activeTab === tab.id && (
            <div key={tab.id} className="min-h-0 flex-1">
              {tab.content}
            </div>
          )
        ) : (
          <Activity key={tab.id} mode={activeTab === tab.id ? 'visible' : 'hidden'}>
            <div className="min-h-0 flex-1">{tab.content}</div>
          </Activity>
        )
      )}
    </div>
  )
}
