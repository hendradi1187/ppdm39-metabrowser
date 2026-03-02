export function Spinner({ size = 16 }) {
  return (
    <svg
      width={size} height={size}
      viewBox="0 0 24 24"
      fill="none"
      className="animate-spin text-zinc-500"
    >
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.2" />
      <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}

export function LoadingState({ message = 'Loading...' }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3 text-zinc-500">
      <Spinner size={24} />
      <span className="text-sm">{message}</span>
    </div>
  )
}

export function ErrorState({ message }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-2 text-red-400">
      <span className="text-sm font-medium">Error loading data</span>
      <span className="text-xs text-zinc-500 max-w-sm text-center">{message}</span>
    </div>
  )
}
