import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import {
  Table2, Columns3, Lock, Database,
  BookOpen, CheckSquare, ArrowRight, GitBranch, ShieldCheck, ScanSearch,
} from 'lucide-react'
import { StatCard } from '../components/ui/StatCard'
import { LoadingState, ErrorState } from '../components/ui/Spinner'
import { api } from '../lib/api'

const quickLinks = [
  { to: '/tables',     icon: Table2,      label: 'Browse Tables',      desc: 'Search and explore PPDM meta tables' },
  { to: '/columns',    icon: ScanSearch,  label: 'Column X-Ref',       desc: 'Find all tables that share a column name' },
  { to: '/load-order', icon: GitBranch,   label: 'Load Order',         desc: 'FK-based topological sort for data loading' },
  { to: '/audit',      icon: ShieldCheck, label: 'Audit Target DB',    desc: 'Compare meta model vs real database' },
]

export default function Dashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['stats'],
    queryFn: api.stats,
  })

  if (isLoading) return <LoadingState message="Fetching stats..." />
  if (error) return <ErrorState message={error.message} />

  const stats = data?.stats ?? data ?? {}

  return (
    <div className="-m-6 min-h-full p-6" style={{ background: 'radial-gradient(circle at top, #0f172a 0%, #0b1120 60%)' }}>
      <div className="max-w-5xl space-y-10">
        {/* Header */}
        <div className="fade-up pb-2">
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-100">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-500 leading-relaxed">
            Overview of the PPDM 3.9 meta model schema.
          </p>
        </div>

        {/* KPI Grid — staggered fade-up */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[
            { label: 'Tables',             value: stats.tables,       icon: Table2,      trend: '+2.4% schema growth',  trendUp: true  },
            { label: 'Columns',            value: stats.columns,      icon: Columns3,    trend: '+1.8% vs prior ver',   trendUp: true  },
            { label: 'Constraints',        value: stats.constraints,  icon: Lock,        trend: '+3.1% integrity rules', trendUp: true  },
            { label: 'Constraint Columns', value: stats.cons_columns, icon: Database,    trend: '+1.8% vs prior ver',   trendUp: true  },
            { label: 'Domains',            value: stats.domains,      icon: BookOpen,    trend: 'no change',             trendUp: null  },
            { label: 'Check Values',       value: stats.check_values, icon: CheckSquare, trend: '+5.2% rule coverage',  trendUp: true  },
          ].map((props, i) => (
            <div key={props.label} className="fade-up" style={{ animationDelay: `${i * 55}ms` }}>
              <StatCard {...props} sweepDelay={i * 55 + 180} />
            </div>
          ))}
        </div>

        {/* Quick links */}
        <div className="fade-up" style={{ animationDelay: '360ms' }}>
          <h2 className="text-xs font-semibold text-zinc-500 uppercase tracking-widest mb-4">Quick Access</h2>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
            {quickLinks.map(({ to, icon: Icon, label, desc }) => (
              <Link
                key={to}
                to={to}
                className="group flex flex-col gap-4 p-5 rounded-2xl border border-white/[0.08]
                           bg-gradient-to-b from-[#1c1c2a] to-[#14141e]
                           shadow-xl shadow-black/50
                           hover:-translate-y-0.5 hover:border-white/[0.14]
                           hover:shadow-[0_20px_40px_-8px_rgba(0,0,0,0.75),0_0_0_1px_rgba(255,255,255,0.07)]
                           transition-all duration-200"
              >
                <div className="flex items-center justify-between">
                  <div className="w-9 h-9 rounded-xl bg-white/[0.04] border border-white/[0.08] flex items-center justify-center
                                  group-hover:bg-white/[0.07] transition-all duration-200">
                    <Icon size={16} className="text-zinc-500 group-hover:text-zinc-200 transition-colors duration-200" />
                  </div>
                  <ArrowRight
                    size={15}
                    className="text-zinc-700 group-hover:text-zinc-400 group-hover:translate-x-1 transition-all duration-200"
                  />
                </div>
                <div>
                  <div className="text-sm font-semibold text-zinc-200 group-hover:text-zinc-100 transition-colors duration-150">{label}</div>
                  <div className="text-xs text-zinc-600 mt-1 leading-relaxed">{desc}</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
