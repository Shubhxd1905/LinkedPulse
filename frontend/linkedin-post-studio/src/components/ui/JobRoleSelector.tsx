import React, { useState, useRef, useEffect, useMemo } from 'react'
import { cn } from '@/lib/utils'
import {
  Search,
  Check,
  ChevronDown,
  X,
  Plus,
  Briefcase,
  Sparkles,
} from 'lucide-react'
import {
  JOB_ROLE_CATEGORIES,
  POPULAR_JOB_ROLES,
  ALL_UNIQUE_JOB_ROLES,
} from '@/lib/profileOptimizer/keywordTaxonomy'

export interface JobRoleSelectorProps {
  value: string
  onChange: (role: string) => void
  label?: string
  error?: string
  hint?: string
  placeholder?: string
  className?: string
  id?: string
}

export const JobRoleSelector: React.FC<JobRoleSelectorProps> = ({
  value,
  onChange,
  label = 'Target Job Role / Specialty',
  error,
  hint,
  placeholder = 'Search or select a target job role...',
  className,
  id,
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)

  const selectorId = id || 'job-role-selector'

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Focus search input when opened
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        searchInputRef.current?.focus()
      }, 50)
    } else {
      setSearchQuery('')
    }
  }, [isOpen])

  // Filter categories and roles based on search
  const filteredCategories = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return JOB_ROLE_CATEGORIES

    return JOB_ROLE_CATEGORIES.map((cat) => {
      const categoryMatches =
        cat.name.toLowerCase().includes(q) ||
        cat.code.toLowerCase() === q ||
        cat.description.toLowerCase().includes(q)

      const matchingRoles = cat.roles.filter((role) =>
        role.toLowerCase().includes(q)
      )

      return {
        ...cat,
        roles: categoryMatches ? cat.roles : matchingRoles,
      }
    }).filter((cat) => cat.roles.length > 0)
  }, [searchQuery])

  // Check if query matches an existing role exactly (case-insensitive) to prevent duplicates
  const existingExactMatch = useMemo(() => {
    const q = searchQuery.trim().toLowerCase()
    if (!q) return null
    return (
      ALL_UNIQUE_JOB_ROLES.find((r) => r.toLowerCase() === q) || null
    )
  }, [searchQuery])

  // Is query eligible as a new custom role?
  const canAddCustomRole = useMemo(() => {
    const q = searchQuery.trim()
    if (!q || q.length < 2) return false
    return !existingExactMatch
  }, [searchQuery, existingExactMatch])

  const handleSelectRole = (role: string) => {
    onChange(role)
    setIsOpen(false)
    setSearchQuery('')
  }

  const handleAddCustomRole = () => {
    const trimmed = searchQuery.trim()
    if (!trimmed) return

    // If case-insensitive match already exists, use standard title
    if (existingExactMatch) {
      handleSelectRole(existingExactMatch)
    } else {
      handleSelectRole(trimmed)
    }
  }

  const handleClearSelection = (e: React.MouseEvent) => {
    e.stopPropagation()
    onChange('')
  }

  const totalFilteredCount = useMemo(() => {
    return filteredCategories.reduce((acc, cat) => acc + cat.roles.length, 0)
  }, [filteredCategories])

  return (
    <div className={cn('w-full relative', className)} ref={containerRef}>
      {label && (
        <label
          htmlFor={selectorId}
          className="block text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5"
        >
          {label}
        </label>
      )}

      {/* Main trigger button */}
      <div
        id={selectorId}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        tabIndex={0}
        onClick={() => setIsOpen((prev) => !prev)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
            e.preventDefault()
            setIsOpen(true)
          } else if (e.key === 'Escape') {
            setIsOpen(false)
          }
        }}
        className={cn(
          'w-full min-h-[42px] px-3 py-2 rounded-lg border bg-white dark:bg-slate-800 text-sm cursor-pointer flex items-center justify-between transition-colors shadow-sm',
          'focus:outline-none focus:ring-2 focus:ring-linkedin/30 focus:border-linkedin',
          error
            ? 'border-red-500 focus:ring-red-500/30 focus:border-red-500'
            : isOpen
            ? 'border-linkedin ring-2 ring-linkedin/20'
            : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600'
        )}
      >
        <div className="flex items-center gap-2 flex-wrap flex-1 mr-2 overflow-hidden">
          <Briefcase className="w-4 h-4 text-linkedin shrink-0" />
          {value ? (
            <span className="font-semibold text-slate-900 dark:text-slate-100 truncate">
              {value}
            </span>
          ) : (
            <span className="text-slate-400 dark:text-slate-500 select-none">
              {placeholder}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <button
              type="button"
              onClick={handleClearSelection}
              title="Clear selected role"
              className="p-1 rounded-full text-slate-400 hover:text-red-500 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-slate-400 transition-transform duration-200',
              isOpen && 'rotate-180 text-linkedin'
            )}
          />
        </div>
      </div>

      {error && (
        <p className="mt-1.5 text-xs text-red-500 font-medium" role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">
          {hint}
        </p>
      )}

      {/* Dropdown Popover */}
      {isOpen && (
        <div
          role="listbox"
          className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl shadow-2xl overflow-hidden animate-in fade-in-50 zoom-in-95 duration-100"
          style={{ maxHeight: '480px' }}
        >
          {/* Search Box */}
          <div className="p-2.5 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/50">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    if (canAddCustomRole) {
                      handleAddCustomRole()
                    } else if (existingExactMatch) {
                      handleSelectRole(existingExactMatch)
                    } else {
                      const firstCat = filteredCategories[0]
                      const firstRole = firstCat?.roles?.[0]
                      if (firstRole) {
                        handleSelectRole(firstRole)
                      }
                    }
                  } else if (e.key === 'Escape') {
                    setIsOpen(false)
                  }
                }}
                placeholder="Type to filter roles or enter custom..."
                className="w-full pl-9 pr-8 py-2 text-xs md:text-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-linkedin/30 focus:border-linkedin"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Popular quick-select chips (shown when search is empty or matches) */}
            {!searchQuery && (
              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-1.5">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>Popular Roles (1-Click Select)</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {POPULAR_JOB_ROLES.map((popRole) => {
                    const isSelected = value === popRole
                    return (
                      <button
                        key={popRole}
                        type="button"
                        onClick={() => handleSelectRole(popRole)}
                        className={cn(
                          'text-[11px] px-2.5 py-1 rounded-full font-medium transition-all text-left flex items-center gap-1',
                          isSelected
                            ? 'bg-linkedin text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-linkedin hover:text-linkedin'
                        )}
                      >
                        {isSelected && <Check className="w-2.5 h-2.5" />}
                        {popRole}
                      </button>
                    )
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Add custom role banner */}
          {canAddCustomRole && (
            <div className="p-2 border-b border-blue-100 dark:border-blue-900/40 bg-blue-50/80 dark:bg-blue-950/30">
              <button
                type="button"
                onClick={handleAddCustomRole}
                className="w-full text-left px-3 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold flex items-center justify-between shadow-sm transition-colors"
              >
                <div className="flex items-center gap-2 truncate mr-2">
                  <Plus className="w-4 h-4 shrink-0" />
                  <span className="truncate">
                    Use &ldquo;<span className="underline">{searchQuery.trim()}</span>&rdquo; as Custom Target Role
                  </span>
                </div>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded text-white font-mono shrink-0">
                  Press Enter ↵
                </span>
              </button>
            </div>
          )}

          {/* Scrollable Role Categories List */}
          <div
            className="overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800"
            style={{ maxHeight: '320px' }}
          >
            {filteredCategories.length === 0 && !canAddCustomRole ? (
              <div className="py-8 px-4 text-center">
                <Briefcase className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No matching roles found for &ldquo;{searchQuery}&rdquo;.
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Type at least 2 characters to use your search as a custom role.
                </p>
              </div>
            ) : (
              filteredCategories.map((category) => (
                <div key={category.id} className="py-2">
                  {/* Category Header */}
                  <div className="px-3 py-1 flex items-center justify-between sticky top-0 bg-slate-100/90 dark:bg-slate-800/90 backdrop-blur-sm z-10">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 font-mono">
                        {category.code}
                      </span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
                        {category.name}
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 font-medium shrink-0 ml-2">
                      {category.roles.length} roles
                    </span>
                  </div>

                  {/* Category Roles */}
                  <div className="mt-1 px-1">
                    {category.roles.map((role) => {
                      const isSelected = value === role
                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleSelectRole(role)}
                          className={cn(
                            'w-full text-left px-3 py-1.5 rounded-md text-xs font-medium flex items-center justify-between transition-colors group',
                            isSelected
                              ? 'bg-linkedin/10 text-linkedin dark:bg-linkedin/20 font-bold'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          )}
                        >
                          <span className="truncate mr-2">{role}</span>
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 text-linkedin shrink-0" />
                          ) : (
                            <span className="text-[10px] text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity">
                              Select
                            </span>
                          )}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer info bar */}
          <div className="p-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/80 flex items-center justify-between text-[11px] text-slate-400">
            <span>
              {totalFilteredCount} roles across {filteredCategories.length} categories
            </span>
            <span>Custom roles supported</span>
          </div>
        </div>
      )}
    </div>
  )
}
export default JobRoleSelector
