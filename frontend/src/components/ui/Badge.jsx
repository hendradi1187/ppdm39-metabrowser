import clsx from 'clsx'

const variants = {
  default:       'bg-zinc-800 text-zinc-300 border-zinc-700',
  primary:       'bg-accent/10 text-accent border-accent/20',
  pk:            'bg-amber-500/10 text-amber-400 border-amber-500/20',
  fk:            'bg-blue-500/10 text-blue-400 border-blue-500/20',
  uk:            'bg-purple-500/10 text-purple-400 border-purple-500/20',
  check:         'bg-teal-500/10 text-teal-400 border-teal-500/20',
  success:       'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  error:         'bg-red-500/10 text-red-400 border-red-500/20',
  warning:       'bg-orange-500/10 text-orange-400 border-orange-500/20',
}

const constraintVariant = {
  PRIMARY_KEY: 'pk',
  FOREIGN_KEY: 'fk',
  UNIQUE_KEY:  'uk',
  CHECK:       'check',
}

export function Badge({ children, variant = 'default', className }) {
  return (
    <span className={clsx(
      'inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border',
      variants[variant] ?? variants.default,
      className
    )}>
      {children}
    </span>
  )
}

export function ConstraintBadge({ type }) {
  const v = constraintVariant[type] ?? 'default'
  const label = {
    PRIMARY_KEY: 'PK',
    FOREIGN_KEY: 'FK',
    UNIQUE_KEY:  'UK',
    CHECK:       'CK',
  }[type] ?? type
  return <Badge variant={v}>{label}</Badge>
}
