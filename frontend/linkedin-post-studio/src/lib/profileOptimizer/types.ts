// Types for the LinkedIn Profile Optimizer Engine (Phase 2)

export type OptimizationTone = 'recruiter' | 'thought-leader' | 'tech' | 'founder'

export type ExperienceStatus = 'present' | 'fresher' | 'unavailable'

export type CareerIntent = 'current-field' | 'career-switcher' | 'related-role'

/**
 * Phase 5 — Profile Data Source
 * 'demo'     → fictional sample data for platform exploration; never mixed with real user data
 * 'manual'   → user-entered or pasted profile information
 * 'linkedin' → authorized LinkedIn OAuth profile (limited fields available)
 */
export type ProfileSource = 'demo' | 'manual' | 'linkedin'

export interface ExperienceInput {
  id: string
  title: string
  company: string
  duration: string
  description: string
}

export interface ProfileInputData {
  targetRole: string
  headline: string
  about: string
  experience: ExperienceInput[]
  skills: string[]
  profileUrl?: string
  experienceStatus?: ExperienceStatus
  careerIntent?: CareerIntent
  education?: string
  projects?: string
  certifications?: string[]
  /** Phase 5: which data source populated this profile (optional; defaults to 'manual') */
  profileSource?: ProfileSource
}

export type ScoreRating = 'Poor' | 'Needs Work' | 'Fair' | 'Strong' | 'Exceptional'

export interface CategoryScoreBreakdown {
  name: string
  score: number
  weight: number // 0-1 (e.g. 0.25)
  rating: ScoreRating
  feedback: string
  positiveFactors: string[]
  deductions: string[]
}

export interface ProfileSectionImprovement {
  name: string
  original: string
  optimized: string
  score: number
  maxScore: number
  suggestions: string[]
  isEdited: boolean
}

export interface KeywordInsights {
  existingUserSkills: string[]
  matchedKeywords: string[]
  missingRecommendedKeywords: string[]
  searchDensityRating: 'Low' | 'Moderate' | 'High' | 'Optimal'
  targetRole: string
  careerIntent?: CareerIntent
}

export interface ProfileAnalysisResult {
  overallScore: number
  overallRating: ScoreRating
  summary: string
  engineUsed: string
  isAiPowered: boolean
  fallbackReason?: string
  categories: {
    headline: CategoryScoreBreakdown
    about: CategoryScoreBreakdown
    experience: CategoryScoreBreakdown
    skills: CategoryScoreBreakdown
    readability: CategoryScoreBreakdown
  }
  improvements: {
    headline: ProfileSectionImprovement
    about: ProfileSectionImprovement
    experience: ProfileSectionImprovement
    skills: ProfileSectionImprovement
  }
  keywordInsights: KeywordInsights
  timestamp: string
}

export interface ProfileAnalysisProvider {
  name: string
  isAvailable: () => boolean
  analyze: (
    input: ProfileInputData,
    tone: OptimizationTone
  ) => Promise<ProfileAnalysisResult>
}
