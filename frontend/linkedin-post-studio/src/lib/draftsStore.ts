import { MOCK_POSTS } from './constants'
import type { Post } from '@/types'
import { apiGetUserDrafts, apiSaveUserDraft, apiDeleteUserDraft } from './api'

const DRAFTS_STORAGE_KEY = 'linkoptimize_saved_drafts'

/**
 * Retrieve all saved drafts from localStorage.
 * Initializes with MOCK_POSTS if storage is currently unseeded.
 */
export function getSavedDrafts(): Post[] {
  if (typeof window === 'undefined') return MOCK_POSTS
  try {
    const raw = localStorage.getItem(DRAFTS_STORAGE_KEY)
    if (!raw) {
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(MOCK_POSTS))
      return MOCK_POSTS
    }
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : MOCK_POSTS
  } catch (e) {
    console.error('Failed to load saved drafts from localStorage:', e)
    return MOCK_POSTS
  }
}

/**
 * Fetch drafts from the cloud database for authenticated users.
 * Updates local cache on success; falls back to localStorage if offline or unauthenticated.
 */
export async function fetchDraftsFromCloud(): Promise<Post[]> {
  try {
    const res = await apiGetUserDrafts()
    if (res && Array.isArray(res.drafts) && res.drafts.length > 0) {
      const formatted: Post[] = res.drafts.map((d: any) => ({
        id: d.id,
        userId: d.userId || 'user-1',
        content: d.content || '',
        tone: d.tone || 'storytelling',
        length: d.length || 'medium',
        imageUrl: d.imageUrl || null,
        hashtags: Array.isArray(d.hashtags) ? d.hashtags : [],
        hook: d.hook || null,
        alternativeHooks: Array.isArray(d.alternativeHooks) ? d.alternativeHooks : [],
        visualSummary: d.visualSummary || null,
        isAiPowered: d.aiMetadata?.isAiPowered ?? null,
        engineUsed: d.aiMetadata?.engineUsed ?? null,
        fallbackReason: d.aiMetadata?.fallbackReason ?? null,
        status: (d.status?.toLowerCase() === 'published' ? 'published' : 'draft') as any,
        publishedAt: d.publishedAt || null,
        linkedinPostId: d.linkedinPostUrn || null,
        createdAt: d.createdAt,
        updatedAt: d.updatedAt,
      }))
      persistDrafts(formatted)
      return formatted
    }
  } catch {
    // Offline or unauthenticated fallback
  }
  return getSavedDrafts()
}

/**
 * Save a new draft or update an existing draft.
 * Updates localStorage cache immediately and syncs with cloud database in background.
 */
export function saveDraft(post: Partial<Post>): Post {
  const currentDrafts = getSavedDrafts()
  const now = new Date().toISOString()

  let resultPost: Post

  if (post.id) {
    // Update existing
    const existing = currentDrafts.find((p) => p.id === post.id)
    if (existing) {
      const updated: Post = {
        id: existing.id,
        userId: post.userId ?? existing.userId,
        content: post.content ?? existing.content,
        tone: post.tone !== undefined ? post.tone : existing.tone,
        length: post.length !== undefined ? post.length : existing.length,
        imageUrl: post.imageUrl !== undefined ? post.imageUrl : existing.imageUrl,
        hashtags: post.hashtags ?? existing.hashtags,
        hook: post.hook !== undefined ? post.hook : existing.hook,
        alternativeHooks: post.alternativeHooks !== undefined ? post.alternativeHooks : existing.alternativeHooks,
        visualSummary: post.visualSummary !== undefined ? post.visualSummary : existing.visualSummary,
        isAiPowered: post.isAiPowered !== undefined ? post.isAiPowered : existing.isAiPowered,
        engineUsed: post.engineUsed !== undefined ? post.engineUsed : existing.engineUsed,
        fallbackReason: post.fallbackReason !== undefined ? post.fallbackReason : existing.fallbackReason,
        status: post.status ?? existing.status,
        publishedAt: post.publishedAt !== undefined ? post.publishedAt : existing.publishedAt,
        linkedinPostId: post.linkedinPostId !== undefined ? post.linkedinPostId : existing.linkedinPostId,
        createdAt: existing.createdAt,
        updatedAt: now,
      }
      const index = currentDrafts.findIndex((p) => p.id === post.id)
      if (index !== -1) {
        currentDrafts[index] = updated
      }
      persistDrafts(currentDrafts)
      resultPost = updated
    } else {
      resultPost = createNewPost(post, now)
      persistDrafts([resultPost, ...currentDrafts])
    }
  } else {
    resultPost = createNewPost(post, now)
    persistDrafts([resultPost, ...currentDrafts])
  }

  // Cloud sync in background
  syncDraftToCloud(resultPost)

  return resultPost
}

function createNewPost(post: Partial<Post>, now: string): Post {
  return {
    id: post.id || `post-${Date.now()}`,
    userId: post.userId || 'user-1',
    content: post.content || '',
    tone: post.tone || 'storytelling',
    length: post.length || 'medium',
    imageUrl: post.imageUrl || null,
    hashtags: post.hashtags || [],
    hook: post.hook || post.content?.split('\n')[0] || null,
    alternativeHooks: post.alternativeHooks || [],
    visualSummary: post.visualSummary || null,
    isAiPowered: post.isAiPowered !== undefined ? post.isAiPowered : null,
    engineUsed: post.engineUsed || null,
    fallbackReason: post.fallbackReason || null,
    status: post.status || 'draft',
    publishedAt: post.publishedAt || null,
    linkedinPostId: post.linkedinPostId || null,
    createdAt: now,
    updatedAt: now,
  }
}

function syncDraftToCloud(p: Post): void {
  try {
    apiSaveUserDraft({
      id: p.id,
      content: p.content,
      hook: p.hook,
      alternativeHooks: p.alternativeHooks,
      hashtags: p.hashtags,
      visualSummary: p.visualSummary,
      tone: p.tone,
      length: p.length,
      imageUrl: p.imageUrl,
      status: p.status,
      publishedAt: p.publishedAt,
      linkedinPostUrn: p.linkedinPostId,
      aiMetadata: {
        isAiPowered: p.isAiPowered,
        engineUsed: p.engineUsed,
        fallbackReason: p.fallbackReason,
      },
      createdAt: p.createdAt,
    }).catch(() => {
      // Cloud sync failure is caught silently; draft remains saved locally
    })
  } catch {
    // Ignore sync errors in non-browser/test environments
  }
}

/**
 * Delete a draft by ID.
 * Updates local cache immediately and syncs with cloud database in background.
 */
export function deleteDraft(id: string): boolean {
  const current = getSavedDrafts()
  const filtered = current.filter((p) => p.id !== id)
  if (filtered.length !== current.length) {
    persistDrafts(filtered)
    // Cloud sync in background
    try {
      apiDeleteUserDraft(id).catch(() => {})
    } catch {
      // Ignore in non-browser/test environments
    }
    return true
  }
  return false
}

function persistDrafts(drafts: Post[]): void {
  try {
    localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(drafts))
  } catch (e) {
    console.warn('LocalStorage quota reached. Pruning large Base64 images from local cache to protect draft text and metadata:', e)
    try {
      const lightweight = drafts.map((d) => ({
        ...d,
        imageUrl: d.imageUrl && d.imageUrl.length > 1024 ? null : d.imageUrl,
      }))
      localStorage.setItem(DRAFTS_STORAGE_KEY, JSON.stringify(lightweight))
    } catch (retryErr) {
      console.error('Failed to persist drafts to localStorage even after pruning:', retryErr)
    }
  }
}
