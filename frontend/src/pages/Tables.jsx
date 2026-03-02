import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Search, ArrowRight, X, Bookmark, BookmarkCheck, Download } from 'lucide-react'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { useBookmarks } from '../lib/BookmarksContext'
import { downloadCSV } from '../lib/export'
import { api } from '../lib/api'

export default function Tables() {
  const [q, setQ] = useState('')

  // Load all tables once — filter client-side for instant results
  const { data, isLoading, error } = useQuery({
    queryKey: ['tables'],
    queryFn: () => api.tables(''),
  })

  const allTables = data?.tables ?? data ?? []
  const { toggle, isBookmarked } = useBookmarks()

  const needle = q.trim().toLowerCase()

  const filtered = useMemo(() => {
    if (!needle) return allTables
    return allTables.filter(t =>
      t.table_name.toLowerCase().includes(needle) ||
      (t.table_comment ?? '').toLowerCase().includes(needle)
    )
  }, [allTables, needle])

  return (
    <div className="max-w-5xl space-y-6 fade-up">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 pb-2">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Tables</h1>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">Browse all PPDM meta model tables.</p>
        </div>
        {!isLoading && (
          <div className="flex items-center gap-3 mt-2 shrink-0">
            <span className="text-xs text-zinc-600 tabular-nums font-mono">
              {needle
                ? <>{filtered.length.toLocaleString()} <span className="text-zinc-700">of {allTables.length.toLocaleString()}</span></>
                : allTables.length.toLocaleString()
              }
              {' tables'}
            </span>
            <button
              onClick={() => downloadCSV(
                needle ? 'ppdm39_tables_filtered.csv' : 'ppdm39_tables.csv',
                filtered,
                [{ key: 'table_name', label: 'Table Name' }, { key: 'table_comment', label: 'Description' }]
              )}
              title="Export to CSV"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.07]
                         bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                         transition-all duration-150"
            >
              <Download size={12} /> CSV
            </button>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter by name or description — e.g. WELL, BA_, ENT_"
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/[0.07] bg-[#1c1c2a] text-sm text-zinc-200
                     placeholder:text-zinc-600 focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15
                     transition-all duration-150"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={14} />
          </button>
        )}
      </div>

      {/* Table grid */}
      {isLoading && <LoadingState message="Fetching tables..." />}
      {error && <ErrorState message={error.message} />}

      {!isLoading && !error && (
        <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e]
                        shadow-xl shadow-black/40 overflow-hidden">

          {/* Sticky header */}
          <div className="sticky top-0 z-10 grid grid-cols-[minmax(180px,280px)_1fr_28px_28px]
                          px-5 py-3 border-b border-white/[0.06]
                          bg-[#1a1a26]/80 backdrop-blur-sm">
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Table Name</span>
            <span className="text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Description</span>
            <span />
            <span />
          </div>

          {/* Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filtered.length === 0 && (
              <div className="px-5 py-12 text-center text-zinc-600 text-sm">
                No tables found{needle ? <> matching <span className="font-mono text-zinc-500">"{q}"</span></> : ''}.
              </div>
            )}
            {filtered.map((t) => {
              const saved = isBookmarked(t.table_name)
              return (
                <Link
                  key={t.table_name}
                  to={`/table?name=${encodeURIComponent(t.table_name)}`}
                  className="group grid grid-cols-[minmax(180px,280px)_1fr_28px_28px] items-center
                             px-5 py-3.5 hover:bg-white/[0.03] transition-colors duration-100"
                >
                  {/* Table name */}
                  <span className="font-mono text-xs font-semibold text-zinc-200
                                   group-hover:text-accent transition-colors duration-150 truncate pr-4">
                    <Highlight text={t.table_name} needle={needle} />
                  </span>

                  {/* Description */}
                  <span className="text-xs text-zinc-600 truncate pr-4 leading-relaxed">
                    {t.table_comment
                      ? <Highlight text={t.table_comment} needle={needle} />
                      : <span className="text-zinc-700 italic">No description</span>
                    }
                  </span>

                  {/* Bookmark toggle */}
                  <button
                    onClick={e => { e.preventDefault(); e.stopPropagation(); toggle(t.table_name) }}
                    title={saved ? 'Remove from favorites' : 'Save to favorites'}
                    className={`justify-self-end transition-all duration-150
                                ${saved
                                  ? 'text-accent opacity-100'
                                  : 'text-zinc-700 opacity-0 group-hover:opacity-100 hover:text-zinc-400'
                                }`}
                  >
                    {saved ? <BookmarkCheck size={13} /> : <Bookmark size={13} />}
                  </button>

                  {/* Arrow */}
                  <ArrowRight
                    size={13}
                    className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-0.5
                               transition-all duration-150 justify-self-end"
                  />
                </Link>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

function Highlight({ text, needle }) {
  if (!needle) return text
  const idx = text.toLowerCase().indexOf(needle)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded-sm px-0.5 not-italic">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  )
}
