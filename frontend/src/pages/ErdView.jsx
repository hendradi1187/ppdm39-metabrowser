import { useState, useMemo } from 'react'
import { useSearchParams, Link, useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { ArrowLeft, ZoomIn, ZoomOut, ExternalLink, Search, Share2 } from 'lucide-react'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { api } from '../lib/api'

// ─── Layout constants ──────────────────────────────────────────────────────────
const NW   = 220      // node width
const NH_HEAD = 36    // node header height
const NH_ROW = 20     // node row height
const HGAP = 30       // horizontal gap between siblings
const VGAP = 50       // vertical gap between rows
const PAD  = 40       // canvas padding
const MAX_SHOW = 20   // max nodes per row before capping

// ─── Layout & Render ───────────────────────────────────────────────────────────

function getNodeHeight(node) {
  if (!node.columns) return NH_HEAD
  return NH_HEAD + node.columns.length * NH_ROW
}

function rowW(n) {
  return Math.max(n * NW + Math.max(n - 1, 0) * HGAP, NW)
}

function computeLayout(name, ownCols, constraints, parents, children) {
  const hasP = parents.length > 0
  const hasC = children.length > 0

  const canvasW = Math.max(rowW(parents.length), NW, rowW(children.length)) + PAD * 2
  const cxCanvas = canvasW / 2

  const pks = new Set(
    constraints
      .filter(c => c.constraint_type === 'PRIMARY KEY')
      .flatMap(c => c.columns)
      .map(c => c.column_name)
  )

  const makeNode = (item, overrides) => {
    const columns = (item.columns || []).map(c => ({
      ...c,
      is_pk: pks.has(c.column_name),
    }))
    return { ...item, ...overrides, columns }
  }

  const makeNodeList = (items, y, getId) => {
    const n = items.length
    const totalW = rowW(n)
    const startX = cxCanvas - totalW / 2
    return items.map((item, i) => {
      const node = makeNode(item, {
        id: getId(item),
        label: getId(item),
      })
      const nodeH = getNodeHeight(node)
      return {
        ...node,
        x: startX + i * (NW + HGAP),
        y,
        w: NW,
        h: nodeH,
        ncx: startX + i * (NW + HGAP) + NW / 2,
      }
    })
  }

  // Parents
  const parentNodes = makeNodeList(parents, PAD, p => p.parent_table)

  // Center
  const centerNodeHeight = getNodeHeight({ columns: ownCols })
  const parentRowMaxH = Math.max(0, ...parentNodes.map(n => n.h))
  const centerY = hasP ? PAD + parentRowMaxH + VGAP : PAD
  const center = makeNode(
    { id: name, label: name, columns: ownCols },
    {
      x: cxCanvas - NW / 2, y: centerY,
      w: NW, h: centerNodeHeight,
      ncx: cxCanvas,
      isCenter: true,
    }
  )

  // Children
  const childY = centerY + center.h + VGAP
  const childNodes = makeNodeList(children, childY, c => c.child_table)
  const childRowMaxH = Math.max(0, ...childNodes.map(n => n.h))


  // Edges
  const edges = [
    ...parentNodes.map(p => ({
      id: `${name}→${p.id}`,
      x1: center.ncx, y1: center.y,
      x2: p.ncx,      y2: p.y + p.h,
    })),
    ...childNodes.map(c => ({
      id: `${c.id}→${name}`,
      x1: c.ncx,      y1: c.y,
      x2: center.ncx, y2: center.y + center.h,
    })),
  ]

  const canvasH = (hasC ? childY + childRowMaxH : centerY + center.h) + PAD

  return { canvasW, canvasH, center, parentNodes, childNodes, edges }
}

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function ErdView() {
  const [params]   = useSearchParams()
  const name       = params.get('name') ?? ''
  const navigate   = useNavigate()
  const [zoom, setZoom] = useState(1)

  const { data, isLoading, error } = useQuery({
    queryKey: ['erd', name],
    queryFn:  () => api.erdData(name),
    enabled:  !!name,
  })

  const { columns = [], constraints = [], parents = [], children = [] } = data ?? {}

  // Cap rows to MAX_SHOW to keep canvas manageable
  const visParents  = parents.slice(0, MAX_SHOW)
  const visChildren = children.slice(0, MAX_SHOW)
  const hiddenP = parents.length  - visParents.length
  const hiddenC = children.length - visChildren.length

  const { canvasW, canvasH, center, parentNodes, childNodes, edges } =
    useMemo(() => computeLayout(name, columns, constraints, visParents, visChildren), [name, columns, constraints, visParents, visChildren])


  if (!name)      return <ErrorState message="No table name specified." />
  if (isLoading)  return <LoadingState message={`Building ERD for ${name}…`} />
  if (error)      return <ErrorState message={error.message} />

  const zoomIn    = () => setZoom(z => Math.min(+(z + 0.15).toFixed(2), 2.5))
  const zoomOut   = () => setZoom(z => Math.max(+(z - 0.15).toFixed(2), 0.25))
  const zoomReset = () => setZoom(1)

  const handleNode = (id) => navigate(`/erd?name=${encodeURIComponent(id)}`)

  return (
    <div className="max-w-6xl space-y-4 fade-up">

      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Link
            to={`/table?name=${encodeURIComponent(name)}`}
            className="inline-flex items-center gap-1.5 text-xs text-zinc-600 hover:text-zinc-300 transition-colors"
          >
            <ArrowLeft size={12} /> Back to Detail
          </Link>
          <span className="text-zinc-700 text-xs">·</span>
          <h1 className="font-mono text-lg font-bold text-zinc-100 tracking-tight">{name}</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Summary */}
          <div className="flex items-center gap-2 text-[11px] font-mono text-zinc-600">
            <span title="parent tables">↑ {parents.length}</span>
            <span className="text-zinc-700">·</span>
            <span title="columns">{columns.length} cols</span>
            <span className="text-zinc-700">·</span>
            <span title="child tables">↓ {children.length}</span>
          </div>

          {/* Open detail link */}
          <Link
            to={`/table?name=${encodeURIComponent(name)}`}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-white/[0.07]
                       bg-white/[0.02] text-xs text-zinc-500 hover:text-zinc-300 hover:border-white/[0.12]
                       transition-all duration-150"
          >
            <ExternalLink size={12} /> Detail
          </Link>

          {/* Zoom controls */}
          <div className="flex items-center gap-0.5 rounded-lg border border-white/[0.07] bg-white/[0.02] p-0.5">
            <button onClick={zoomOut}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all">
              <ZoomOut size={12} />
            </button>
            <button onClick={zoomReset}
              className="px-2 py-1 text-[11px] font-mono text-zinc-500 hover:text-zinc-300 transition-colors min-w-[44px] text-center">
              {Math.round(zoom * 100)}%
            </button>
            <button onClick={zoomIn}
              className="p-1.5 rounded-md text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.05] transition-all">
              <ZoomIn size={12} />
            </button>
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-[11px] text-zinc-600">
        <LegendDot color="#5e6ad2" opacity={0.5} label="Selected" />
        <LegendDot color="#94a3b8" opacity={0.35} label="Parent (referenced by FK)" />
        <LegendDot color="#52525b" opacity={0.4}  label="Child (holds FK)" />
        <span className="text-zinc-700">· Click any node to explore its ERD</span>
      </div>

      {/* Overflow notices */}
      {(hiddenP > 0 || hiddenC > 0) && (
        <p className="text-[11px] text-zinc-600">
          {hiddenP > 0 && <span>Showing {MAX_SHOW} of {parents.length} parents. </span>}
          {hiddenC > 0 && <span>Showing {MAX_SHOW} of {children.length} children. </span>}
          See full list in{' '}
          <Link to={`/table?name=${encodeURIComponent(name)}`} className="text-accent/70 hover:text-accent transition-colors">
            Table Detail
          </Link>.
        </p>
      )}

      {/* Canvas */}
      <div
        className="rounded-2xl border border-white/[0.07] overflow-auto bg-[#0c0c14]"
        style={{ maxHeight: '72vh' }}
      >
        {/* Sizing wrapper so scroll container knows the actual rendered size */}
        <div style={{ width: canvasW * zoom, height: canvasH * zoom, minWidth: '100%' }}>
          <svg
            width={canvasW}
            height={canvasH}
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', display: 'block' }}
          >
            <defs>
              {/* Arrowhead marker */}
              <marker id="arrowhead" markerWidth="9" markerHeight="9"
                      refX="7" refY="3.5" orient="auto">
                <polygon points="0,0 9,3.5 0,7" fill="rgba(255,255,255,0.18)" />
              </marker>
              {/* Subtle grid pattern */}
              <pattern id="grid" width="24" height="24" patternUnits="userSpaceOnUse">
                <path d="M 24 0 L 0 0 0 24" fill="none"
                      stroke="rgba(255,255,255,0.025)" strokeWidth="0.5" />
              </pattern>
            </defs>

            {/* Background grid */}
            <rect width={canvasW} height={canvasH} fill="url(#grid)" />

            {/* Edges */}
            {edges.map(e => {
              const midY = (e.y1 + e.y2) / 2
              return (
                <path key={e.id}
                  d={`M${e.x1},${e.y1} C${e.x1},${midY} ${e.x2},${midY} ${e.x2},${e.y2}`}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1.5"
                  markerEnd="url(#arrowhead)"
                />
              )
            })}

            {/* Parent nodes */}
            {parentNodes.map(n => (
              <ErdNode key={n.id} node={n} variant="parent"
                onClick={() => handleNode(n.id)} />
            ))}

            {/* Center node */}
            <ErdNode node={center} variant="center"
              onClick={() => navigate(`/table?name=${encodeURIComponent(center.id)}`)} />

            {/* Child nodes */}
            {childNodes.map(n => (
              <ErdNode key={n.id} node={n} variant="child"
                onClick={() => handleNode(n.id)} />
            ))}
          </svg>
        </div>
      </div>

      {parents.length === 0 && children.length === 0 && (
        <p className="text-xs text-zinc-600 text-center py-2">
          This table has no foreign key relationships.
        </p>
      )}
    </div>
  )
}

// ─── SVG Node ──────────────────────────────────────────────────────────────────
const NODE_STYLES = {
  center: {
    headerFill: 'rgba(94,106,210,0.20)',
    border:     'rgba(94,106,210,0.55)',
    borderHov:  'rgba(94,106,210,0.85)',
    text:       '#c7d2fe',
    pk:         '#fef08a', // yellow-200
  },
  parent: {
    headerFill: 'rgba(148,163,184,0.08)',
    border:     'rgba(148,163,184,.22)',
    borderHov:  'rgba(148,163,184,0.5)',
    text:       '#94a3b8',
    pk:         '#fde047', // yellow-400
  },
  child: {
    headerFill: 'rgba(82,82,91,0.12)',
    border:     'rgba(82,82,91,0.3)',
    borderHov:  'rgba(82,82,91,0.6)',
    text:       '#a1a1aa', // zinc-400
    pk:         '#eab308', // yellow-500
  },
}

function ErdNode({ node, variant, onClick }) {
  const [hov, setHov] = useState(false)
  const s = NODE_STYLES[variant]
  const nodeHeight = getNodeHeight(node)

  const label = node.label.length > 24
    ? node.label.slice(0, 22) + '…'
    : node.label

  return (
    <g
      transform={`translate(${node.x},${node.y})`}
      onClick={onClick}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{ cursor: 'pointer' }}
    >
      {/* Main box */}
      <rect x={0} y={0} width={NW} height={nodeHeight} rx={10}
        fill="rgba(20,20,30,0.8)"
        stroke={hov ? s.borderHov : s.border}
        strokeWidth={hov ? 1.5 : 1}
        style={{ transition: 'stroke 0.15s' }}
      />
      {/* Header */}
      <rect x={0} y={0} width={NW} height={NH_HEAD} rx={10} ry={10}
        fill={s.headerFill}
        stroke={hov ? s.borderHov : s.border}
        strokeWidth={0}
      />
      <text
        x={NW / 2} y={NH_HEAD / 2}
        textAnchor="middle" dominantBaseline="middle"
        fontFamily="ui-monospace, monospace"
        fontSize={12}
        fontWeight={variant === 'center' ? 700 : 500}
        fill={s.text}
        style={{ userSelect: 'none' }}
      >
        {label}
      </text>
      <line x1={0} y1={NH_HEAD} x2={NW} y2={NH_HEAD} stroke={s.border} strokeWidth={1} />

      {/* Columns */}
      <foreignObject x={0} y={NH_HEAD} width={NW} height={nodeHeight - NH_HEAD}>
        <div className="text-[10px] font-mono p-2 space-y-1 text-zinc-500 overflow-hidden">
          {(node.columns || []).map(col => (
            <div key={col.column_name} className="flex items-center gap-2" title={col.data_type}>
              <span className="truncate" style={{ color: col.is_pk ? s.pk : 'inherit' }}>
                {col.is_pk && '🔑 '}
                {col.column_name}
              </span>
              <span className="flex-1 border-t border-dashed border-white/5" />
              <span className="text-zinc-600 shrink-0">{col.data_type.split('(')[0]}</span>
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  )
}

function LegendDot({ color, opacity, label }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="w-2.5 h-2.5 rounded-full" style={{ background: color, opacity }} />
      <span>{label}</span>
    </div>
  )
}
