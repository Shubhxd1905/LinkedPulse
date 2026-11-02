// Types for LinkedIn Optimizer & Post Studio

// ─── Auth ────────────────────────────────────────
export interface User {
  id: string
  email: string
  displayName: string | null
  avatarUrl: string | null
  linkedinConnected: boolean
  createdAt: string
}

// ─── Profile Optimizer ───────────────────────────
export interface ProfileInput {
  inputType: 'url' | 'text' | 'pdf'
  url?: string
  text?: string
  pdfFile?: File
}

export interface ProfileSection {
  name: string
  original: string
  optimized: string
  score: number
  maxScore: number
  suggestions: string[]
  isEdited: boolean
}

export interface ProfileOptimization {
  id: string
  userId: string
  inputType: 'url' | 'text' | 'pdf'
  originalData: {
    headline: string
    about: string
    experience: ExperienceEntry[]
    skills: string[]
  }
  optimizedData: {
    headline: ProfileSection
    about: ProfileSection
    experience: ProfileSection
    skills: ProfileSection
    keywords: string[]
  }
  scoreBefore: number
  scoreAfter: number
  createdAt: string
}

export interface ExperienceEntry {
  title: string
  company: string
  duration: string
  description: string
}

// ─── Post Studio ─────────────────────────────────
export type PostTone = 'professional' | 'educational' | 'storytelling' | 'personal-branding'
export type PostLength = 'short' | 'medium' | 'long'
export type PostStatus = 'draft' | 'published' | 'scheduled'

export interface GeneratedPost {
  content: string
  tone: PostTone
  length: PostLength
  hook: string
  hashtags: string[]
}

export interface Post {
  id: string
  userId: string
  content: string
  tone: PostTone | null
  length: PostLength | null
  imageUrl: string | null
  hashtags: string[]
  hook: string | null
  alternativeHooks?: string[]
  visualSummary?: string | null
  isAiPowered?: boolean | null
  engineUsed?: string | null
  fallbackReason?: string | null
  status: PostStatus
  publishedAt: string | null
  linkedinPostId: string | null
  createdAt: string
  updatedAt: string
}

export interface PostGenerationRequest {
  imageBase64?: string
  imageMimeType?: string
  tone: PostTone
  length: PostLength
  context?: string
}

// ─── LinkedIn OAuth ──────────────────────────────
export interface LinkedInTokens {
  accessToken: string
  refreshToken: string | null
  expiresAt: string
  scopes: string[]
}

export interface LinkedInProfile {
  name: string
  headline: string
  profilePictureUrl: string | null
  vanityName: string | null
}

// ─── UI State ────────────────────────────────────
export type Theme = 'light' | 'dark' | 'system'

export interface ToastMessage {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  description?: string
  duration?: number
}

// ─── Navigation ──────────────────────────────────
export interface NavItem {
  label: string
  path: string
  icon: string
  badge?: string | number
}

// ─── Mock Data ───────────────────────────────────
export interface DashboardStats {
  totalOptimizations: number
  postsCreated: number
  postsDrafted: number
  averageScore: number
}
