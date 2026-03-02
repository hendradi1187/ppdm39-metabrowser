import { createContext, useContext, useState, useCallback } from 'react'

const KEY = 'ppdm_bookmarks'

function load() {
  try { return JSON.parse(localStorage.getItem(KEY) ?? '[]') }
  catch { return [] }
}

const Ctx = createContext(null)

export function BookmarksProvider({ children }) {
  const [bookmarks, setBookmarks] = useState(load) // string[]

  const toggle = useCallback((name) => {
    setBookmarks(prev => {
      const next = prev.includes(name)
        ? prev.filter(t => t !== name)
        : [name, ...prev]          // newest first
      localStorage.setItem(KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const isBookmarked = useCallback(
    (name) => bookmarks.includes(name),
    [bookmarks]
  )

  return (
    <Ctx.Provider value={{ bookmarks, toggle, isBookmarked }}>
      {children}
    </Ctx.Provider>
  )
}

export function useBookmarks() {
  return useContext(Ctx)
}
