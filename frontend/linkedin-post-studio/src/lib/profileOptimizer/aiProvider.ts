import type {
  ProfileInputData,
  OptimizationTone,
  ProfileAnalysisResult,
  ProfileAnalysisProvider,
} from './types'
import { runHeuristicProfileAnalysis } from './heuristicEngine'

// User engine preference key in local storage (stores only 'openrouter' | 'heuristic', NEVER an API key)
const ENGINE_PREFERENCE_STORAGE = 'linkoptimize_engine_mode'

export type EngineMode = 'openrouter' | 'heuristic'

export function getEnginePreference(): EngineMode {
  if (typeof window === 'undefined') return 'openrouter'
  const saved = localStorage.getItem(ENGINE_PREFERENCE_STORAGE)
  if (saved === 'heuristic') return 'heuristic'
  return 'openrouter'
}

export function setEnginePreference(mode: EngineMode): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(ENGINE_PREFERENCE_STORAGE, mode)
}

// ─────────────────────────────────────────────────────────────
// Server AI Diagnostic Status Interface
// ─────────────────────────────────────────────────────────────
export interface ServerAiStatus {
  status: 'ready' | 'unconfigured' | 'offline'
  configured: boolean
  model: string
  fallbackModels: string[]
  provider: string
}

/**
 * Checks server-side OpenRouter configuration without exposing any API keys.
 */
export async function checkServerAiStatus(): Promise<ServerAiStatus> {
  try {
    const res = await fetch('/api/ai/status', {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
    })
    if (!res.ok) {
      return {
        status: 'offline',
        configured: false,
        model: '',
        fallbackModels: [],
        provider: 'Backend Offline or Unreachable',
      }
    }
    const data = await res.json()
    return {
      status: data.configured ? 'ready' : 'unconfigured',
      configured: Boolean(data.configured),
      model: data.model || 'meta-llama/llama-3.3-70b-instruct:free',
      fallbackModels: Array.isArray(data.fallbackModels) ? data.fallbackModels : [],
      provider: data.provider || 'OpenRouter (Server-Side)',
    }
  } catch {
    return {
      status: 'offline',
      configured: false,
      model: '',
      fallbackModels: [],
      provider: 'Backend Offline (Local heuristic mode active)',
    }
  }
}

// ─────────────────────────────────────────────────────────────
// 1. Built-in Local Heuristic Provider (Always Available & Private)
// ─────────────────────────────────────────────────────────────
export const heuristicProvider: ProfileAnalysisProvider = {
  name: 'Heuristic Rule-Based Analyzer',
  isAvailable: () => true,
  analyze: async (input: ProfileInputData, tone: OptimizationTone) => {
    // Realistic micro-delay for smooth UX
    await new Promise((resolve) => setTimeout(resolve, 500))
    return runHeuristicProfileAnalysis(input, tone)
  },
}

// ─────────────────────────────────────────────────────────────
// 2. Secure Server-Side OpenRouter AI Provider
// ─────────────────────────────────────────────────────────────
export const openRouterProvider: ProfileAnalysisProvider = {
  name: 'OpenRouter AI (Server-Side)',
  isAvailable: () => true,
  analyze: async (
    input: ProfileInputData,
    tone: OptimizationTone
  ): Promise<ProfileAnalysisResult> => {
    // Calculate the baseline transparent heuristic score first.
    // This guarantees the scoring methodology is 100% explainable and mathematically anchored.
    const heuristicBaseline = runHeuristicProfileAnalysis(input, tone)

    try {
      const response = await fetch('/api/ai/optimize-profile', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          targetRole: input.targetRole,
          headline: input.headline,
          about: input.about,
          experience: input.experience,
          skills: input.skills,
          experienceStatus: input.experienceStatus,
          education: input.education,
          projects: input.projects,
          certifications: input.certifications,
          profileSource: input.profileSource,
          tone,
        }),
      })

      const data = await response.json()

      if (!response.ok || !data.data) {
        const errorMsg =
          data.message ||
          (response.status === 401
            ? 'OpenRouter API key is invalid on server.'
            : response.status === 429
            ? 'OpenRouter free models are currently rate-limited.'
            : response.status === 503
            ? 'OPENROUTER_API_KEY is not configured in backend server.'
            : `Server returned HTTP ${response.status}`)

        console.warn(`[OpenRouter Provider] Fallback triggered: ${errorMsg}`)

        // Transparent fallback: Never pretend fake AI output
        return {
          ...heuristicBaseline,
          summary: `${heuristicBaseline.summary} (Notice: Server AI optimization unavailable [${errorMsg}]; profile evaluated using built-in Heuristic Analyzer).`,
          engineUsed: 'Heuristic Rule-Based Analyzer',
          isAiPowered: false,
          fallbackReason: errorMsg,
        }
      }

      const aiData = data.data

      // Validate AI fields
      const optimizedHeadline =
        typeof aiData.optimizedHeadline === 'string' && aiData.optimizedHeadline.trim()
          ? aiData.optimizedHeadline.trim()
          : heuristicBaseline.improvements.headline.optimized

      const optimizedAbout =
        typeof aiData.optimizedAbout === 'string' && aiData.optimizedAbout.trim()
          ? aiData.optimizedAbout.trim()
          : heuristicBaseline.improvements.about.optimized

      const optimizedExperience =
        typeof aiData.optimizedExperience === 'string' && aiData.optimizedExperience.trim()
          ? aiData.optimizedExperience.trim()
          : heuristicBaseline.improvements.experience.optimized

      const optimizedSkills =
        typeof aiData.optimizedSkills === 'string' && aiData.optimizedSkills.trim()
          ? aiData.optimizedSkills.trim()
          : heuristicBaseline.improvements.skills.optimized

      const modelName = data.model || 'OpenRouter Free Model'
      const engineTitle = data.engineUsed || `OpenRouter AI (${modelName})`

      // Merge AI keyword suggestions with heuristic taxonomy keywords
      const aiKeywords = Array.isArray(aiData.recommendedKeywords)
        ? (aiData.recommendedKeywords as string[]).map((k) => String(k).trim()).filter(Boolean)
        : []

      const combinedMissingKeywords = Array.from(
        new Set([
          ...heuristicBaseline.keywordInsights.missingRecommendedKeywords,
          ...aiKeywords,
        ])
      )

      return {
        ...heuristicBaseline,
        summary:
          typeof aiData.summary === 'string' && aiData.summary.trim()
            ? aiData.summary.trim()
            : heuristicBaseline.summary,
        engineUsed: engineTitle,
        isAiPowered: true,
        improvements: {
          headline: {
            ...heuristicBaseline.improvements.headline,
            optimized: optimizedHeadline,
            suggestions:
              Array.isArray(aiData.headlineSuggestions) && aiData.headlineSuggestions.length > 0
                ? (aiData.headlineSuggestions as string[])
                : heuristicBaseline.improvements.headline.suggestions,
          },
          about: {
            ...heuristicBaseline.improvements.about,
            optimized: optimizedAbout,
            suggestions:
              Array.isArray(aiData.aboutSuggestions) && aiData.aboutSuggestions.length > 0
                ? (aiData.aboutSuggestions as string[])
                : heuristicBaseline.improvements.about.suggestions,
          },
          experience: {
            ...heuristicBaseline.improvements.experience,
            optimized: optimizedExperience,
            suggestions:
              Array.isArray(aiData.experienceSuggestions) && aiData.experienceSuggestions.length > 0
                ? (aiData.experienceSuggestions as string[])
                : heuristicBaseline.improvements.experience.suggestions,
          },
          skills: {
            ...heuristicBaseline.improvements.skills,
            optimized: optimizedSkills,
            suggestions:
              Array.isArray(aiData.skillsSuggestions) && aiData.skillsSuggestions.length > 0
                ? (aiData.skillsSuggestions as string[])
                : heuristicBaseline.improvements.skills.suggestions,
          },
        },
        keywordInsights: {
          ...heuristicBaseline.keywordInsights,
          missingRecommendedKeywords: combinedMissingKeywords,
        },
        timestamp: new Date().toISOString(),
      }
    } catch (networkErr) {
      console.warn(
        '[OpenRouter Provider] Backend server unreachable, falling back to local heuristic analyzer:',
        networkErr
      )
      return {
        ...heuristicBaseline,
        summary: `${heuristicBaseline.summary} (Notice: Backend server is offline or unreachable; evaluated using local Heuristic Rule Analyzer).`,
        engineUsed: 'Heuristic Rule-Based Analyzer',
        isAiPowered: false,
        fallbackReason: 'Backend server is offline or unreachable on port 8000',
      }
    }
  },
}

// ─────────────────────────────────────────────────────────────
// Active Provider Dispatcher
// ─────────────────────────────────────────────────────────────
export async function analyzeProfile(
  input: ProfileInputData,
  tone: OptimizationTone
): Promise<ProfileAnalysisResult> {
  const mode = getEnginePreference()
  if (mode === 'heuristic') {
    return heuristicProvider.analyze(input, tone)
  }
  return openRouterProvider.analyze(input, tone)
}
