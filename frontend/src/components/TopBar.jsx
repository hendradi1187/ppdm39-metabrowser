import { useLocation, useSearchParams } from 'react-router-dom'
import { ChevronRight, Menu } from 'lucide-react'

const routeLabels = {
  '/':           ['Dashboard'],
  '/tables':     ['Tables'],
  '/table':      ['Tables', null],   // null = dynamic from query param
  '/load-order': ['Load Order'],
  '/audit':      ['Audit'],
}

export default function TopBar({ onMenuToggle }) {
  const { pathname } = useLocation()
  const [params] = useSearchParams()
  const crumbs = routeLabels[pathname] ?? [pathname]

  return (
    <header className="h-12 shrink-0 flex items-center px-4 gap-3 border-b border-border bg-surface/60 backdrop-blur-sm">
      {/* Mobile menu button */}
      <button
        onClick={onMenuToggle}
        className="md:hidden text-zinc-500 hover:text-zinc-200 transition-colors"
      >
        <Menu size={18} />
      </button>

      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm min-w-0">
        <span className="text-zinc-600 text-xs font-mono shrink-0">ppdm39</span>
        {crumbs.map((crumb, i) => {
          const label = crumb === null ? params.get('name') ?? '...' : crumb
          const isLast = i === crumbs.length - 1
          return (
            <span key={i} className="flex items-center gap-1.5 min-w-0">
              <ChevronRight size={13} className="text-zinc-700 shrink-0" />
              <span className={isLast ? 'text-zinc-200 font-medium truncate' : 'text-zinc-500 truncate'}>
                {label}
              </span>
            </span>
          )
        })}
      </nav>
    </header>
  )
}
