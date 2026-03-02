import { useState, useMemo, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { Columns3, Search, X, ArrowRight, ChevronDown, Download } from 'lucide-react'
import { LoadingState } from '../components/ui/Spinner'
import { downloadCSV } from '../lib/export'
import { api } from '../lib/api'
import clsx from 'clsx'

const CARD = 'rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e] shadow-lg shadow-black/40 overflow-hidden'
const CARD_HDR = 'px-4 py-3 border-b border-white/[0.06] flex items-center justify-between'
const SECTION_TITLE = 'text-[10px] font-semibold text-zinc-500 uppercase tracking-widest'

const SUGGESTIONS = ['ACTIVE_IND', 'ROW_CHANGED_BY', 'WELL_NUM', 'REMARK', 'SOURCE']

export default function ColumnXRef() {
  const [q, setQ] = useState('')
  const [debouncedQ, setDebouncedQ] = useState('')

  // 300ms debounce to avoid hammering the API on every keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQ(q.trim()), 300)
    return () => clearTimeout(t)
  }, [q])

  const isSearching = debouncedQ.length >= 2

  const { data, isLoading, isFetching } = useQuery({
    queryKey: ['columns', debouncedQ],
    queryFn: () => api.columns(debouncedQ),
    enabled: isSearching,
    staleTime: 30_000,
  })

  const rows = data?.rows ?? []
  const needle = debouncedQ.toLowerCase()

  // Group rows by column_name, preserving sort order
  const grouped = useMemo(() => {
    const map = new Map()
    for (const row of rows) {
      if (!map.has(row.column_name)) map.set(row.column_name, [])
      map.get(row.column_name).push(row)
    }
    return [...map.entries()]
  }, [rows])

  const loading = isLoading || (isFetching && rows.length === 0)

  return (
    <div className="max-w-5xl space-y-6 fade-up">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Column Cross-Reference</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Find all tables that share a column name across the PPDM 3.9 meta model.
        </p>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Type a column name — e.g. ACTIVE_IND, WELL_NUM, ROW_CHANGED_BY"
          autoFocus
          className="w-full pl-10 pr-10 py-3 rounded-xl border border-white/[0.07] bg-[#1c1c2a]
                     text-sm text-zinc-200 placeholder:text-zinc-600
                     focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15
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

      {/* Empty prompt */}
      {!isSearching && (
        <div className={CARD}>
          <div className="px-6 py-14 text-center space-y-4">
            <Columns3 size={28} className="mx-auto text-zinc-700" />
            <p className="text-sm text-zinc-600">Type at least 2 characters to search.</p>
            <div className="flex flex-wrap justify-center gap-2 pt-1">
              {SUGGESTIONS.map(s => (
                <button
                  key={s}
                  onClick={() => setQ(s)}
                  className="font-mono text-xs px-2.5 py-1 rounded-full
                             border border-white/[0.07] bg-white/[0.02] text-zinc-500
                             hover:text-accent hover:border-accent/25 hover:bg-accent/[0.04]
                             transition-all duration-150"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Loading */}
      {isSearching && loading && <LoadingState message="Searching columns…" />}

      {/* Results */}
      {isSearching && !loading && (
        <>
          {/* Summary bar */}
          <div className="flex items-center gap-3">
            <span className={SECTION_TITLE}>
              {grouped.length} column name{grouped.length !== 1 ? 's' : ''}
              <span className="text-zinc-700 ml-1.5">· {rows.length} occurrences</span>
            </span>
            <div className="flex-1 h-px bg-white/[0.04]" />
            {rows.length >= 1000 && (
              <span className="text-[10px] text-zinc-700 font-mono">Capped at 1 000</span>
            )}
            {rows.length > 0 && (
              <button
                onClick={() => downloadCSV(
                  `ppdm39_columns_${debouncedQ}.csv`,
                  rows,
                  [
                    { key: 'column_name',    label: 'Column'      },
                    { key: 'table_name',     label: 'Table'       },
                    { key: 'data_type',      label: 'Type'        },
                    { key: 'is_nullable',    label: 'Nullable'    },
                    { key: 'column_comment', label: 'Comment'     },
                    { key: 'table_comment',  label: 'Table Desc'  },
                  ]
                )}
                title="Export results to CSV"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.07]
                           bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                           transition-all duration-150 shrink-0"
              >
                <Download size={12} /> CSV
              </button>
            )}
          </div>

          {/* No results */}
          {grouped.length === 0 && (
            <div className={CARD}>
              <div className="px-5 py-10 text-center text-zinc-600 text-sm">
                No columns matching <span className="font-mono text-zinc-500">"{debouncedQ}"</span>
              </div>
            </div>
          )}

          {/* Column groups */}
          <div className="space-y-3">
            {grouped.map(([colName, tables]) => (
              <ColumnGroup key={colName} colName={colName} tables={tables} needle={needle} />
            ))}
          </div>
        </>
      )}
    </div>
  )
}

const INITIAL_VISIBLE = 10

function ColumnGroup({ colName, tables, needle }) {
  const [expanded, setExpanded] = useState(false)
  const showToggle = tables.length > INITIAL_VISIBLE
  const visible = showToggle && !expanded ? tables.slice(0, INITIAL_VISIBLE) : tables

  return (
    <div className={CARD}>
      {/* Group header */}
      <div className={CARD_HDR}>
        <span className="font-mono text-sm font-semibold text-zinc-200">
          <Highlight text={colName} needle={needle} />
        </span>
        <span className="text-xs text-zinc-600 tabular-nums font-mono">
          {tables.length} table{tables.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Table rows */}
      <div className="divide-y divide-white/[0.04]">
        {visible.map(t => (
          <Link
            key={t.table_name}
            to={`/table?name=${encodeURIComponent(t.table_name)}`}
            className="group grid grid-cols-[200px_160px_72px_1fr_20px] items-center
                       gap-3 px-4 py-2.5 hover:bg-white/[0.02] transition-colors duration-100"
          >
            <span className="font-mono text-xs font-semibold text-zinc-300
                             group-hover:text-accent transition-colors duration-150 truncate">
              <Highlight text={t.table_name} needle={needle} />
            </span>
            <span className="font-mono text-xs text-zinc-600 truncate">
              {t.data_type}
            </span>
            <span className={clsx(
              'text-[11px] shrink-0',
              t.is_nullable === 'NO' ? 'text-red-500/50' : 'text-zinc-700'
            )}>
              {t.is_nullable === 'NO' ? 'NOT NULL' : 'nullable'}
            </span>
            <span className="text-xs text-zinc-700 truncate leading-relaxed">
              {t.column_comment ?? ''}
            </span>
            <ArrowRight
              size={12}
              className="text-zinc-700 group-hover:text-zinc-500 justify-self-end
                         group-hover:translate-x-0.5 transition-all duration-150"
            />
          </Link>
        ))}
      </div>

      {/* Expand / collapse toggle */}
      {showToggle && (
        <button
          onClick={() => setExpanded(e => !e)}
          className="w-full flex items-center justify-center gap-1.5 px-4 py-2
                     text-xs text-zinc-600 hover:text-zinc-400 border-t border-white/[0.04]
                     transition-colors duration-150"
        >
          <ChevronDown size={12} className={clsx('transition-transform duration-200', expanded && 'rotate-180')} />
          {expanded
            ? 'Show less'
            : `Show ${tables.length - INITIAL_VISIBLE} more table${tables.length - INITIAL_VISIBLE !== 1 ? 's' : ''}…`
          }
        </button>
      )}
    </div>
  )
}

function Highlight({ text, needle }) {
  if (!needle || !text) return text ?? null
  const lower = text.toLowerCase()
  const idx = lower.indexOf(needle)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded-sm px-0.5 not-italic font-[inherit]">
        {text.slice(idx, idx + needle.length)}
      </mark>
      {text.slice(idx + needle.length)}
    </>
  )
}
