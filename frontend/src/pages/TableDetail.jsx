import { useState, useMemo } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ArrowRight, Tag, Search, X, Bookmark, BookmarkCheck, Download, Share2 } from 'lucide-react'
import { Badge, ConstraintBadge } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { useBookmarks } from '../lib/BookmarksContext'
import { downloadCSV } from '../lib/export'
import { api } from '../lib/api'

export default function TableDetail() {
  const [params] = useSearchParams()
  const name = params.get('name') ?? ''
  const [q, setQ] = useState('')

  const { toggle, isBookmarked } = useBookmarks()

  const { data, isLoading, error } = useQuery({
    queryKey: ['table', name],
    queryFn: () => api.table(name),
    enabled: !!name,
  })

  const { table, columns = [], constraints = [], parents = [], children = [], aliases = [] } = data ?? {}

  const needle = q.trim().toLowerCase()

  const filteredColumns = useMemo(() => {
    if (!needle) return columns
    return columns.filter(c =>
      c.column_name.toLowerCase().includes(needle) ||
      (c.column_comment ?? '').toLowerCase().includes(needle) ||
      (c.data_type ?? '').toLowerCase().includes(needle) ||
      (c.domain ?? '').toLowerCase().includes(needle)
    )
  }, [columns, needle])

  const filteredConstraints = useMemo(() => {
    if (!needle) return constraints
    return constraints.filter(con =>
      con.constraint_name.toLowerCase().includes(needle) ||
      (con.ref_table_name ?? '').toLowerCase().includes(needle) ||
      (con.columns ?? []).some(cc =>
        cc.column_name.toLowerCase().includes(needle) ||
        (cc.ref_column_name ?? '').toLowerCase().includes(needle)
      )
    )
  }, [constraints, needle])

  if (!name) return <ErrorState message="No table name specified." />
  if (isLoading) return <LoadingState message={`Loading ${name}...`} />
  if (error) return <ErrorState message={error.message} />

  const colCount = needle
    ? <>{filteredColumns.length} <span className="text-zinc-700">of {columns.length}</span></>
    : columns.length

  const conCount = needle
    ? <>{filteredConstraints.length} <span className="text-zinc-700">of {constraints.length}</span></>
    : constraints.length

  return (
    <div className="max-w-6xl space-y-6 fade-up">
      {/* Back link */}
      <Link to="/tables" className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors duration-150">
        <ArrowLeft size={12} /> Back to Tables
      </Link>

      {/* Table header card */}
      <div className="p-6 rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e]
                      shadow-xl shadow-black/40 space-y-5">
        {/* Name + aliases + bookmark */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-wrap flex-1">
            <h1 className="font-mono text-2xl font-bold text-zinc-100 tracking-tight">{table?.table_name}</h1>
            {aliases.map(a => (
              <Badge key={a.table_alias} variant="default" className="flex items-center gap-1 mt-1">
                <Tag size={10} /> {a.alias_type ?? 'ALIAS'}: {a.table_alias}
              </Badge>
            ))}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to={`/erd?name=${encodeURIComponent(name)}`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07]
                         bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                         transition-all duration-150"
            >
              <Share2 size={12} /> ERD
            </Link>
            <button
              onClick={() => downloadCSV(
                `${table.table_name}_columns.csv`,
                columns,
                [
                  { key: 'column_name',       label: 'Column'    },
                  { key: 'data_type',         label: 'Type'      },
                  { key: 'column_length',     label: 'Length'    },
                  { key: 'decimal_precision', label: 'Precision' },
                  { key: 'decimal_scale',     label: 'Scale'     },
                  { key: 'is_nullable',       label: 'Nullable'  },
                  { key: 'domain',            label: 'Domain'    },
                  { key: 'column_comment',    label: 'Comment'   },
                ]
              )}
              title="Export columns to CSV"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/[0.07]
                         bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                         transition-all duration-150"
            >
              <Download size={12} /> CSV
            </button>
            {table?.table_name && (
              <BookmarkButton name={table.table_name} toggle={toggle} saved={isBookmarked(table.table_name)} />
            )}
          </div>
        </div>

        {/* Comment */}
        {table?.table_comment && (
          <p className="text-sm text-zinc-500 leading-relaxed max-w-3xl">{table.table_comment}</p>
        )}

        {/* Pill badges + search in one row */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex flex-wrap gap-2 flex-1">
            <MetaPill label="Parents"     value={parents.length} />
            <MetaPill label="Children"    value={children.length} />
            <MetaPill label="Columns"     value={columns.length} />
            <MetaPill label="Constraints" value={constraints.length} />
          </div>

          {/* Inline search — filters columns & constraints */}
          <div className="relative shrink-0 w-64">
            <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
            <input
              type="text"
              value={q}
              onChange={e => setQ(e.target.value)}
              placeholder="Filter columns & constraints…"
              className="w-full pl-8 pr-8 py-2 rounded-lg border border-white/[0.07] bg-white/[0.03]
                         text-xs text-zinc-200 placeholder:text-zinc-600
                         focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15
                         transition-all duration-150"
            />
            {q && (
              <button
                onClick={() => setQ('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
              >
                <X size={12} />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="grid lg:grid-cols-[280px_1fr] lg:divide-x lg:divide-white/[0.05] gap-4 lg:gap-0">

        {/* Left: relationships */}
        <div className="space-y-4 lg:pr-4">
          <Section title="Parent Tables" count={parents.length}>
            {parents.length === 0
              ? <Empty label="No parent tables" />
              : parents.map(p => (
                  <RelRow key={p.constraint_name} table={p.parent_table} via={p.constraint_name} needle={needle} />
                ))
            }
          </Section>
          <Section title="Child Tables" count={children.length}>
            {children.length === 0
              ? <Empty label="No child tables" />
              : children.map(c => (
                  <RelRow key={c.constraint_name} table={c.child_table} via={c.constraint_name} needle={needle} />
                ))
            }
          </Section>
        </div>

        {/* Right: columns + constraints */}
        <div className="space-y-4 lg:pl-4">

          {/* Columns */}
          <Section title="Columns" count={colCount}>
            {filteredColumns.length === 0 && needle ? (
              <Empty label={`No columns matching "${q}"`} />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.05]">
                      <Th>Name</Th>
                      <Th>Type</Th>
                      <Th>Domain</Th>
                      <Th center>NN</Th>
                      <Th>Comment</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {filteredColumns.map(c => {
                      const isNotNull = c.null_allowed_ba_id !== 'Y'
                      return (
                        <tr key={c.column_name} className="hover:bg-white/[0.02] transition-colors duration-100">
                          <td className="px-3 py-3 font-mono text-zinc-200 font-semibold whitespace-nowrap">
                            <Highlight text={c.column_name} needle={needle} />
                          </td>
                          <td className="px-3 py-3 text-zinc-400 whitespace-nowrap font-mono">
                            <Highlight text={
                              c.data_type +
                              (c.column_length ? `(${c.column_length})` : '') +
                              (c.decimal_precision ? `(${c.decimal_precision},${c.decimal_scale ?? 0})` : '')
                            } needle={needle} />
                          </td>
                          <td className="px-3 py-3 text-zinc-600">
                            <Highlight text={c.domain ?? '—'} needle={needle} />
                          </td>
                          <td className="px-3 py-3 text-center">
                            {isNotNull
                              ? <span className="inline-block w-1.5 h-1.5 rounded-full bg-red-500/50" title="NOT NULL" />
                              : <span className="inline-block w-1.5 h-1.5 rounded-full bg-zinc-700" title="nullable" />
                            }
                          </td>
                          <td className="px-3 py-3 text-zinc-600 max-w-xs truncate">
                            <Highlight text={c.column_comment ?? ''} needle={needle} />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Section>

          {/* Subtle divider */}
          <div className="border-t border-white/[0.04]" />

          {/* Constraints */}
          <Section title="Constraints" count={conCount}>
            {filteredConstraints.length === 0 && needle ? (
              <Empty label={`No constraints matching "${q}"`} />
            ) : (
              <div className="space-y-2">
                {filteredConstraints.map(con => (
                  <div key={con.constraint_name}
                       className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 space-y-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <ConstraintBadge type={con.constraint_type} />
                      <span className="font-mono text-xs text-zinc-300 font-medium">
                        <Highlight text={con.constraint_name} needle={needle} />
                      </span>
                      {con.ref_table_name && (
                        <span className="flex items-center gap-1 text-xs text-zinc-600">
                          <ArrowRight size={10} className="text-zinc-700" />
                          <Link to={`/table?name=${encodeURIComponent(con.ref_table_name)}`}
                            className="text-accent hover:text-accent-hover font-mono transition-colors">
                            <Highlight text={con.ref_table_name} needle={needle} />
                          </Link>
                        </span>
                      )}
                    </div>
                    {con.columns?.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pl-1">
                        {con.columns.map(cc => (
                          <span key={cc.column_position} className="flex items-center gap-1 text-[11px]">
                            <span className="text-zinc-700 tabular-nums">{cc.column_position}.</span>
                            <span className="font-mono text-zinc-400">
                              <Highlight text={cc.column_name} needle={needle} />
                            </span>
                            {cc.ref_column_name && (
                              <>
                                <ArrowRight size={9} className="text-zinc-700" />
                                <span className="font-mono text-zinc-400">
                                  <Highlight text={cc.ref_column_name} needle={needle} />
                                </span>
                              </>
                            )}
                          </span>
                        ))}
                      </div>
                    )}
                    {con.constraint_text && (
                      <pre className="text-[11px] font-mono text-zinc-500 bg-black/20 rounded-lg p-2.5
                                      border border-white/[0.05] overflow-x-auto leading-relaxed">
                        {con.constraint_text}
                      </pre>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Section>
        </div>
      </div>
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

function Section({ title, count, children }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e]
                    shadow-lg shadow-black/40 overflow-hidden">
      <div className="px-4 py-3.5 border-b border-white/[0.06] flex items-center justify-between">
        <span className="text-[10px] font-semibold text-zinc-500 uppercase tracking-widest">{title}</span>
        <span className="text-xs text-zinc-600 tabular-nums font-mono">{count}</span>
      </div>
      <div className="p-3">{children}</div>
    </div>
  )
}

function Th({ children, center }) {
  return (
    <th className={`px-3 py-2.5 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest whitespace-nowrap
                    ${center ? 'text-center' : 'text-left'}`}>
      {children}
    </th>
  )
}

function MetaPill({ label, value }) {
  return (
    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full
                    bg-white/[0.04] border border-white/[0.07] text-xs">
      <span className="font-bold text-zinc-200 tabular-nums">{value}</span>
      <span className="text-zinc-600">{label}</span>
    </div>
  )
}

function Empty({ label }) {
  return <p className="text-xs text-zinc-700 py-2 px-1">{label}</p>
}

function BookmarkButton({ name, toggle, saved }) {
  return (
    <button
      onClick={() => toggle(name)}
      title={saved ? 'Remove from favorites' : 'Save to favorites'}
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-medium
                  transition-all duration-150 shrink-0
                  ${saved
                    ? 'border-accent/30 bg-accent/[0.08] text-accent'
                    : 'border-white/[0.07] bg-white/[0.02] text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]'
                  }`}
    >
      {saved
        ? <BookmarkCheck size={12} />
        : <Bookmark size={12} />
      }
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}

function RelRow({ table, via, needle }) {
  return (
    <Link
      to={`/table?name=${encodeURIComponent(table)}`}
      className="group flex items-center justify-between py-2 px-2 -mx-2 rounded-lg
                 hover:bg-white/[0.04] transition-colors duration-150
                 border-b border-white/[0.04] last:border-0"
    >
      <span className="font-mono text-xs text-zinc-400 group-hover:text-accent transition-colors duration-150 font-medium">
        <Highlight text={table} needle={needle} />
      </span>
      <span className="text-[10px] font-mono text-zinc-700 group-hover:text-zinc-500 truncate max-w-[110px] text-right
                       transition-colors duration-150">
        {via}
      </span>
    </Link>
  )
}
