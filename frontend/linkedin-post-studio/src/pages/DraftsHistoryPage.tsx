import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import {
  FolderOpen,
  Search,
  Trash2,
  Copy,
  Check,
  Edit,
  PlusCircle,
  Calendar,
  AlertCircle,
  Send,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/hooks/useToast'
import { MOCK_POSTS } from '@/lib/constants'
import { getSavedDrafts, fetchDraftsFromCloud, deleteDraft as deleteDraftFromStore } from '@/lib/draftsStore'
import type { Post, PostStatus } from '@/types'
import type { DemoStateMode } from '@/components/layout/AppLayout'

interface DraftsHistoryPageProps {
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

export function DraftsHistoryPage({ stateMode = 'normal', onStateModeChange }: DraftsHistoryPageProps) {
  const { success } = useToast()
  const [posts, setPosts] = useState<Post[]>(() => getSavedDrafts())
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | PostStatus>('all')
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [deletingPostId, setDeletingPostId] = useState<string | null>(null)

  useEffect(() => {
    let mounted = true
    fetchDraftsFromCloud().then((cloudPosts) => {
      if (mounted) setPosts(cloudPosts)
    })
    return () => {
      mounted = false
    }
  }, [])

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content)
    setCopiedId(id)
    success('Copied to clipboard', 'Draft content copied successfully.')
    setTimeout(() => setCopiedId(null), 2000)
  }

  const handleDelete = () => {
    if (deletingPostId) {
      deleteDraftFromStore(deletingPostId)
      setPosts(getSavedDrafts())
      setDeletingPostId(null)
      success('Draft Removed', 'The selected draft was deleted.')
    }
  }

  const filteredPosts = posts.filter((post) => {
    const matchesStatus = statusFilter === 'all' || post.status === statusFilter
    const matchesSearch =
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.hashtags.some((tag) => tag.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (post.hook && post.hook.toLowerCase().includes(searchQuery.toLowerCase()))
    return matchesStatus && matchesSearch
  })

  // Loading State
  if (stateMode === 'loading') {
    return (
      <div className="space-y-6 animate-fade-in max-w-6xl mx-auto">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-60" />
          <Skeleton className="h-9 w-36" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-64 rounded-xl" />
          ))}
        </div>
      </div>
    )
  }

  // Error State
  if (stateMode === 'error') {
    return (
      <div className="py-12 animate-fade-in max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Failed to load saved drafts
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              Could not retrieve stored drafts from local repository cache.
            </p>
            {onStateModeChange && (
              <Button variant="primary" onClick={() => onStateModeChange('normal')}>
                Retry Loading
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Global Empty State
  if (stateMode === 'empty' || (posts.length === 0 && stateMode !== 'normal')) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Saved Drafts & Post History
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Access and manage your generated content pipeline.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon={<FolderOpen className="h-14 w-14 text-slate-300 dark:text-slate-600" />}
              title="No Drafts Saved Yet"
              description="Your saved drafts and scheduled posts will appear here. Create your first post using our AI Post Studio."
              action={{
                label: 'Load Sample Drafts',
                onClick: () => {
                  setPosts(MOCK_POSTS)
                  onStateModeChange?.('normal')
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  // Normal populated state
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Saved Drafts & Post History
            </h1>
            <Badge variant="linkedin" size="sm">
              {posts.length} Items
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Manage your content pipeline, review scheduled drops, and track publication history.
          </p>
        </div>

        <Link to="/post-studio">
          <Button size="sm" leftIcon={<PlusCircle className="h-4 w-4" />}>
            New Post
          </Button>
        </Link>
      </div>

      {/* Summary KPI Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Work-in-Progress Drafts
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {posts.filter((p) => p.status === 'draft').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 flex items-center justify-center">
              <FolderOpen className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Scheduled Drops
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {posts.filter((p) => p.status === 'scheduled').length || 1}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-blue-50 text-[#0a66c2] dark:bg-blue-950/40 dark:text-blue-400 flex items-center justify-center">
              <Calendar className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="hover:border-slate-300 transition-colors">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Published Posts
              </span>
              <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
                {posts.filter((p) => p.status === 'published').length}
              </p>
            </div>
            <div className="h-10 w-10 rounded-xl bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 flex items-center justify-center">
              <Send className="h-5 w-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Filter Tabs */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0">
              {[
                { id: 'all', label: 'All Items' },
                { id: 'draft', label: 'Drafts' },
                { id: 'scheduled', label: 'Scheduled' },
                { id: 'published', label: 'Published' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setStatusFilter(tab.id as typeof statusFilter)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap ${
                    statusFilter === tab.id
                      ? 'bg-[#0a66c2] text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Search Input */}
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by keywords, tags..."
                className="pl-9 h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Drafts Grid */}
      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <EmptyState
              icon="search"
              title="No Matching Posts Found"
              description="No saved drafts matched your search query or filter selection."
              action={{
                label: 'Clear Filters',
                onClick: () => {
                  setSearchQuery('')
                  setStatusFilter('all')
                },
              }}
            />
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPosts.map((post) => (
            <Card
              key={post.id}
              className="flex flex-col justify-between hover:border-[#0a66c2]/40 transition-all duration-200 shadow-sm"
            >
              <CardContent className="p-5 flex flex-col justify-between h-full">
                <div>
                  {/* Status & Date */}
                  <div className="flex items-center justify-between mb-3">
                    <Badge
                      variant={
                        post.status === 'published'
                          ? 'success'
                          : post.status === 'scheduled'
                          ? 'info'
                          : 'default'
                      }
                      size="sm"
                      className="capitalize"
                    >
                      {post.status}
                    </Badge>
                    <span className="text-[11px] text-slate-400">
                      {new Date(post.createdAt).toLocaleDateString(undefined, {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric',
                      })}
                    </span>
                  </div>

                  {/* Hook / Headline */}
                  <p className="text-xs font-bold text-slate-900 dark:text-white mb-2 line-clamp-2">
                    {post.hook || post.content.slice(0, 50)}
                  </p>

                  {/* Body preview */}
                  <p className="text-xs text-slate-600 dark:text-slate-300 font-sans leading-relaxed whitespace-pre-wrap line-clamp-5">
                    {post.content}
                  </p>

                  {/* Hashtags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {post.hashtags.map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] font-medium text-[#0a66c2] dark:text-blue-400"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Footer Controls */}
                <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] capitalize font-semibold text-slate-400">
                    {post.tone} • {post.content.split(/\s+/).length} words
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => handleCopy(post.content, post.id)}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Copy to Clipboard"
                    >
                      {copiedId === post.id ? (
                        <Check className="h-3.5 w-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="h-3.5 w-3.5" />
                      )}
                    </button>

                    <Link
                      to="/post-studio"
                      state={{ editPost: post }}
                      className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Edit in Post Studio"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </Link>

                    <button
                      onClick={() => setDeletingPostId(post.id)}
                      className="p-1.5 rounded-lg border border-red-200 dark:border-red-900/60 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                      title="Delete Draft"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={!!deletingPostId}
        onClose={() => setDeletingPostId(null)}
        title="Delete Post Draft?"
        description="Are you sure you want to remove this draft? This mock action cannot be undone."
      >
        <div className="space-y-4 pt-2">
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setDeletingPostId(null)}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleDelete}>
              Confirm Delete
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
