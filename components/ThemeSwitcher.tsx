"use client"

import { useEffect, useState } from 'react'

const THEMES = [
  { id: 'blue', label: 'Blue', color: '#1e40af' },
  { id: 'green', label: 'Green', color: '#059669' },
  { id: 'indigo', label: 'Indigo', color: '#4f46e5' },
  { id: 'dark', label: 'Dark', color: '#1f2937' },
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
    <div className="flex items-center gap-1.5">
      {THEMES.map(t => (
        <button
          key={t.id}
          aria-pressed={theme === t.id}
          aria-label={`Switch to ${t.label} theme`}
          onClick={() => setTheme(t.id)}
          className={`w-6 h-6 rounded-full transition-all duration-200 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            theme === t.id 
              ? 'ring-2 ring-offset-2 ring-gray-400 scale-110' 
              : 'opacity-70 hover:opacity-100'
          }`}
          style={{ backgroundColor: t.color }}
          title={t.label}
        />
      ))}
    </div>
  )
}
