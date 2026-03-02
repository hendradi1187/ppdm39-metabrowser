import { NavLink, Link } from 'react-router-dom'
import {
  LayoutDashboard,
  Table2,
  GitBranch,
  ShieldCheck,
  Database,
  ChevronRight,
  Columns3,
  Bookmark,
  X,
  Share2,
} from 'lucide-react'
import clsx from 'clsx'
import { useBookmarks } from '../lib/BookmarksContext'

const navGroups = [
  {
    label: 'Explorer',
    items: [
      { to: '/',       label: 'Dashboard',  icon: LayoutDashboard, end: true },
      { to: '/tables', label: 'Tables',     icon: Table2 },
    ],
  },
  {
    label: 'Analysis',
    items: [
      { to: '/columns',    label: 'Column X-Ref', icon: Columns3    },
      { to: '/erd',        label: 'ERD Viewer',   icon: Share2      },
      { to: '/load-order', label: 'Load Order',   icon: GitBranch   },
      { to: '/audit',      label: 'Audit',        icon: ShieldCheck },
    ],
  },
]

function NavItem({ to, label, icon: Icon, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        clsx(
          'flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors duration-150 group',
          isActive
            ? 'bg-white/8 text-zinc-100'
            : 'text-zinc-500 hover:text-zinc-200 hover:bg-white/5'
        )
      }
    >
      {({ isActive }) => (
        <>
          <Icon size={15} className={isActive ? 'text-accent' : 'text-zinc-600 group-hover:text-zinc-400'} />
          <span>{label}</span>
          {isActive && <ChevronRight size={12} className="ml-auto text-zinc-600" />}
        </>
      )}
    </NavLink>
  )
}

export default function Sidebar({ metaDb, targetDb }) {
  const { bookmarks, toggle } = useBookmarks()

  return (
    <aside className="w-[220px] shrink-0 flex flex-col bg-surface border-r border-border h-full">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-border">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-md bg-accent/10 border border-accent/20 flex items-center justify-center">
            <Database size={14} className="text-accent" />
          </div>
          <div>
            <div className="text-xs font-semibold text-zinc-100 leading-none">PPDM39</div>
            <div className="text-[10px] text-zinc-600 mt-0.5 leading-none">MetaBrowser</div>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 flex flex-col gap-3 overflow-y-auto">
        {navGroups.map(group => (
          <div key={group.label}>
            <div className="px-2 pb-1">
              <span className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest">
                {group.label}
              </span>
            </div>
            <div className="flex flex-col gap-0.5">
              {group.items.map(item => (
                <NavItem key={item.to} {...item} />
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* Favorites */}
      <div className="border-t border-border px-3 py-3">
        <div className="flex items-center gap-1.5 mb-2">
          <Bookmark size={11} className="text-zinc-700" />
          <span className="text-[10px] font-semibold text-zinc-700 uppercase tracking-widest flex-1">
            Favorites
          </span>
          {bookmarks.length > 0 && (
            <span className="text-[10px] text-zinc-700 font-mono tabular-nums">
              {bookmarks.length}
            </span>
          )}
        </div>

        {bookmarks.length === 0 ? (
          <p className="text-[11px] text-zinc-700 px-1 py-1 leading-relaxed">
            Save tables with the bookmark icon.
          </p>
        ) : (
          <div className="space-y-0.5 max-h-44 overflow-y-auto -mx-1">
            {bookmarks.map(name => (
              <div
                key={name}
                className="group flex items-center gap-1 rounded-md px-2 py-1.5
                           hover:bg-white/[0.04] transition-colors duration-150"
              >
                <Link
                  to={`/table?name=${encodeURIComponent(name)}`}
                  className="flex-1 font-mono text-[11px] text-zinc-500
                             group-hover:text-zinc-200 transition-colors duration-150 truncate"
                >
                  {name}
                </Link>
                <button
                  onClick={() => toggle(name)}
                  title="Remove from favorites"
                  className="opacity-0 group-hover:opacity-100 text-zinc-700
                             hover:text-zinc-400 transition-all duration-150 shrink-0"
                >
                  <X size={11} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* DB status footer */}
      <div className="px-3 py-3 border-t border-border space-y-2">
        <DbIndicator label="Meta DB"   name={metaDb}   />
        <DbIndicator label="Target DB" name={targetDb} dimmed={!targetDb} />
      </div>
    </aside>
  )
}

function DbIndicator({ label, name, dimmed }) {
  return (
    <div className="flex items-center gap-2 min-w-0">
      <span className={clsx(
        'w-1.5 h-1.5 rounded-full shrink-0',
        dimmed ? 'bg-zinc-700' : 'bg-emerald-500'
      )} />
      <span className="text-[10px] text-zinc-600 shrink-0">{label}</span>
      <span className={clsx(
        'text-[10px] font-mono truncate',
        dimmed ? 'text-zinc-700' : 'text-zinc-400'
      )}>
        {name ?? 'disabled'}
      </span>
    </div>
  )
}
