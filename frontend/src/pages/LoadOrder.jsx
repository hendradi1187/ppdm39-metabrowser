import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { GitBranch, AlertTriangle, Layers, ListOrdered, ChevronDown, Search, X, Download } from 'lucide-react'
import { Badge } from '../components/ui/Badge'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { downloadText } from '../lib/export'
import { api } from '../lib/api'
import clsx from 'clsx'

const TABS = ['Level View', 'Linear Order']

const CARD = 'rounded-2xl border border-white/[0.07] bg-gradient-to-b from-[#1c1c2a] to-[#14141e] shadow-lg shadow-black/40 overflow-hidden'
const CARD_HDR = 'px-4 py-3 border-b border-white/[0.06] flex items-center'

export default function LoadOrder() {
  const [tab, setTab] = useState(0)
  const [cyclesOpen, setCyclesOpen] = useState(false)
  const [q, setQ] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['load-order'],
    queryFn: api.loadOrder,
  })

  const { order = [], levels = {}, cycles = [], edges_count = 0, nodes_count = 0 } = data ?? {}

  const needle = q.trim().toLowerCase()

  // Filtered data derived from search query
  const filteredOrder = useMemo(() =>
    needle
      ? order.map((t, idx) => ({ t, idx })).filter(({ t }) => t.toLowerCase().includes(needle))
      : order.map((t, idx) => ({ t, idx })),
    [order, needle]
  )

  const filteredLevels = useMemo(() => {
    if (!needle) return Object.entries(levels)
    return Object.entries(levels)
      .map(([i, tables]) => [i, tables.filter(t => t.toLowerCase().includes(needle))])
      .filter(([, tables]) => tables.length > 0)
  }, [levels, needle])

  const totalMatches = needle
    ? tab === 0
      ? filteredLevels.reduce((sum, [, t]) => sum + t.length, 0)
      : filteredOrder.length
    : null

  function exportSQL() {
    const pad = s => s.padEnd(60, '─')
    const date = new Date().toISOString().slice(0, 10)
    const lines = [
      `-- ${'='.repeat(60)}`,
      `-- PPDM 3.9 Topological Load Order`,
      `-- Generated : ${date} by PPDM39 MetaBrowser`,
      `-- Tables    : ${nodes_count.toLocaleString()}`,
      `-- FK Edges  : ${edges_count.toLocaleString()}`,
      `-- Levels    : ${Object.keys(levels).length}`,
      `-- ${'='.repeat(60)}`,
      `-- Load tables in the order below to satisfy FK constraints.`,
      `-- Tables within the same level can be loaded in parallel.`,
      '',
    ]
    for (const [lvl, tables] of Object.entries(levels)) {
      lines.push(`-- ${pad(`LEVEL ${lvl}  (${tables.length} tables)`)}`)
      for (const t of tables) lines.push(t)
      lines.push('')
    }
    if (cycles.length > 0) {
      lines.push(`-- ${'='.repeat(60)}`)
      lines.push(`-- CIRCULAR DEPENDENCIES (${cycles.length} tables — handle manually)`)
      lines.push(`-- ${'='.repeat(60)}`)
      for (const c of cycles) lines.push(`-- ${c.table}  (remaining_in_degree=${c.remaining_in_degree})`)
    }
    downloadText('ppdm39_load_order.sql', lines.join('\n'))
  }

  if (isLoading) return <LoadingState message="Computing topological sort..." />
  if (error) return <ErrorState message={error.message} />

  return (
    <div className="max-w-5xl space-y-6 fade-up">
      {/* Header */}
      <div className="pb-2">
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-100">Load Order</h1>
        <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
          Topological sort of PPDM tables based on foreign key dependencies.
        </p>
      </div>

      {/* Summary chips + export */}
      <div className="flex flex-wrap items-center gap-2">
        <Chip icon={Layers}      label={`${nodes_count.toLocaleString()} nodes`} />
        <Chip icon={GitBranch}   label={`${edges_count.toLocaleString()} FK edges`} />
        <Chip icon={ListOrdered} label={`${Object.keys(levels).length} levels`} />
        {cycles.length > 0 && (
          <Chip icon={AlertTriangle} label={`${cycles.length} cycle nodes`} warn />
        )}
        <button
          onClick={exportSQL}
          title="Export load order as SQL script"
          className="ml-auto flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-white/[0.07]
                     bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                     transition-all duration-150"
        >
          <Download size={12} /> Export SQL
        </button>
      </div>

      {/* Cycles warning — collapsible */}
      {cycles.length > 0 && (
        <div className="rounded-2xl border border-orange-500/[0.15] bg-orange-500/[0.03]">
          <button
            onClick={() => setCyclesOpen(o => !o)}
            className="w-full flex items-center gap-3 px-4 py-3 text-left"
          >
            <AlertTriangle size={13} className="text-orange-400/70 shrink-0" />
            <div className="flex-1 min-w-0">
              <span className="text-xs font-semibold text-orange-300/80">
                {cycles.length} circular {cycles.length === 1 ? 'dependency' : 'dependencies'} detected
              </span>
              <span className="ml-2 text-[11px] text-zinc-600">
                — use deferred constraints or placeholder parents
              </span>
            </div>
            <ChevronDown
              size={13}
              className={clsx(
                'text-zinc-600 transition-transform duration-200 shrink-0',
                cyclesOpen && 'rotate-180'
              )}
            />
          </button>
          {cyclesOpen && (
            <div className="border-t border-orange-500/[0.10] px-4 pb-3 pt-2.5">
              <div className="max-h-36 overflow-y-auto">
                <div className="flex flex-wrap gap-1">
                  {cycles.map(c => (
                    <Link
                      key={c.table}
                      to={`/table?name=${encodeURIComponent(c.table)}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full
                                 border border-orange-500/[0.18] bg-orange-500/[0.05]
                                 font-mono text-[11px] text-orange-400/70
                                 hover:text-orange-300 hover:border-orange-500/30
                                 transition-colors duration-150"
                    >
                      {c.table}
                      <span className="text-orange-500/40 text-[10px]">({c.remaining_in_degree})</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-white/[0.06]">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={clsx(
              'px-4 py-2.5 text-sm transition-all duration-150 border-b-2 -mb-px',
              tab === i
                ? 'border-accent text-zinc-100 font-semibold'
                : 'border-transparent text-zinc-500 hover:text-zinc-300'
            )}>
            {t}
          </button>
        ))}
      </div>

      {/* Search bar */}
      <div className="relative flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={13} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-600 pointer-events-none" />
          <input
            type="text"
            value={q}
            onChange={e => setQ(e.target.value)}
            placeholder="Filter tables by name…"
            className="w-full pl-9 pr-9 py-2.5 rounded-xl border border-white/[0.07] bg-[#1c1c2a]
                       text-sm text-zinc-200 placeholder:text-zinc-600
                       focus:outline-none focus:border-accent/40 focus:ring-1 focus:ring-accent/15
                       transition-all duration-150"
          />
          {q && (
            <button
              onClick={() => setQ('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-600 hover:text-zinc-400 transition-colors"
            >
              <X size={13} />
            </button>
          )}
        </div>
        {totalMatches !== null && (
          <span className="text-xs text-zinc-600 font-mono shrink-0 tabular-nums">
            {totalMatches.toLocaleString()} match{totalMatches !== 1 ? 'es' : ''}
          </span>
        )}
      </div>

      {/* Level View */}
      {tab === 0 && (
        <div className="space-y-3">
          {filteredLevels.length === 0 && needle && (
            <p className="text-sm text-zinc-600 py-4 text-center">
              No tables matching <span className="font-mono text-zinc-500">"{q}"</span>
            </p>
          )}
          {filteredLevels.map(([i, tables]) => {
            const originalCount = levels[i]?.length ?? tables.length
            return (
              <div key={i} className={CARD}>
                <div className={clsx(CARD_HDR, 'gap-3')}>
                  <Badge variant="primary">Level {i}</Badge>
                  <span className="text-xs text-zinc-600 tabular-nums">
                    {needle
                      ? <>{tables.length} <span className="text-zinc-700">of {originalCount}</span></>
                      : <>{tables.length} table{tables.length !== 1 ? 's' : ''}</>
                    }
                  </span>
                </div>
                <div className="p-3 flex flex-wrap gap-1">
                  {tables.map(t => (
                    <Link key={t} to={`/table?name=${encodeURIComponent(t)}`}
                      className="font-mono text-[11px] px-2 py-0.5 rounded-md border border-white/[0.06] bg-white/[0.015]
                                 text-zinc-500 hover:text-accent hover:border-accent/25 hover:bg-accent/[0.04]
                                 transition-all duration-150">
                      <Highlight text={t} needle={needle} />
                    </Link>
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Linear Order */}
      {tab === 1 && (
        <div className={CARD}>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest w-16">#</th>
                <th className="text-left px-4 py-3 text-[10px] font-semibold text-zinc-600 uppercase tracking-widest">Table</th>
              </tr>
            </thead>
            <tbody>
              {filteredOrder.length === 0 && needle && (
                <tr>
                  <td colSpan={2} className="px-4 py-8 text-center text-sm text-zinc-600">
                    No tables matching <span className="font-mono text-zinc-500">"{q}"</span>
                  </td>
                </tr>
              )}
              {filteredOrder.map(({ t, idx }) => (
                <tr key={t} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors">
                  <td className="px-4 py-2 text-xs text-zinc-700 tabular-nums font-mono">{idx + 1}</td>
                  <td className="px-4 py-2">
                    <Link to={`/table?name=${encodeURIComponent(t)}`}
                      className="font-mono text-xs text-accent hover:text-accent-hover transition-colors">
                      <Highlight text={t} needle={needle} />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

/** Highlight matching substring in table name */
function Highlight({ text, needle }) {
  if (!needle) return text
  const idx = text.toLowerCase().indexOf(needle)
  if (idx === -1) return text
  return (
    <>
      {text.slice(0, idx)}
      <mark className="bg-accent/20 text-accent rounded-sm px-0.5">{text.slice(idx, idx + needle.length)}</mark>
      {text.slice(idx + needle.length)}
    </>
  )
}

function Chip({ icon: Icon, label, warn }) {
  return (
    <div className={clsx(
      'flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium',
      warn
        ? 'border-orange-500/[0.18] bg-orange-500/[0.04] text-orange-400/70'
        : 'border-white/[0.07] bg-white/[0.02] text-zinc-500'
    )}>
      <Icon size={11} />
      {label}
    </div>
  )
}
