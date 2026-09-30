// src/components/layout/Layout.jsx
import { Sidebar } from './Sidebar'
import { Outlet } from 'react-router-dom'
import { isLiveSupabase } from '../../lib/supabase'
import { Database, Sparkles, X } from 'lucide-react'
import { useState } from 'react'

export function Layout() {
  const [showBanner, setShowBanner] = useState(!isLiveSupabase)

  return (
    <div className="flex min-h-screen" style={{ background: 'var(--bg)', color: 'var(--fg)' }}>
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-h-screen flex flex-col">
        {showBanner && (
          <div
            className="px-4 py-2 text-xs flex items-center justify-between border-b"
            style={{ background: 'var(--brand-light)', color: 'var(--brand)', borderColor: 'var(--border)' }}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="h-3.5 w-3.5" />
              <span>
                <strong>Demo Mode Active:</strong> Running with local sample data. To connect to your live Supabase database, add <code className="px-1 py-0.5 rounded bg-black/10">VITE_SUPABASE_URL</code> in <code className="px-1 py-0.5 rounded bg-black/10">.env</code>.
              </span>
            </div>
            <button
              onClick={() => setShowBanner(false)}
              className="p-1 rounded hover:bg-black/5 opacity-70 hover:opacity-100"
              title="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
        <div className="p-6 lg:p-8 flex-1">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
