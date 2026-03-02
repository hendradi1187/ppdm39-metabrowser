import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import clsx from 'clsx'
import Sidebar from './Sidebar'
import TopBar from './TopBar'
import { api } from '../lib/api'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const { data: stats } = useQuery({
    queryKey: ['stats'],
    queryFn: api.stats,
    retry: false,
  })

  const metaDb   = stats?.meta_db   ?? null
  const targetDb = stats?.target_db ?? null

  return (
    <div className="flex h-screen overflow-hidden bg-bg">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/60 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div className={clsx(
        'fixed md:relative z-30 md:z-auto h-full transition-transform duration-200',
        sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
      )}>
        <Sidebar metaDb={metaDb} targetDb={targetDb} />
      </div>

      {/* Main column */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <TopBar onMenuToggle={() => setSidebarOpen(s => !s)} />
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
