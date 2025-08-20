"use client"

import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'blue', label: 'Blue' },
  { id: 'green', label: 'Green' },
  { id: 'indigo', label: 'Indigo' },
  { id: 'dark', label: 'Dark' },
]

export default function ThemeSwitcher() {
  const [theme, setTheme] = useState<string>(() => {
    try {
      return typeof window !== 'undefined' ? (localStorage.getItem('theme') || 'blue') : 'blue'
    } catch (e) {
      return 'blue'
    }
  })

  useEffect(() => {
    try {
      const root = document.documentElement
  // Remove previous theme classes
  root.classList.remove('theme-blue', 'theme-green', 'theme-indigo', 'theme-dark')
      // Add selected theme class
      root.classList.add(`theme-${theme}`)
      localStorage.setItem('theme', theme)
    } catch (e) {
      // noop
    }
  }, [theme])

  return (
    <div className="flex items-center gap-2">
      {THEMES.map(t => (
        <button
          key={t.id}
          aria-pressed={theme === t.id}
          onClick={() => setTheme(t.id)}
          className={`px-3 py-1 rounded-md text-sm ${theme === t.id ? 'bg-gray-900 text-white' : 'bg-gray-100 text-gray-800'}`}
        >
          {t.label}
        </button>
      ))}
    </div>
  )
}
