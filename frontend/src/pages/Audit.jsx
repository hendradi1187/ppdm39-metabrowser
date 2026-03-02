import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ShieldCheck, AlertTriangle, XCircle, CheckCircle2, Database, Search, X } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { StatCard } from '../components/ui/StatCard'
import { api } from '../lib/api'

const CARD = 'rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e] shadow-lg shadow-black/40 overflow-hidden'
const CARD_ALT = 'rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#18181f] to-[#111118] shadow-lg shadow-black/40 overflow-hidden'
const CARD_HDR = 'px-4 py-3 border-b border-white/[0.06] flex items-center justify-between'
const SECTION_TITLE = 'text-[10px] font-semibold text-zinc-500 uppercase tracking-widest'

const OK_COLOR = 'rgba(52,211,153,0.45)'

function Highlight({ text, needle }) {
  if (!needle || !text) return text ?? null
  const lower = String(text).toLowerCase()
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

function BadgeCount({ filtered, total, variant }) {
  return (
    <span className="flex items-center gap-1.5 text-xs font-mono tabular-nums text-zinc-600">
      {filtered !== total && (
        <span className="text-zinc-700">{filtered} of</span>
      )}
      <Badge variant={variant}>{total}</Badge>
    </span>
  )
}

export default function Audit() {
  const [q, setQ] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit'],
    queryFn: api.audit,
    staleTime: 60_000,
  })

  const { summary = {}, missing = {}, orphans = [] } = data ?? {}
  const missingTables  = missing.missing_tables  ?? []
  const missingColumns = missing.missing_columns  ?? []
  const checkedCount   = missing.checked_tables_for_columns ?? 0

  const needle = q.trim().toLowerCase()

  const filteredMissingTables = useMemo(() =>
    needle ? missingTables.filter(t => t.toLowerCase().includes(needle)) : missingTables,
    [missingTables, needle]
  )

  const filteredMissingColumns = useMemo(() =>
    needle
      ? missingColumns.filter(m =>
          m.table.toLowerCase().includes(needle) ||
          m.column.toLowerCase().includes(needle)
        )
      : missingColumns,
    [missingColumns, needle]
  )

  const filteredOrphans = useMemo(() =>
    needle
      ? orphans.filter(o =>
          (o.fk ?? '').toLowerCase().includes(needle) ||
          (o.child ?? '').toLowerCase().includes(needle) ||
          (o.parent ?? '').toLowerCase().includes(needle) ||
          (o.pairs ?? []).some(p =>
            p.column_name.toLowerCase().includes(needle) ||
            (p.ref_column_name ?? '').toLowerCase().includes(needle)
          )
        )
      : orphans,
    [orphans, needle]
  )

  if (isLoading) return <LoadingState message="Running audit... this may take a moment." />
  if (error) return <ErrorState message={error.message} />

  if (data?.disabled) {
    return (
      <div className="max-w-xl space-y-6 fade-up">
        <div className="pb-2">
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Audit</h1>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">Compare meta model against the target PPDM39 database.</p>
        </div>
        <div className={CARD}>
          <div className="p-5 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.07] flex items-center justify-center">
                <Database size={16} className="text-zinc-500" />
              </div>
              <div>
                <div className="text-sm font-semibold text-zinc-200">Target DB is disabled</div>
                <div className="text-xs text-zinc-600 mt-0.5">Enable it in <span className="font-mono">server/.env</span></div>
              </div>
            </div>
            <pre className="text-xs font-mono text-zinc-500 bg-black/30 border border-white/[0.06] rounded-xl p-4 overflow-x-auto leading-relaxed">
{`TARGET_DB_ENABLED=true
TARGET_DB_HOST=127.0.0.1
TARGET_DB_PORT=5432
TARGET_DB_NAME=your_db
TARGET_DB_SCHEMA=public`}
            </pre>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-5xl space-y-6 fade-up">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Audit</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Comparing meta model against target schema{' '}
          <span className="font-mono text-zinc-400">{summary.target_schema}</span>.
        </p>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: 'Target Tables',    value: summary.target_tables,     icon: Database      },
          { label: 'Meta Tables',      value: summary.meta?.tables,      icon: ShieldCheck   },
          { label: 'Meta Constraints', value: summary.meta?.constraints, icon: AlertTriangle },
        ].map((props, i) => (
          <div key={props.label} className="fade-up" style={{ animationDelay: `${i * 55}ms` }}>
            <StatCard {...props} />
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative">
        <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
        <input
          type="text"
          value={q}
          onChange={e => setQ(e.target.value)}
          placeholder="Filter tables, columns, FK names…"
          className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-white/[0.07] bg-[#1c1c2a]
                     text-sm text-zinc-200 placeholder:text-zinc-600
                     focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15
                     transition-all duration-150"
        />
        {q && (
          <button
            onClick={() => setQ('')}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
          >
            <X size={13} />
          </button>
        )}
      </div>

      {/* Section divider — Coverage Analysis */}
      <div className="flex items-center gap-3">
        <span className={SECTION_TITLE}>Coverage Analysis</span>
        <div className="flex-1 h-px bg-white/[0.04]" />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        {/* Missing tables */}
        <div className={CARD}>
          <div className={CARD_HDR}>
            <div className="flex items-center gap-2">
              <XCircle size={13} className={missingTables.length > 0 ? 'text-red-400' : 'text-emerald-400/60'} />
              <span className={SECTION_TITLE}>Missing Tables</span>
            </div>
            <BadgeCount
              filtered={filteredMissingTables.length}
              total={missingTables.length}
              variant={missingTables.length > 0 ? 'error' : 'success'}
            />
          </div>
          <div className="p-3 max-h-64 overflow-y-auto">
            {missingTables.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs py-2" style={{ color: OK_COLOR }}>
                <CheckCircle2 size={13} /> All meta tables found in target.
              </div>
            ) : filteredMissingTables.length === 0 ? (
              <p className="text-xs text-zinc-700 py-2 px-1">No tables matching <span className="font-mono text-zinc-600">"{q}"</span></p>
            ) : (
              <div className="divide-y divide-white/[0.04]">
                {filteredMissingTables.map(t => (
                  <div key={t} className="flex items-center gap-2 py-1.5 last:pb-0">
                    <span className="w-1 h-1 rounded-full bg-red-500/60 shrink-0" />
                    <span className="font-mono text-xs text-zinc-400">
                      <Highlight text={t} needle={needle} />
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Missing columns */}
        <div className={CARD_ALT}>
          <div className={CARD_HDR}>
            <div className="flex items-center gap-2">
              <XCircle size={13} className={missingColumns.length > 0 ? 'text-orange-400' : 'text-emerald-400/60'} />
              <span className={SECTION_TITLE}>Missing Columns</span>
            </div>
            <BadgeCount
              filtered={filteredMissingColumns.length}
              total={missingColumns.length}
              variant={missingColumns.length > 0 ? 'warning' : 'success'}
            />
          </div>
          <div className="px-4 py-1.5 border-b border-white/[0.04]">
            <span className="text-[10px] text-zinc-700">Checked {checkedCount} tables (first 200 for performance)</span>
          </div>
          <div className="p-3 max-h-64 overflow-y-auto">
            {missingColumns.length === 0 ? (
              <div className="flex items-center gap-1.5 text-xs py-2" style={{ color: OK_COLOR }}>
                <CheckCircle2 size={13} /> No missing columns detected.
              </div>
            ) : filteredMissingColumns.length === 0 ? (
              <p className="text-xs text-zinc-700 py-2 px-1">No columns matching <span className="font-mono text-zinc-600">"{q}"</span></p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left py-1.5 text-zinc-600 font-semibold">Table</th>
                    <th className="text-left py-1.5 text-zinc-600 font-semibold">Column</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredMissingColumns.map((m, i) => (
                    <tr key={i} className="border-b border-white/[0.04] last:border-0">
                      <td className="py-1.5 font-mono text-zinc-500">
                        <Highlight text={m.table} needle={needle} />
                      </td>
                      <td className="py-1.5 font-mono text-orange-400/70">
                        <Highlight text={m.column} needle={needle} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      {/* Section divider — Referential Integrity */}
      <div className="flex items-center gap-3">
        <span className={SECTION_TITLE}>Referential Integrity</span>
        <div className="flex-1 h-px bg-white/[0.04]" />
        <span className="text-[10px] text-zinc-700 font-mono">First 30 FKs sampled</span>
      </div>

      {/* Orphan FKs */}
      <div className={CARD}>
        <div className={CARD_HDR}>
          <div className="flex items-center gap-2">
            <AlertTriangle size={13} className="text-zinc-600" />
            <span className={SECTION_TITLE}>Orphan FK Check</span>
          </div>
          {needle && (
            <span className="text-[10px] text-zinc-600 font-mono tabular-nums">
              {filteredOrphans.length} of {orphans.length}
            </span>
          )}
        </div>
        <div className="divide-y divide-white/[0.04]">
          {orphans.length === 0 && (
            <div className="px-4 py-3 text-xs text-zinc-600">No orphan data checked.</div>
          )}
          {orphans.length > 0 && filteredOrphans.length === 0 && (
            <div className="px-4 py-3 text-xs text-zinc-700">
              No FK entries matching <span className="font-mono text-zinc-600">"{q}"</span>
            </div>
          )}
          {filteredOrphans.map((o, i) => {
            const hasError   = !!o.error
            const hasOrphans = !hasError && o.orphan_count > 0
            return (
              <div key={i} className="px-4 py-2 flex items-start gap-3 hover:bg-white/[0.01] transition-colors">
                <div className="shrink-0 mt-0.5">
                  {hasError
                    ? <XCircle size={12} className="text-zinc-600" />
                    : hasOrphans
                      ? <AlertTriangle size={12} className="text-red-400" />
                      : <CheckCircle2 size={12} style={{ color: OK_COLOR }} />
                  }
                </div>
                <div className="flex-1 min-w-0 space-y-0.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono text-xs text-zinc-300 font-medium">
                      <Highlight text={o.fk} needle={needle} />
                    </span>
                    <span className="text-[10px] text-zinc-600">
                      <Highlight text={o.child} needle={needle} />
                      {' → '}
                      <Highlight text={o.parent} needle={needle} />
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-3 gap-y-0.5">
                    {(o.pairs ?? []).map((p, j) => (
                      <span key={j} className="text-[11px] font-mono text-zinc-700">
                        <Highlight text={p.column_name} needle={needle} />
                        {' → '}
                        <Highlight text={p.ref_column_name} needle={needle} />
                      </span>
                    ))}
                  </div>
                  {hasError && <div className="text-[11px] text-zinc-700 italic">{o.error}</div>}
                </div>
                <div className="shrink-0 text-right tabular-nums">
                  {!hasError && (
                    <span
                      className="text-sm font-bold"
                      style={{ color: hasOrphans ? 'rgba(248,113,113,0.85)' : OK_COLOR }}
                    >
                      {o.orphan_count.toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
