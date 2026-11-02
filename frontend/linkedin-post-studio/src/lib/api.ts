import { API_BASE_URL } from './constants'

interface ApiOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  body?: unknown
  headers?: Record<string, string>
}

export class ApiError extends Error {
  public code?: string
  constructor(public status: number, message: string, code?: string) {
    super(message)
    this.name = 'ApiError'
    this.code = code
  }
}

async function apiFetch<T>(endpoint: string, options: ApiOptions = {}): Promise<T> {
  const { method = 'GET', body, headers = {} } = options

  const config: RequestInit = {
    method,
    credentials: 'include', // Support HttpOnly secure session cookies
    headers: {
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest', // CSRF protection
      ...headers,
    },
  }

  if (body) {
    config.body = JSON.stringify(body)
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, config)

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    let parsedMessage = errorText
    let errorCode: string | undefined
    try {
      const parsed = JSON.parse(errorText)
      if (parsed.message) parsedMessage = parsed.message
      if (parsed.code) errorCode = parsed.code
    } catch {
      // not JSON
    }
    throw new ApiError(response.status, parsedMessage, errorCode)
  }

  return response.json()
}

// Profile optimization API
export async function optimizeProfile(data: {
  inputType: 'text' | 'pdf'
  text?: string
  pdfBase64?: string
}) {
  return apiFetch('/optimize-profile', { method: 'POST', body: data })
}

// Post generation API
export interface GeneratePostFromImageResponse {
  status: 'success' | 'fallback' | 'error'
  engineUsed: string
  model?: string
  isAiPowered: boolean
  fallbackReason?: string
  message?: string
  data: {
    primaryPost: string
    alternativeHooks: string[]
    hashtags: string[]
    visualSummary: string
    toneApplied: string
  }
  visualSummary?: string
}

export async function generatePostFromImage(data: {
  imageBase64: string
  tone?: string
  length?: string
  context?: string
  model?: string
}): Promise<GeneratePostFromImageResponse> {
  return apiFetch<GeneratePostFromImageResponse>('/ai/generate-post-from-image', {
    method: 'POST',
    body: data,
  })
}

export async function generatePost(data: {
  imageBase64?: string
  imageMimeType?: string
  tone: string
  length: string
  context?: string
}) {
  return apiFetch('/generate-post', { method: 'POST', body: data })
}

// LinkedIn OAuth & Direct Publishing
export interface LinkedInStatusResponse {
  isConfigured: boolean
  isConnected: boolean
  isExpired: boolean
  memberName: string
  memberPicture?: string | null
  memberUrn?: string | null
  memberEmail?: string | null
  connectedAt?: string | null
  expiresAt?: number
  scopes: string[]
}

export interface PublishResponse {
  status: 'success' | 'error'
  postUrn?: string
  shareUrl?: string
  hasImage?: boolean
  publishedAt?: string
  message: string
  code?: string
}

export async function getLinkedInStatus(): Promise<LinkedInStatusResponse> {
  return apiFetch<LinkedInStatusResponse>('/linkedin/status')
}

export async function getLinkedInAuthUrl(): Promise<{
  status: string
  authUrl?: string
  state?: string
  message?: string
}> {
  return apiFetch('/linkedin/auth-url')
}

export async function disconnectLinkedIn(): Promise<{ status: string; message: string }> {
  return apiFetch('/linkedin/disconnect', { method: 'POST' })
}

export async function publishToLinkedIn(data: {
  content: string
  imageBase64?: string
  includeImage?: boolean
  visibility?: 'PUBLIC' | 'CONNECTIONS'
}): Promise<PublishResponse> {
  return apiFetch<PublishResponse>('/linkedin/publish', { method: 'POST', body: data })
}

// ─────────────────────────────────────────────────────────────
// LinkedIn Profile Fetch & Audit Interfaces (Phase 5)
// ─────────────────────────────────────────────────────────────
export interface LinkedInProfileData {
  fullName: string
  picture?: string | null
  email?: string | null
  profileUrl?: string | null
  vanityName?: string | null
  headline?: string | null
  about?: string | null
  experience?: Array<{
    id: string
    title: string
    company: string
    duration: string
    description: string
  }>
  skills?: string[]
}

export interface LinkedInProfileFetchResponse {
  status: 'success' | 'warning' | 'error'
  isOwnProfile?: boolean
  authenticatedMember?: {
    memberUrn?: string
    name?: string
    email?: string | null
    picture?: string | null
  }
  profile?: LinkedInProfileData
  availableFields: string[]
  missingFields: string[]
  fieldStatus: Record<string, string>
  grantedScopes: string[]
  limitationsNotice: string
  code?: string
  message?: string
  allowManualInput?: boolean
}

export async function fetchLinkedInProfile(profileUrl?: string): Promise<LinkedInProfileFetchResponse> {
  return apiFetch<LinkedInProfileFetchResponse>('/linkedin/profile-fetch', {
    method: 'POST',
    body: { profileUrl },
  })
}

// ─── Phase 6: Authentication & Persistent User Data ──────────────────────────

export interface AuthResponse {
  status: 'success' | 'error'
  message?: string
  user: {
    id: string
    name: string
    email: string
    createdAt: string
    updatedAt: string
  }
  sessionToken?: string
}

export async function apiRegister(name: string, email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/register', {
    method: 'POST',
    body: { name, email, password },
  })
}

export async function apiLogin(email: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: { email, password },
  })
}

export async function apiLogout(): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>('/auth/logout', {
    method: 'POST',
    body: {},
  })
}

export async function apiGetCurrentUser(): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/me', {
    method: 'GET',
  })
}

export async function apiForgotPassword(email: string): Promise<{ status: string; message: string; note?: string }> {
  return apiFetch<{ status: string; message: string; note?: string }>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  })
}

export async function apiResetPassword(token: string, password: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
  })
}

export async function apiGetUserProfile(): Promise<{ status: string; profile: any }> {
  return apiFetch<{ status: string; profile: any }>('/user/profile')
}

export async function apiUpdateUserProfile(data: any): Promise<{ status: string; profile: any }> {
  return apiFetch<{ status: string; profile: any }>('/user/profile', {
    method: 'POST',
    body: data,
  })
}

export async function apiGetUserAudits(): Promise<{ status: string; audits: any[] }> {
  return apiFetch<{ status: string; audits: any[] }>('/user/audits')
}

export async function apiSaveUserAudit(auditData: any): Promise<{ status: string; audit: any }> {
  return apiFetch<{ status: string; audit: any }>('/user/audits', {
    method: 'POST',
    body: auditData,
  })
}

export async function apiGetUserDrafts(): Promise<{ status: string; drafts: any[] }> {
  return apiFetch<{ status: string; drafts: any[] }>('/user/drafts')
}

export async function apiSaveUserDraft(draftData: any): Promise<{ status: string; draft: any }> {
  return apiFetch<{ status: string; draft: any }>('/user/drafts', {
    method: 'POST',
    body: draftData,
  })
}

export async function apiDeleteUserDraft(draftId: string): Promise<{ status: string; message: string }> {
  return apiFetch<{ status: string; message: string }>(`/user/drafts?id=${encodeURIComponent(draftId)}`, {
    method: 'DELETE',
  })
}

export async function apiImportLocalData(data: { profile?: any; drafts?: any[] }): Promise<{
  status: string
  message: string
  imported: { profile: boolean; draftsCount: number }
}> {
  return apiFetch('/user/import-local', {
    method: 'POST',
    body: data,
  })
}
