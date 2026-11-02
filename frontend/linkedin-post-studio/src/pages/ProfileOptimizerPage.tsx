import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  UserCheck,
  Sparkles,
  Link as LinkIcon,
  FileText,
  Upload,
  CheckCircle2,
  Copy,
  Check,
  Edit3,
  RefreshCw,
  AlertCircle,
  Plus,
  Trash2,
  RotateCcw,
  Sliders,
  Info,
  ChevronDown,
  ChevronUp,
  Cpu,
  ShieldCheck,
  Linkedin,
  AlertTriangle,
  GraduationCap,
  Briefcase,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Input } from '@/components/ui/Input'
import { Textarea } from '@/components/ui/Textarea'
import { JobRoleSelector } from '@/components/ui/JobRoleSelector'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/hooks/useToast'
import type { DemoStateMode } from '@/components/layout/AppLayout'

// Phase 2 Profile Optimizer Engine imports
import type {
  OptimizationTone,
  ExperienceInput,
  ProfileInputData,
  ProfileAnalysisResult,
  ProfileSectionImprovement,
  ExperienceStatus,
  CareerIntent,
  ProfileSource,
} from '@/lib/profileOptimizer/types'
import {
  getRoleTaxonomy,
} from '@/lib/profileOptimizer/keywordTaxonomy'
import {
  analyzeProfile,
  getEnginePreference,
  setEnginePreference,
  checkServerAiStatus,
  type ServerAiStatus,
  type EngineMode,
} from '@/lib/profileOptimizer/aiProvider'
import {
  getLinkedInStatus,
  fetchLinkedInProfile,
  apiGetUserProfile,
  apiUpdateUserProfile,
  apiGetUserAudits,
  apiSaveUserAudit,
  type LinkedInStatusResponse,
  type LinkedInProfileFetchResponse,
} from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
// Phase 5 — Profile Data Management
import {
  getActiveSource,
  setActiveSource,
  saveProfileData,
  loadProfileData,
  clearProfileData,
} from '@/lib/profileOptimizer/profileStorage'
import { ProfileSourceSelector } from '@/components/profile/ProfileSourceSelector'
import { ProfileSourceBadge } from '@/components/profile/ProfileSourceBadge'

interface ProfileOptimizerPageProps {
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

type TabType = 'form' | 'url' | 'pdf'
type SectionType = 'headline' | 'about' | 'experience' | 'skills'

// Sample baseline profile for quick testing
const SAMPLE_PROFILE: ProfileInputData = {
  targetRole: 'Full-Stack Engineer',
  headline: 'Software Developer at TechCorp | React & Node.js',
  about:
    'Software engineer with 4 years of experience building web applications. Proficient in React, Node.js, and SQL databases. Looking for new opportunities to build products and grow professionally.',
  experience: [
    {
      id: 'exp-1',
      title: 'Software Developer',
      company: 'TechCorp',
      duration: '2022 - Present',
      description:
        'Developed full stack features using React and Node.js. Worked with product teams on database queries and bug fixes.',
    },
    {
      id: 'exp-2',
      title: 'Junior Web Developer',
      company: 'DevStudio',
      duration: '2020 - 2022',
      description:
        'Built client websites and internal dashboard tools using JavaScript and CSS.',
    },
  ],
  skills: ['React.js', 'Node.js', 'JavaScript', 'SQL', 'HTML5', 'CSS3', 'Git'],
  profileUrl: 'https://www.linkedin.com/in/alexrivera-tech',
}

export function ProfileOptimizerPage({
  stateMode = 'normal',
  onStateModeChange,
}: ProfileOptimizerPageProps) {
  const { success, warning, info } = useToast()
  const navigate = useNavigate()

  // Navigation & Mode Tabs
  const [activeInputTab, setActiveInputTab] = useState<TabType>('form')
  const [activeSection, setActiveSection] = useState<SectionType>('headline')
  const [targetTone, setTargetTone] = useState<OptimizationTone>('recruiter')

  // LinkedIn OAuth Status & Profile Fetch State
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatusResponse | null>(null)
  const [isFetchingProfile, setIsFetchingProfile] = useState(false)
  const [fetchedProfileInfo, setFetchedProfileInfo] = useState<LinkedInProfileFetchResponse | null>(null)
  const [thirdPartyWarning, setThirdPartyWarning] = useState<{
    requestedUrl: string
    reason: string
    authenticatedMember?: {
      memberUrn?: string
      name?: string
      email?: string | null
      picture?: string | null
    }
  } | null>(null)

  // Form State
  const [targetRole, setTargetRole] = useState<string>(SAMPLE_PROFILE.targetRole)
  const [headline, setHeadline] = useState<string>(SAMPLE_PROFILE.headline)
  const [about, setAbout] = useState<string>(SAMPLE_PROFILE.about)
  const [experience, setExperience] = useState<ExperienceInput[]>(
    SAMPLE_PROFILE.experience
  )
  const [experienceStatus, setExperienceStatus] = useState<ExperienceStatus>(
    SAMPLE_PROFILE.experience.length > 0 ? 'present' : 'fresher'
  )
  const [careerIntent, setCareerIntent] = useState<CareerIntent>('current-field')
  const [originalBackup, setOriginalBackup] = useState<{
    headline?: string
    about?: string
    skills?: string[]
  }>({})
  const [education, setEducation] = useState<string>('')
  const [projects, setProjects] = useState<string>('')
  const [skills, setSkills] = useState<string[]>(SAMPLE_PROFILE.skills)
  const [newSkillInput, setNewSkillInput] = useState<string>('')
  const [profileUrl, setProfileUrl] = useState<string>(SAMPLE_PROFILE.profileUrl || '')
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null)

  // Validation Errors
  const [errors, setErrors] = useState<{
    targetRole?: string
    headline?: string
    about?: string
    experience?: string
    skills?: string
    profileUrl?: string
  }>({})

  // Analysis Execution & Result State
  const [isAuditing, setIsAuditing] = useState(false)
  const [auditStep, setAuditStep] = useState<string>('')
  const [analysisResult, setAnalysisResult] =
    useState<ProfileAnalysisResult | null>(null)

  // Side-by-side editing & copying state
  const [editingSection, setEditingSection] = useState<SectionType | null>(null)
  const [editText, setEditText] = useState('')
  const [copiedSection, setCopiedSection] = useState<string | null>(null)
  const [expandedCategories, setExpandedCategories] = useState<
    Record<string, boolean>
  >({
    headline: true,
    about: false,
    experience: false,
    skills: false,
    readability: false,
  })

  // AI Provider Configuration Modal & Server Diagnostics
  const [isAiModalOpen, setIsAiModalOpen] = useState(false)
  const [engineMode, setEngineModeState] = useState<EngineMode>(getEnginePreference())
  const [serverAiStatus, setServerAiStatus] = useState<ServerAiStatus | null>(null)

  // URL retrieval modal / transparency explanation
  const [isUrlModalOpen, setIsUrlModalOpen] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // Phase 5 — Profile Data Management state
  // ─────────────────────────────────────────────────────────────
  const [profileSource, setProfileSource] = useState<ProfileSource | null>(null)
  const [showSourceSelector, setShowSourceSelector] = useState(false)
  const [linkedInAvailableFields, setLinkedInAvailableFields] = useState<string[]>([])
  // Track unsaved manual edits so we can warn before discarding
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  // ─────────────────────────────────────────────────────────────
  // Phase 6: Authenticated Cloud Sync & Audit History state
  // ─────────────────────────────────────────────────────────────
  const { isAuthenticated } = useAuth()
  const [cloudSaveStatus, setCloudSaveStatus] = useState<'saved' | 'saving' | 'idle' | 'error'>('idle')
  const [auditHistory, setAuditHistory] = useState<any[]>([])
  const [isAuditHistoryOpen, setIsAuditHistoryOpen] = useState(false)

  // Check whether target role diverges substantially from current profile background
  const isRoleDivergent = useMemo(() => {
    if (!targetRole) return false
    const roleTokens = targetRole.toLowerCase().split(/\s+/).filter((w) => w.length > 2)
    const currentHeadlineLower = headline.toLowerCase()
    const currentAboutLower = about.toLowerCase()
    const hasRoleInHeadline = roleTokens.some((token) => currentHeadlineLower.includes(token))
    const hasRoleInAbout = roleTokens.some((token) => currentAboutLower.includes(token))
    return !hasRoleInHeadline && !hasRoleInAbout
  }, [targetRole, headline, about])

  const handleApplyToEditor = (section: SectionType, text: string) => {
    if (section === 'headline') {
      setOriginalBackup((prev) => ({ ...prev, headline: prev.headline || headline }))
      setHeadline(text)
    } else if (section === 'about') {
      setOriginalBackup((prev) => ({ ...prev, about: prev.about || about }))
      setAbout(text)
    }
    success('Applied to Form Editor', `Optimized ${section} copied into form editor. Original text is preserved and can be reverted anytime.`)
  }

  const handleRevertOriginal = (section: SectionType) => {
    if (section === 'headline' && originalBackup.headline) {
      setHeadline(originalBackup.headline)
      setOriginalBackup((prev) => ({ ...prev, headline: undefined }))
      success('Reverted', 'Headline restored to original copy.')
    } else if (section === 'about' && originalBackup.about) {
      setAbout(originalBackup.about)
      setOriginalBackup((prev) => ({ ...prev, about: undefined }))
      success('Reverted', 'About section restored to original copy.')
    }
  }

  // On mount: fetch LinkedIn account OAuth status + restore Phase 5 profile source
  useEffect(() => {
    let mounted = true
    getLinkedInStatus()
      .then((status) => {
        if (mounted) setLinkedInStatus(status)
      })
      .catch(() => {})

    // ── Phase 6: Load authenticated user profile & audit history from DB ────────
    if (isAuthenticated) {
      apiGetUserProfile()
        .then((res) => {
          if (!mounted) return
          if (res && res.profile && (res.profile.headline || res.profile.about || (Array.isArray(res.profile.skills) && res.profile.skills.length > 0))) {
            const p = res.profile
            if (p.targetRole) setTargetRole(p.targetRole)
            if (p.headline) setHeadline(p.headline)
            if (p.about) setAbout(p.about)
            if (Array.isArray(p.skills)) setSkills(p.skills)
            if (Array.isArray(p.experience)) setExperience(p.experience)
            if (p.education) setEducation(p.education)
            if (p.projects) setProjects(p.projects)
            if (p.profileUrl) setProfileUrl(p.profileUrl)
            if (p.experienceStatus) setExperienceStatus(p.experienceStatus)
            if (p.careerIntent) setCareerIntent(p.careerIntent)
            setProfileSource(p.profileSource || 'manual')
            setShowSourceSelector(false)
            setCloudSaveStatus('saved')
          }
        })
        .catch(() => {})

      apiGetUserAudits()
        .then((res) => {
          if (!mounted) return
          if (res && Array.isArray(res.audits)) {
            setAuditHistory(res.audits)
          }
        })
        .catch(() => {})
    }

    // ── Phase 5: restore persisted source selection if not already restored from DB ──
    const savedSource = getActiveSource()
    if (savedSource) {
      setProfileSource(savedSource)
      setShowSourceSelector(false)
      // Restore form data for the active source
      const saved = loadProfileData(savedSource)
      if (saved) {
        if (typeof saved.targetRole === 'string') setTargetRole(saved.targetRole)
        if (typeof saved.headline === 'string') setHeadline(saved.headline)
        if (typeof saved.about === 'string') setAbout(saved.about)
        if (Array.isArray(saved.experience)) setExperience(saved.experience as ExperienceInput[])
        if (Array.isArray(saved.skills)) setSkills(saved.skills as string[])
        if (typeof saved.education === 'string') setEducation(saved.education)
        if (typeof saved.projects === 'string') setProjects(saved.projects)
        if (typeof saved.profileUrl === 'string') setProfileUrl(saved.profileUrl)
        if (saved.experienceStatus === 'present' || saved.experienceStatus === 'fresher' || saved.experienceStatus === 'unavailable') {
          setExperienceStatus(saved.experienceStatus as ExperienceStatus)
        }
        if (saved.careerIntent === 'current-field' || saved.careerIntent === 'career-switcher' || saved.careerIntent === 'related-role') {
          setCareerIntent(saved.careerIntent as CareerIntent)
        }
        if (Array.isArray(saved.linkedInAvailableFields)) {
          setLinkedInAvailableFields(saved.linkedInAvailableFields as string[])
        }
      }
    } else {
      // No source persisted — show the source selector for new users
      setShowSourceSelector(true)
    }

    return () => {
      mounted = false
    }
  }, [])

  // ─────────────────────────────────────────────────────────────
  // LinkedIn Profile Fetch Handlers
  // ─────────────────────────────────────────────────────────────
  const handleFetchMyProfile = async () => {
    setIsFetchingProfile(true)
    setThirdPartyWarning(null)
    try {
      const res = await fetchLinkedInProfile()
      if (res.status === 'success' && res.profile) {
        setFetchedProfileInfo(res)
        if (res.profile.profileUrl) {
          setProfileUrl(res.profile.profileUrl)
        }
        success(
          'Profile Fetched',
          `Authorized LinkedIn account data loaded for ${res.profile.fullName || 'member'}.`
        )
      } else if (res.status === 'warning') {
        setFetchedProfileInfo(res)
        warning('Profile Notice', res.message || 'Partial profile data retrieved.')
      } else {
        warning('Fetch Failed', res.message || 'Could not retrieve profile.')
      }
    } catch (err) {
      warning(
        'Fetch Error',
        err instanceof Error ? err.message : 'Failed to fetch LinkedIn profile.'
      )
    } finally {
      setIsFetchingProfile(false)
    }
  }

  const handleFetchFromUrl = async () => {
    if (!validateUrl(profileUrl)) return
    setIsFetchingProfile(true)
    setThirdPartyWarning(null)
    try {
      const res = await fetchLinkedInProfile(profileUrl)
      if (res.status === 'warning' && res.code === 'THIRD_PARTY_PROFILE_RESTRICTED') {
        setThirdPartyWarning({
          requestedUrl: profileUrl,
          reason:
            res.message ||
            'LinkedIn OAuth privacy prevents fetching another member\'s profile without their explicit authorization.',
          authenticatedMember: res.authenticatedMember,
        })
        warning(
          'Third-Party Profile Notice',
          'LinkedIn API restricts accessing other members\' data. Please use the manual form below.'
        )
      } else if (res.status === 'success' && res.profile) {
        setFetchedProfileInfo(res)
        success(
          'Profile Fetched',
          `Authorized profile retrieved for ${res.profile.fullName || 'member'}.`
        )
      } else {
        warning('Fetch Notice', res.message || 'Could not fetch profile.')
      }
    } catch (err) {
      warning(
        'Fetch Error',
        err instanceof Error ? err.message : 'Failed to fetch profile from URL.'
      )
    } finally {
      setIsFetchingProfile(false)
    }
  }

  const handlePreFillMissingFields = () => {
    if (!headline || headline === '') setHeadline(SAMPLE_PROFILE.headline)
    if (!about || about === '') setAbout(SAMPLE_PROFILE.about)
    if (!experience || experience.length === 0) setExperience(SAMPLE_PROFILE.experience)
    if (!skills || skills.length === 0) setSkills(SAMPLE_PROFILE.skills)
    success(
      'Missing Fields Populated',
      'Filled headline, summary, experience, and skills with sample data for audit testing.'
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Phase 5 — Profile Source Handlers
  // ─────────────────────────────────────────────────────────────

  /** Snapshot current form state into an object suitable for profileStorage. */
  const captureFormSnapshot = () => ({
    targetRole,
    headline,
    about,
    experience,
    skills,
    education,
    projects,
    profileUrl,
    experienceStatus,
    careerIntent,
    linkedInAvailableFields,
  })

  /** Persist current manual form state to localStorage (debounce caller). */
  const persistManualData = () => {
    if (profileSource === 'manual') {
      saveProfileData('manual', captureFormSnapshot())
    }
  }

  /** Switch to demo source: load SAMPLE_PROFILE, persist, show badge. */
  const applyDemoSource = () => {
    setTargetRole(SAMPLE_PROFILE.targetRole)
    setHeadline(SAMPLE_PROFILE.headline)
    setAbout(SAMPLE_PROFILE.about)
    setExperience(SAMPLE_PROFILE.experience)
    setExperienceStatus('present')
    setSkills(SAMPLE_PROFILE.skills)
    setProfileUrl(SAMPLE_PROFILE.profileUrl || '')
    setEducation('')
    setProjects('')
    setCareerIntent('current-field')
    setAnalysisResult(null)
    setErrors({})
    setProfileSource('demo')
    setShowSourceSelector(false)
    setHasUnsavedChanges(false)
    setActiveSource('demo')
    // Persist the snapshot so the demo badge survives reload
    saveProfileData('demo', {
      targetRole: SAMPLE_PROFILE.targetRole,
      headline: SAMPLE_PROFILE.headline,
      about: SAMPLE_PROFILE.about,
      experience: SAMPLE_PROFILE.experience,
      skills: SAMPLE_PROFILE.skills,
      profileUrl: SAMPLE_PROFILE.profileUrl || '',
      education: '',
      projects: '',
      experienceStatus: 'present',
      careerIntent: 'current-field',
    })
    success('Demo Profile Loaded', 'Fictional sample profile loaded. Not your real data.')
  }

  /** Switch to manual source: restore saved manual data if any, else clear form. */
  const applyManualSource = () => {
    const saved = loadProfileData('manual')
    if (saved) {
      if (typeof saved.targetRole === 'string') setTargetRole(saved.targetRole)
      if (typeof saved.headline === 'string') setHeadline(saved.headline)
      if (typeof saved.about === 'string') setAbout(saved.about)
      if (Array.isArray(saved.experience)) setExperience(saved.experience as ExperienceInput[])
      if (Array.isArray(saved.skills)) setSkills(saved.skills as string[])
      if (typeof saved.education === 'string') setEducation(saved.education)
      if (typeof saved.projects === 'string') setProjects(saved.projects)
      if (typeof saved.profileUrl === 'string') setProfileUrl(saved.profileUrl)
      if (saved.experienceStatus === 'present' || saved.experienceStatus === 'fresher' || saved.experienceStatus === 'unavailable') {
        setExperienceStatus(saved.experienceStatus as ExperienceStatus)
      }
      if (saved.careerIntent === 'current-field' || saved.careerIntent === 'career-switcher' || saved.careerIntent === 'related-role') {
        setCareerIntent(saved.careerIntent as CareerIntent)
      }
    } else {
      // Fresh manual entry: clear the form
      setTargetRole('Full-Stack Engineer')
      setHeadline('')
      setAbout('')
      setExperience([])
      setExperienceStatus('fresher')
      setEducation('')
      setProjects('')
      setSkills([])
      setProfileUrl('')
      setCareerIntent('current-field')
    }
    setAnalysisResult(null)
    setErrors({})
    setProfileSource('manual')
    setShowSourceSelector(false)
    setHasUnsavedChanges(false)
    setActiveSource('manual')
    info('Manual Profile', saved ? 'Your previously saved profile loaded.' : 'Enter your profile information below.')
  }

  /** Switch to LinkedIn source: trigger fetch and pre-fill available fields. */
  const applyLinkedInSource = async () => {
    setProfileSource('linkedin')
    setShowSourceSelector(false)
    setActiveSource('linkedin')
    setAnalysisResult(null)
    setErrors({})

    // Check if already connected and fetch
    setIsFetchingProfile(true)
    try {
      const res = await fetchLinkedInProfile()
      if (res.status === 'success' && res.profile) {
        setFetchedProfileInfo(res)
        const available = res.availableFields ?? []
        setLinkedInAvailableFields(available)
        if (res.profile.profileUrl) setProfileUrl(res.profile.profileUrl)
        // Persist the linkedin data snapshot
        saveProfileData('linkedin', {
          profileUrl: res.profile.profileUrl || '',
          linkedInAvailableFields: available,
          // headline, about, skills remain blank — require manual entry
          targetRole,
          headline: '',
          about: '',
          experience: [],
          skills: [],
          education: '',
          projects: '',
          experienceStatus: 'unavailable',
          careerIntent,
        })
        success(
          'LinkedIn Profile Retrieved',
          `Name and profile URL loaded for ${res.profile.fullName || 'your account'}. Please fill in Headline, About & Skills manually.`
        )
      } else if (res.status === 'warning') {
        setFetchedProfileInfo(res)
        warning('LinkedIn Notice', res.message || 'Partial profile data retrieved. Please complete remaining fields manually.')
      } else {
        warning('Fetch Notice', res.message || 'Could not retrieve LinkedIn profile. Please connect and try again.')
      }
    } catch (err) {
      warning('LinkedIn Error', err instanceof Error ? err.message : 'Failed to fetch LinkedIn profile.')
    } finally {
      setIsFetchingProfile(false)
    }
  }

  /**
   * Called when the user clicks a card in ProfileSourceSelector.
   * Checks for unsaved changes before switching.
   */
  const handleSourceSelect = (newSource: ProfileSource) => {
    const isCurrentlyEdited = profileSource === 'manual' && hasUnsavedChanges
    if (isCurrentlyEdited) {
      // Persist current manual data before switching
      persistManualData()
    }
    if (newSource === 'demo') applyDemoSource()
    else if (newSource === 'manual') applyManualSource()
    else applyLinkedInSource()
  }

  /** Open the source selector (with optional save of current manual data). */
  const handleSwitchSource = () => {
    if (profileSource === 'manual' && hasUnsavedChanges) {
      persistManualData()
    }
    setShowSourceSelector(true)
  }

  /** Reset demo: clears demo storage, reloads SAMPLE_PROFILE. */
  const handleResetDemo = () => {
    clearProfileData('demo')
    applyDemoSource()
    success('Demo Reset', 'Demo profile reloaded with original sample data.')
  }

  // ─────────────────────────────────────────────────────────────
  // Form Validation & Management
  // ─────────────────────────────────────────────────────────────
  const validateForm = (): boolean => {
    const newErrors: typeof errors = {}

    if (!targetRole.trim()) {
      newErrors.targetRole = 'Please select or specify your target role'
    }

    if (!headline.trim()) {
      newErrors.headline = 'Headline is required'
    } else if (headline.trim().length < 5) {
      newErrors.headline = 'Headline is too short (min 5 characters)'
    } else if (headline.trim().length > 220) {
      newErrors.headline = 'Headline exceeds LinkedIn maximum limit of 220 characters'
    }

    if (!about.trim()) {
      newErrors.about = 'About / Summary section is required'
    } else if (about.trim().length < 20) {
      newErrors.about = 'About section must be at least 20 characters for meaningful analysis'
    }

    // Experience is optional: an empty experience section never blocks audit execution.
    // Only flag incomplete entries if the user added a role entry with partial content.
    if (experience.length > 0) {
      const hasPartiallyEmptyExp = experience.some(
        (e) => (!e.title.trim() && e.description.trim()) || (e.title.trim() && !e.description.trim())
      )
      if (hasPartiallyEmptyExp) {
        newErrors.experience = 'Please provide both a job title and description for any entered roles'
      }
    }

    if (skills.length < 2) {
      newErrors.skills = 'Please specify at least 2 relevant skills'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const validateUrl = (url: string): boolean => {
    const trimmed = url.trim()
    if (!trimmed) {
      setErrors((prev) => ({
        ...prev,
        profileUrl: 'Please enter a LinkedIn profile URL',
      }))
      return false
    }
    const isLinkedIn =
      /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i.test(trimmed)
    if (!isLinkedIn) {
      setErrors((prev) => ({
        ...prev,
        profileUrl:
          'Invalid format. Must be like https://www.linkedin.com/in/your-username',
      }))
      return false
    }
    setErrors((prev) => ({ ...prev, profileUrl: undefined }))
    return true
  }

  // ─────────────────────────────────────────────────────────────
  // Experience List Handlers
  // ─────────────────────────────────────────────────────────────
  const handleAddExperience = () => {
    setExperience((prev) => [
      ...prev,
      {
        id: `exp-${Date.now()}`,
        title: '',
        company: '',
        duration: '',
        description: '',
      },
    ])
  }

  const handleRemoveExperience = (id: string) => {
    setExperience((prev) => prev.filter((e) => e.id !== id))
  }

  const handleUpdateExperience = (
    id: string,
    field: keyof ExperienceInput,
    value: string
  ) => {
    setExperience((prev) =>
      prev.map((e) => (e.id === id ? { ...e, [field]: value } : e))
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Skills Tag Handlers
  // ─────────────────────────────────────────────────────────────
  const handleAddSkill = (skillToAdd?: string) => {
    const rawSkill = skillToAdd || newSkillInput
    const trimmed = rawSkill.trim()
    if (!trimmed) return
    if (!skills.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkills((prev) => [...prev, trimmed])
      setErrors((prev) => ({ ...prev, skills: undefined }))
    }
    if (!skillToAdd) setNewSkillInput('')
  }

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkills((prev) => prev.filter((s) => s !== skillToRemove))
  }

  // ─────────────────────────────────────────────────────────────
  // Reset / Pre-fill Handlers
  // ─────────────────────────────────────────────────────────────
  const handleLoadSample = () => {
    // Phase 5: load sample now goes through the demo source flow
    applyDemoSource()
  }

  const handleResetForm = () => {
    setTargetRole('Full-Stack Engineer')
    setHeadline('')
    setAbout('')
    setExperience([])
    setExperienceStatus('fresher')
    setEducation('')
    setProjects('')
    setSkills([])
    setErrors({})
    setAnalysisResult(null)
    if (profileSource === 'manual') {
      saveProfileData('manual', {
        targetRole: 'Full-Stack Engineer',
        headline: '',
        about: '',
        experience: [],
        skills: [],
        education: '',
        projects: '',
        profileUrl: '',
        experienceStatus: 'fresher',
        careerIntent,
      })
    }
    info('Form Cleared', 'You can now enter your own profile information.')
  }

  // ─────────────────────────────────────────────────────────────
  // Analysis Trigger
  // ─────────────────────────────────────────────────────────────
  const handleRunAudit = async (toneToUse: OptimizationTone = targetTone) => {
    if (!validateForm()) {
      warning(
        'Incomplete Profile',
        'Please address the highlighted errors before running the analysis.'
      )
      return
    }

    setIsAuditing(true)
    setAuditStep('Evaluating headline clarity and target role keywords...')

    setTimeout(() => {
      setAuditStep(
        'Auditing About summary for hook strength and quantifiable metrics...'
      )
    }, 400)

    setTimeout(() => {
      setAuditStep(
        'Inspecting experience descriptions for action verbs and STAR metrics...'
      )
    }, 800)

    setTimeout(() => {
      setAuditStep(
        'Calculating recruiter search ranking and formulating tailored rewrites...'
      )
    }, 1200)

    try {
      const effectiveExpStatus: ExperienceStatus =
        experience.length > 0
          ? 'present'
          : experienceStatus === 'unavailable'
          ? 'unavailable'
          : 'fresher'

      const inputData: ProfileInputData = {
        targetRole,
        headline,
        about,
        experience: effectiveExpStatus === 'present' ? experience : [],
        skills,
        profileUrl,
        experienceStatus: effectiveExpStatus,
        careerIntent,
        education: education.trim() || undefined,
        projects: projects.trim() || undefined,
        // Phase 5: pass data source through to analysis pipeline
        profileSource: profileSource ?? 'manual',
      }

      const result = await analyzeProfile(inputData, toneToUse)
      setAnalysisResult(result)

      // Phase 6: Save completed audit to database for authenticated user (never in demo mode)
      if (isAuthenticated && profileSource !== 'demo') {
        apiSaveUserAudit({
          targetRole,
          careerIntent,
          overallScore: result.overallScore,
          overallRating: result.overallRating,
          engineUsed: result.engineUsed,
          summary: result.summary,
          categories: result.categories,
          improvements: result.improvements,
          keywordInsights: result.keywordInsights,
        })
          .then((res) => {
            if (res && res.audit) {
              setAuditHistory((prev) => [res.audit, ...prev])
            }
          })
          .catch((err) => {
            console.warn('[Audit History] Failed to save audit to cloud database:', err)
          })
      }

      if (result.isAiPowered) {
        success(
          'OpenRouter AI Complete!',
          `Generated live via ${result.engineUsed}. Transparent score: ${result.overallScore}/100.`
        )
      } else if (result.fallbackReason) {
        warning(
          'Heuristic Fallback Used',
          `AI unavailable (${result.fallbackReason}). Calculated score: ${result.overallScore}/100 via local engine.`
        )
      } else {
        success(
          'Analysis Complete!',
          `Profile score calculated: ${result.overallScore}/100 via ${result.engineUsed}.`
        )
      }
    } catch (err) {
      console.error(err)
      warning(
        'Analysis Warning',
        err instanceof Error ? err.message : 'Analysis failed. Please try again.'
      )
    } finally {
      setIsAuditing(false)
    }
  }

  // Real-time Tone Regeneration
  const handleToneChange = (newTone: OptimizationTone) => {
    setTargetTone(newTone)
    if (analysisResult) {
      handleRunAudit(newTone)
    }
  }

  // Phase 5 & 6: Auto-save manual / LinkedIn profile data (localStorage + persistent DB)
  useEffect(() => {
    // Strictly never save fictional demo data to user's real database profile
    if (profileSource === 'demo') return
    if (profileSource !== 'manual' && profileSource !== 'linkedin') return

    setHasUnsavedChanges(true)
    setCloudSaveStatus('saving')

    const timer = setTimeout(async () => {
      saveProfileData(profileSource, {
        targetRole,
        headline,
        about,
        experience,
        skills,
        education,
        projects,
        profileUrl,
        experienceStatus,
        careerIntent,
        linkedInAvailableFields,
      })

      if (isAuthenticated) {
        try {
          await apiUpdateUserProfile({
            profileSource,
            targetRole,
            headline,
            about,
            skills,
            education,
            experience,
            projects,
            experienceStatus,
            careerIntent,
            profileUrl,
          })
          setCloudSaveStatus('saved')
        } catch {
          setCloudSaveStatus('error')
        }
      } else {
        setCloudSaveStatus('idle')
      }
      setHasUnsavedChanges(false)
    }, 800)
    return () => clearTimeout(timer)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [targetRole, headline, about, experience, skills, education, projects, profileUrl, experienceStatus, careerIntent, profileSource, isAuthenticated])

  // ─────────────────────────────────────────────────────────────
  // Copy & Inline Edit Handlers
  // ─────────────────────────────────────────────────────────────
  const handleCopy = (text: string, sectionName: string) => {
    navigator.clipboard.writeText(text)
    setCopiedSection(sectionName)
    success(
      'Copied to Clipboard',
      `${sectionName} text is ready to paste into LinkedIn.`
    )
    setTimeout(() => setCopiedSection(null), 2000)
  }

  const handleStartEdit = (section: SectionType, text: string) => {
    setEditingSection(section)
    setEditText(text)
  }

  const handleSaveEdit = (section: SectionType) => {
    if (!analysisResult) return
    setAnalysisResult((prev) => {
      if (!prev) return prev
      const current = prev.improvements[section]
      return {
        ...prev,
        improvements: {
          ...prev.improvements,
          [section]: {
            ...current,
            optimized: editText,
            isEdited: true,
          },
        },
      }
    })
    setEditingSection(null)
    success('Saved Changes', `${section} copy updated.`)
  }

  const toggleCategoryExpand = (catKey: string) => {
    setExpandedCategories((prev) => ({ ...prev, [catKey]: !prev[catKey] }))
  }

  // ─────────────────────────────────────────────────────────────
  // UI States: Loading, Error & Empty
  // ─────────────────────────────────────────────────────────────
  if (stateMode === 'empty') {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            LinkedIn Profile Optimizer
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Audit your profile against 2026 recruiter search algorithms and generate high-impact rewrites.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon={<UserCheck className="h-14 w-14 text-slate-300 dark:text-slate-600" />}
              title="No Profile Audited Yet"
              description="Fill out the profile form or load our pre-filled developer sample to receive an instant comprehensive audit."
              action={{
                label: 'Load Sample Profile & Audit',
                onClick: () => {
                  handleLoadSample()
                  onStateModeChange?.('normal')
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  if (stateMode === 'loading' || isAuditing) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="text-center py-12">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0a66c2] dark:bg-slate-800 dark:text-blue-400 mb-4 animate-bounce shadow-sm">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Analyzing Your LinkedIn Profile...
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 max-w-md mx-auto">
            {auditStep ||
              'Running heuristic audit across headline keywords, metric density, and experience impact.'}
          </p>
          <div className="w-64 h-2 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mt-6 overflow-hidden">
            <div className="h-full bg-[#0a66c2] rounded-full animate-pulse w-3/4" />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-44 rounded-xl" />
          <Skeleton className="h-44 rounded-xl md:col-span-2" />
        </div>
        <Skeleton className="h-80 rounded-xl" />
      </div>
    )
  }

  if (stateMode === 'error') {
    return (
      <div className="py-12 animate-fade-in max-w-xl mx-auto">
        <Card className="border-red-200 dark:border-red-900/50">
          <CardContent className="py-12 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 mb-4">
              <AlertCircle className="h-7 w-7" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              Failed to Analyze Profile
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              An error occurred while evaluating your profile text against the heuristic dictionary.
            </p>
            {onStateModeChange && (
              <Button variant="primary" onClick={() => onStateModeChange('normal')}>
                Retry Analysis
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // ─────────────────────────────────────────────────────────────
  // Render: Main Functional Optimizer Page
  // ─────────────────────────────────────────────────────────────
  const currentImprovement: ProfileSectionImprovement | undefined =
    analysisResult?.improvements[activeSection]

  // Phase 5: Clean 3-option entry experience when no source is chosen or user requests switch
  if (showSourceSelector && !analysisResult) {
    return (
      <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
        {/* Page Title & AI Engine Status Badge */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
                LinkedIn Profile Optimizer
              </h1>
              <Badge variant="linkedin" size="sm">
                Phase 5 Active
              </Badge>
            </div>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              Perform an independent algorithmic audit on your profile, discover keyword gaps, and generate high-impact rewrites.
            </p>
          </div>
        </div>

        <Card className="shadow-sm">
          <CardContent className="pt-6">
            <ProfileSourceSelector
              onSelect={handleSourceSelect}
              isLinkedInConnected={Boolean(linkedInStatus?.isConnected)}
              isCheckingLinkedIn={isFetchingProfile}
            />
            {profileSource && (
              <div className="text-center pb-6">
                <Button variant="ghost" size="sm" onClick={() => setShowSourceSelector(false)}>
                  ← Return to current {profileSource === 'demo' ? 'demo' : profileSource === 'linkedin' ? 'LinkedIn' : 'manual'} profile
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Page Title & AI Engine Status Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              LinkedIn Profile Optimizer
            </h1>
            <Badge variant="linkedin" size="sm">
              Phase 5 Active
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Perform an independent algorithmic audit on your profile, discover keyword gaps, and generate high-impact rewrites.
          </p>
        </div>

        {/* Header Controls: Cloud Save Status, Audit History & AI Engine */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cloud Auto-Save Status */}
          {isAuthenticated && profileSource !== 'demo' && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700">
              {cloudSaveStatus === 'saving' ? (
                <>
                  <RefreshCw className="h-3 w-3 animate-spin text-[#0a66c2]" />
                  <span>Saving to cloud...</span>
                </>
              ) : cloudSaveStatus === 'saved' ? (
                <>
                  <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                  <span>Saved to cloud</span>
                </>
              ) : cloudSaveStatus === 'error' ? (
                <>
                  <AlertCircle className="h-3 w-3 text-red-500" />
                  <span>Save failed</span>
                </>
              ) : (
                <>
                  <Check className="h-3 w-3 text-slate-400" />
                  <span>Cloud synced</span>
                </>
              )}
            </div>
          )}

          {/* Audit History Trigger Button */}
          {isAuthenticated && (
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => {
                apiGetUserAudits().then((r) => r.audits && setAuditHistory(r.audits)).catch(() => {})
                setIsAuditHistoryOpen(true)
              }}
            >
              <FileText className="h-3.5 w-3.5 text-[#0a66c2]" />
              <span>Audit History</span>
              {auditHistory.length > 0 && (
                <span className="ml-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-[#0a66c2] dark:text-blue-400 px-1.5 py-0.2 text-[10px] font-bold">
                  {auditHistory.length}
                </span>
              )}
            </Button>
          )}

          {/* AI Provider Config Pill */}
          <button
            onClick={() => {
              checkServerAiStatus().then(setServerAiStatus)
              setIsAiModalOpen(true)
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 transition-colors shadow-xs"
            title="Configure Server-Side AI Engine"
          >
            <Cpu className="h-3.5 w-3.5 text-[#0a66c2]" />
            <span>
              Engine:{' '}
              {engineMode === 'openrouter'
                ? 'OpenRouter AI (Server)'
                : 'Heuristic Engine'}
            </span>
            <Sliders className="h-3 w-3 text-slate-400" />
          </button>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 1: PROFILE INPUT SECTION
      ───────────────────────────────────────────────────────────── */}
      <Card className="shadow-sm">
        <CardHeader className="pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-[#0a66c2]" />
              <CardTitle className="text-base font-bold">
                1. Your LinkedIn Profile Information
              </CardTitle>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={handleLoadSample}
                leftIcon={<Sparkles className="h-3.5 w-3.5 text-[#0a66c2]" />}
              >
                Pre-fill Sample
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
                onClick={handleResetForm}
                leftIcon={<RotateCcw className="h-3.5 w-3.5" />}
              >
                Reset
              </Button>
            </div>
          </div>

          {/* Phase 5: Profile Data Source Badge Banner */}
          <div className="mt-3 p-3 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200/80 dark:border-slate-700/80 flex items-center justify-between flex-wrap gap-2">
            <ProfileSourceBadge
              source={profileSource || 'manual'}
              linkedInAvailableFields={linkedInAvailableFields}
              onSwitch={handleSwitchSource}
            />
            <div className="flex items-center gap-2">
              {profileSource === 'demo' ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs border-amber-300 dark:border-amber-700 text-amber-700 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-950/40"
                  onClick={handleResetDemo}
                  leftIcon={<RotateCcw className="h-3 w-3" />}
                >
                  Reset Demo
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs text-amber-600 hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/40"
                  onClick={applyDemoSource}
                  leftIcon={<Sparkles className="h-3 w-3" />}
                >
                  Load Demo Profile
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={handleSwitchSource}
              >
                Change Source
              </Button>
            </div>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 gap-2 pt-4">
            <button
              onClick={() => setActiveInputTab('form')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                activeInputTab === 'form'
                  ? 'border-[#0a66c2] text-[#0a66c2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              Manual Profile Form (Recommended)
            </button>

            <button
              onClick={() => setActiveInputTab('url')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                activeInputTab === 'url'
                  ? 'border-[#0a66c2] text-[#0a66c2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LinkIcon className="h-3.5 w-3.5" />
              LinkedIn Profile URL
            </button>

            <button
              onClick={() => setActiveInputTab('pdf')}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold border-b-2 transition-all ${
                activeInputTab === 'pdf'
                  ? 'border-[#0a66c2] text-[#0a66c2]'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Upload className="h-3.5 w-3.5" />
              Upload PDF Resume
            </button>
          </div>
        </CardHeader>

        <CardContent className="pt-2 space-y-5">
          {/* TAB 1: MANUAL PROFILE FORM */}
          {activeInputTab === 'form' && (
            <div className="space-y-5">
              {/* Target Role Selector */}
              <div>
                <JobRoleSelector
                  label="Target Job Role / Specialty"
                  value={targetRole}
                  onChange={(role) => setTargetRole(role)}
                  error={errors.targetRole}
                  hint="The analyzer compares your keywords against hiring benchmarks for this specific position."
                />
              </div>

              {/* Career Goal Selector (3 Selectable Paths) */}
              <div className="p-3.5 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-950/60 dark:bg-blue-950/20 space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#0a66c2]" />
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">
                      What is your career goal?
                    </span>
                  </div>
                  {isRoleDivergent && (
                    <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                      Target role differs from profile
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
                  {/* Option A: Continue in My Current Career */}
                  <button
                    type="button"
                    onClick={() => setCareerIntent('current-field')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                      careerIntent === 'current-field'
                        ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-2 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          Continue in My Current Career
                        </span>
                        {careerIntent === 'current-field' && (
                          <span className="h-4 w-4 rounded-full bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                        Optimize my profile for opportunities in my existing field, emphasizing relevant experience, skills, specialization, and career progression.
                      </p>
                    </div>
                  </button>

                  {/* Option B: Transition to a New Career */}
                  <button
                    type="button"
                    onClick={() => setCareerIntent('career-switcher')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                      careerIntent === 'career-switcher'
                        ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-2 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          Transition to a New Career
                        </span>
                        {careerIntent === 'career-switcher' && (
                          <span className="h-4 w-4 rounded-full bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                        Help me move into a different career by identifying transferable skills, relevant learning opportunities, and ways to communicate my career transition.
                      </p>
                    </div>
                  </button>

                  {/* Option C: Explore a Related Role */}
                  <button
                    type="button"
                    onClick={() => setCareerIntent('related-role')}
                    className={`p-3 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                      careerIntent === 'related-role'
                        ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-2 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                        : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-700'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <span className="font-bold text-xs text-slate-900 dark:text-slate-100">
                          Explore a Related Role
                        </span>
                        {careerIntent === 'related-role' && (
                          <span className="h-4 w-4 rounded-full bg-[#0a66c2] text-white flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 font-normal leading-relaxed">
                        Help me target a related specialization or adjacent role by connecting my existing experience and skills with the requirements of the new position.
                      </p>
                    </div>
                  </button>
                </div>
              </div>

              {/* Headline */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    LinkedIn Headline
                  </label>
                  <span
                    className={`text-xs ${
                      headline.length > 220 ? 'text-red-500 font-bold' : 'text-slate-400'
                    }`}
                  >
                    {headline.length} / 220 characters
                  </span>
                </div>
                <Input
                  value={headline}
                  onChange={(e) => {
                    setHeadline(e.target.value)
                    if (errors.headline) setErrors((prev) => ({ ...prev, headline: undefined }))
                  }}
                  error={errors.headline}
                  placeholder="e.g. Senior Full-Stack Engineer | React, Node.js & TypeScript | Building High-Scale B2B SaaS"
                />
              </div>

              {/* About Section */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                    About / Summary Section
                  </label>
                  <span className="text-xs text-slate-400">
                    {about.trim() ? about.trim().split(/\s+/).length : 0} words
                  </span>
                </div>
                <Textarea
                  value={about}
                  onChange={(e) => {
                    setAbout(e.target.value)
                    if (errors.about) setErrors((prev) => ({ ...prev, about: undefined }))
                  }}
                  error={errors.about}
                  rows={4}
                  placeholder="Paste your career summary. Include your background, key technical achievements, and an invitation to connect..."
                />
              </div>

              {/* Experience Section */}
              <div className="space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                      Work Experience (Optional)
                    </label>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Empty experience is permitted and will not block the audit or penalize freshers.
                    </p>
                  </div>
                  {experienceStatus === 'present' && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleAddExperience}
                      leftIcon={<Plus className="h-3.5 w-3.5" />}
                    >
                      Add Experience
                    </Button>
                  )}
                </div>

                {/* Experience Status Selection */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setExperienceStatus('present')}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      experienceStatus === 'present'
                        ? 'border-[#0a66c2] bg-blue-50/60 dark:bg-blue-900/30 text-[#0a66c2] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Briefcase className="h-4 w-4 shrink-0" />
                    <span>I Have Work Experience</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExperienceStatus('fresher')
                      setErrors((prev) => ({ ...prev, experience: undefined }))
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      experienceStatus === 'fresher'
                        ? 'border-[#0a66c2] bg-blue-50/60 dark:bg-blue-900/30 text-[#0a66c2] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <GraduationCap className="h-4 w-4 shrink-0" />
                    <span>Fresher / Student (No Exp.)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setExperienceStatus('unavailable')
                      setErrors((prev) => ({ ...prev, experience: undefined }))
                    }}
                    className={`flex items-center gap-2 p-2.5 rounded-lg border text-xs font-semibold transition-all ${
                      experienceStatus === 'unavailable'
                        ? 'border-[#0a66c2] bg-blue-50/60 dark:bg-blue-900/30 text-[#0a66c2] shadow-xs'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Info className="h-4 w-4 shrink-0" />
                    <span>Data Unavailable / Skip</span>
                  </button>
                </div>

                {/* Fresher Mode Banner & Optional Fields */}
                {experienceStatus === 'fresher' && (
                  <div className="rounded-xl border border-blue-100 bg-blue-50/60 dark:border-blue-900/40 dark:bg-blue-950/20 p-4 space-y-3 text-xs">
                    <div className="flex items-center gap-2 font-bold text-blue-900 dark:text-blue-300">
                      <GraduationCap className="h-4 w-4 text-[#0a66c2]" />
                      <span>Early Career / Fresher Mode Active</span>
                    </div>
                    <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
                      Zero commercial experience will not penalize your profile score. Your audit is evaluated on educational foundations, technical skills, and practical projects.
                    </p>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Education / Degree (Optional)
                        </label>
                        <Input
                          placeholder="e.g. B.S. Computer Science, 2026"
                          value={education}
                          onChange={(e) => setEducation(e.target.value)}
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                          Projects / Capstone (Optional)
                        </label>
                        <Input
                          placeholder="e.g. Full-Stack E-commerce App, GitHub portfolio"
                          value={projects}
                          onChange={(e) => setProjects(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Unavailable Mode Banner */}
                {experienceStatus === 'unavailable' && (
                  <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 p-4 text-xs space-y-1.5">
                    <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-slate-200">
                      <Info className="h-4 w-4 text-slate-500" />
                      <span>Experience Section Omitted / Unavailable</span>
                    </div>
                    <p className="text-slate-500 dark:text-slate-400 leading-relaxed">
                      Experience is optional. Your audit will assess Headline, About, and Skills without penalizing your score for missing work history.
                    </p>
                  </div>
                )}

                {errors.experience && (
                  <p className="text-xs text-red-500 font-medium">
                    {errors.experience}
                  </p>
                )}

                {/* Experience Roles List (if in present mode) */}
                {experienceStatus === 'present' && (
                  <div className="space-y-3">
                    {experience.length === 0 && (
                      <div className="p-4 rounded-xl border border-dashed border-slate-200 dark:border-slate-800 text-center py-6 text-xs text-slate-500">
                        <p className="font-semibold text-slate-700 dark:text-slate-300">
                          No work experience roles added (Optional)
                        </p>
                        <p className="text-slate-400 mt-1">
                          You can run the audit with experience blank, add roles with the button above, or select Fresher mode.
                        </p>
                      </div>
                    )}
                    {experience.map((exp, index) => (
                      <div
                        key={exp.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 dark:border-slate-800 dark:bg-slate-800/40 space-y-3"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-500">
                          Role #{index + 1}
                        </span>
                        {experience.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleRemoveExperience(exp.id)}
                            className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                          >
                            <Trash2 className="h-3.5 w-3.5" /> Remove
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <Input
                          placeholder="Job Title (e.g. Senior Engineer)"
                          value={exp.title}
                          onChange={(e) =>
                            handleUpdateExperience(exp.id, 'title', e.target.value)
                          }
                        />
                        <Input
                          placeholder="Company (e.g. TechCorp)"
                          value={exp.company}
                          onChange={(e) =>
                            handleUpdateExperience(exp.id, 'company', e.target.value)
                          }
                        />
                        <Input
                          placeholder="Duration (e.g. 2021 - Present)"
                          value={exp.duration}
                          onChange={(e) =>
                            handleUpdateExperience(exp.id, 'duration', e.target.value)
                          }
                        />
                      </div>

                      <Textarea
                        placeholder="Bullet points and achievements (e.g. Architected microservices, reduced latency by 35%)..."
                        rows={2}
                        value={exp.description}
                        onChange={(e) =>
                          handleUpdateExperience(
                            exp.id,
                            'description',
                            e.target.value
                          )
                        }
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

              {/* Skills Tags */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                  Skills & Endorsements ({skills.length})
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Type a skill and press Add (e.g. TypeScript)"
                    value={newSkillInput}
                    onChange={(e) => setNewSkillInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        handleAddSkill()
                      }
                    }}
                    error={errors.skills}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => handleAddSkill()}
                  >
                    Add
                  </Button>
                </div>

                {/* Skill Badges */}
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {skills.map((skill) => (
                    <span
                      key={skill}
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-50 text-[#0a66c2] text-xs font-semibold dark:bg-blue-950/40 dark:text-blue-300"
                    >
                      {skill}
                      <button
                        type="button"
                        onClick={() => handleRemoveSkill(skill)}
                        className="hover:text-red-500 ml-1 text-slate-400"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>

                {/* Taxonomy quick suggestions */}
                {targetRole && getRoleTaxonomy(targetRole) && (
                  <div className="pt-2">
                    <span className="text-[11px] text-slate-400 font-semibold block mb-1">
                      Quick suggestions for {targetRole}:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {getRoleTaxonomy(targetRole).recommendedSkills.filter(
                        (rec) =>
                          !skills.some(
                            (s) => s.toLowerCase() === rec.toLowerCase()
                          )
                      )
                        .slice(0, 8)
                        .map((rec) => (
                          <button
                            key={rec}
                            type="button"
                            onClick={() => handleAddSkill(rec)}
                            className="text-[10px] font-medium px-2 py-0.5 rounded-full border border-dashed border-slate-300 text-slate-600 hover:border-[#0a66c2] hover:text-[#0a66c2] dark:border-slate-700 dark:text-slate-300 transition-colors"
                          >
                            + {rec}
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: LINKEDIN PROFILE URL & OFFICIAL FETCH */}
          {activeInputTab === 'url' && (
            <div className="space-y-6">
              {/* LinkedIn Account Connection Bar */}
              <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-[#0a66c2]/10 text-[#0a66c2] flex items-center justify-center shrink-0">
                    <Linkedin className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Official LinkedIn Account
                      </span>
                      {linkedInStatus?.isConnected ? (
                        <Badge variant="success" size="sm" className="text-[10px]">
                          Connected
                        </Badge>
                      ) : (
                        <Badge variant="default" size="sm" className="text-[10px]">
                          Not Connected
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {linkedInStatus?.isConnected
                        ? `Authorized as ${linkedInStatus.memberName} (${linkedInStatus.memberEmail || 'OAuth Token Active'})`
                        : 'Connect your account in Settings to enable direct 1-click profile retrieval.'}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2">
                  {linkedInStatus?.isConnected ? (
                    <Button
                      type="button"
                      variant="primary"
                      size="sm"
                      onClick={handleFetchMyProfile}
                      isLoading={isFetchingProfile}
                      leftIcon={<Linkedin className="h-3.5 w-3.5" />}
                    >
                      Fetch My LinkedIn Profile
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => navigate('/settings')}
                    >
                      Connect in Settings
                    </Button>
                  )}
                </div>
              </div>

              {/* Profile URL Input */}
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300 block">
                  Public LinkedIn Profile URL
                </label>
                <div className="flex gap-2">
                  <Input
                    placeholder="https://www.linkedin.com/in/your-username"
                    value={profileUrl}
                    onChange={(e) => {
                      setProfileUrl(e.target.value)
                      if (errors.profileUrl)
                        setErrors((prev) => ({ ...prev, profileUrl: undefined }))
                    }}
                    error={errors.profileUrl}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    onClick={handleFetchFromUrl}
                    isLoading={isFetchingProfile}
                    leftIcon={<LinkIcon className="h-4 w-4" />}
                  >
                    Fetch Profile from URL
                  </Button>
                </div>
                <p className="text-xs text-slate-400">
                  Example format: <code className="text-slate-600 dark:text-slate-300">https://www.linkedin.com/in/alex-rivera-123</code>
                </p>
              </div>

              {/* Third-Party Restriction Warning Banner */}
              {thirdPartyWarning && (
                <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-4 text-xs text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <div className="space-y-1">
                      <p className="font-bold text-sm text-amber-950 dark:text-amber-100">
                        Third-Party Profile Privacy Notice
                      </p>
                      <p className="leading-relaxed">
                        The requested URL (<code className="font-mono bg-amber-100/70 dark:bg-amber-900/50 px-1 py-0.5 rounded">{thirdPartyWarning.requestedUrl}</code>) does not match your currently authenticated LinkedIn account {thirdPartyWarning.authenticatedMember?.name ? `(${thirdPartyWarning.authenticatedMember.name})` : ''}.
                      </p>
                      <p className="leading-relaxed">
                        Under LinkedIn's official OAuth 2.0 and API privacy guidelines, applications cannot access or scrape private resume data of other members without their explicit authorization.
                      </p>
                    </div>
                  </div>

                  <div className="pt-2 border-t border-amber-200/60 dark:border-amber-800/60 flex flex-wrap items-center gap-3">
                    <span className="font-semibold text-amber-900 dark:text-amber-200">
                      Recommended Alternative:
                    </span>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-8 text-xs bg-white dark:bg-slate-900"
                      onClick={() => setActiveInputTab('form')}
                    >
                      Paste Text in Manual Form
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="h-8 text-xs text-amber-900 hover:bg-amber-100 dark:text-amber-200 dark:hover:bg-amber-900/40"
                      onClick={handleLoadSample}
                    >
                      Pre-fill Sample Profile
                    </Button>
                  </div>
                </div>
              )}

              {/* Authorized Profile Data Summary Card */}
              {fetchedProfileInfo?.profile && (
                <div className="rounded-xl border border-blue-200 bg-blue-50/50 dark:border-blue-900/50 dark:bg-blue-950/20 p-4 space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ShieldCheck className="h-5 w-5 text-[#0a66c2]" />
                      <span className="text-sm font-bold text-slate-900 dark:text-white">
                        Authorized LinkedIn Data Retrieved
                      </span>
                    </div>
                    <Badge variant="linkedin" size="sm">
                      Official OIDC Sync
                    </Badge>
                  </div>

                  {/* Profile Card Header */}
                  <div className="flex items-center gap-3.5 bg-white dark:bg-slate-800/80 p-3.5 rounded-lg border border-slate-100 dark:border-slate-700">
                    {fetchedProfileInfo.profile.picture ? (
                      <img
                        src={fetchedProfileInfo.profile.picture}
                        alt={fetchedProfileInfo.profile.fullName || 'Member Profile'}
                        className="h-12 w-12 rounded-full object-cover border border-slate-200 dark:border-slate-700 shadow-xs"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-blue-100 dark:bg-slate-700 flex items-center justify-center text-blue-700 dark:text-blue-300 font-bold text-base">
                        {fetchedProfileInfo.profile.fullName
                          ? fetchedProfileInfo.profile.fullName.charAt(0)
                          : 'U'}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                        {fetchedProfileInfo.profile.fullName || 'Authorized Member'}
                      </p>
                      {fetchedProfileInfo.profile.email && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                          {fetchedProfileInfo.profile.email}
                        </p>
                      )}
                      {fetchedProfileInfo.profile.profileUrl && (
                        <a
                          href={fetchedProfileInfo.profile.profileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-[#0a66c2] hover:underline truncate block"
                        >
                          {fetchedProfileInfo.profile.profileUrl}
                        </a>
                      )}
                    </div>
                  </div>

                  {/* Retrieved vs Missing Fields Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-emerald-100 dark:border-emerald-900/40">
                      <div className="flex items-center gap-1.5 font-bold text-emerald-700 dark:text-emerald-400 mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span>Retrieved via Official API:</span>
                      </div>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                        {fetchedProfileInfo.availableFields.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            <span className="capitalize">{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="p-3 bg-white dark:bg-slate-800 rounded-lg border border-amber-100 dark:border-amber-900/40">
                      <div className="flex items-center gap-1.5 font-bold text-amber-700 dark:text-amber-400 mb-2">
                        <Info className="h-4 w-4" />
                        <span>Restricted by LinkedIn API:</span>
                      </div>
                      <ul className="space-y-1 text-slate-600 dark:text-slate-300">
                        {fetchedProfileInfo.missingFields.map((f) => (
                          <li key={f} className="flex items-center gap-1.5">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            <span className="capitalize">{f}</span>
                            <span className="text-[10px] text-slate-400">(Manual review required)</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  {/* API Privacy limitations callout */}
                  <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-800 flex items-start justify-between gap-2">
                    <p className="leading-relaxed">
                      <strong>API Privacy Transparency:</strong> {fetchedProfileInfo.limitationsNotice || 'LinkedIn restricts headline, about, and experience access to Enterprise Talent accounts. Review and complete the remaining fields below to perform your algorithmic audit.'}
                    </p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="shrink-0 h-7 text-[11px] text-[#0a66c2]"
                      onClick={handlePreFillMissingFields}
                    >
                      Pre-fill Sample Data
                    </Button>
                  </div>
                </div>
              )}

              {/* Review & Complete Remaining Fields Form */}
              <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                    Review & Complete Profile Details for Audit
                  </h3>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-[#0a66c2]"
                    onClick={handlePreFillMissingFields}
                  >
                    Quick-fill Sample
                  </Button>
                </div>

                <div>
                  <JobRoleSelector
                    label="Target Job Role / Specialty"
                    value={targetRole}
                    onChange={(role) => setTargetRole(role)}
                    error={errors.targetRole}
                  />
                </div>

                {/* Career Goal Selector in URL Tab */}
                <div className="p-3 rounded-xl border border-blue-100 bg-blue-50/50 dark:border-blue-950/60 dark:bg-blue-950/20 space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-[#0a66c2]" />
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                        What is your career goal?
                      </span>
                    </div>
                    {isRoleDivergent && (
                      <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-900">
                        Target role differs from profile
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setCareerIntent('current-field')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                        careerIntent === 'current-field'
                          ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-1 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold">Continue Current Career</span>
                        {careerIntent === 'current-field' && <Check className="w-3 h-3 text-[#0a66c2]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Advance in existing field with seniority & progression.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCareerIntent('career-switcher')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                        careerIntent === 'career-switcher'
                          ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-1 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold">Transition to New Career</span>
                        {careerIntent === 'career-switcher' && <Check className="w-3 h-3 text-[#0a66c2]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Move to a different career with transferable skills.
                      </p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setCareerIntent('related-role')}
                      className={`p-2.5 rounded-lg border text-left text-xs transition-all flex flex-col justify-between ${
                        careerIntent === 'related-role'
                          ? 'border-[#0a66c2] bg-white dark:bg-slate-800 shadow-sm ring-1 ring-[#0a66c2]/30 text-slate-900 dark:text-white font-semibold'
                          : 'border-slate-200 dark:border-slate-800 bg-white/70 dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="font-bold">Explore a Related Role</span>
                        {careerIntent === 'related-role' && <Check className="w-3 h-3 text-[#0a66c2]" />}
                      </div>
                      <p className="text-[10px] text-slate-500 font-normal">
                        Target an adjacent role or specialization.
                      </p>
                    </button>
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      Headline
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {headline.length} / 220
                    </span>
                  </div>
                  <Input
                    value={headline}
                    onChange={(e) => {
                      setHeadline(e.target.value)
                      if (errors.headline) setErrors((prev) => ({ ...prev, headline: undefined }))
                    }}
                    error={errors.headline}
                    placeholder="e.g. Senior Software Engineer | React, Node.js & TypeScript"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                      About / Career Summary
                    </label>
                    <span className="text-[11px] text-slate-400">
                      {about.trim() ? about.trim().split(/\s+/).length : 0} words
                    </span>
                  </div>
                  <Textarea
                    value={about}
                    onChange={(e) => {
                      setAbout(e.target.value)
                      if (errors.about) setErrors((prev) => ({ ...prev, about: undefined }))
                    }}
                    error={errors.about}
                    rows={3}
                    placeholder="Paste or write your LinkedIn summary here..."
                  />
                </div>

                {/* Experience & Skills summary in URL tab */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-900/30 text-xs gap-3">
                  <div>
                    <span className="font-semibold text-slate-800 dark:text-slate-200">
                      Experience: {experience.length > 0 ? `${experience.length} roles` : experienceStatus === 'fresher' ? 'Fresher (0 roles - Optional)' : 'Unavailable (Optional)'} · Skills: {skills.length} tags
                    </span>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Experience is optional: an empty experience section will not block the audit or penalize freshers.
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => setActiveInputTab('form')}
                  >
                    Edit All in Manual Form
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: RESUME / PDF UPLOAD */}
          {activeInputTab === 'pdf' && (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-[#0a66c2] transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/50">
                <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  {uploadedFileName || 'Drop your LinkedIn PDF export or Resume here'}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  Supports PDF up to 10MB (LinkedIn: Profile → More → Save to PDF)
                </p>
                <input
                  type="file"
                  accept="application/pdf"
                  className="hidden"
                  id="pdf-upload-input"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      setUploadedFileName(e.target.files[0].name)
                      handleLoadSample()
                      success('Resume Uploaded', `Extracted structure from ${e.target.files[0].name}`)
                    }
                  }}
                />
                <label
                  htmlFor="pdf-upload-input"
                  className="mt-4 inline-block px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold cursor-pointer hover:bg-slate-50 shadow-xs"
                >
                  Browse Files
                </label>
              </div>
              <p className="text-xs text-slate-500 text-center">
                PDF text extraction automatically maps headline, summary, and experience to the manual editor.
              </p>
            </div>
          )}

          {/* Target Tone Selection & Analyze Button */}
          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Target Tone:
              </span>
              {[
                { id: 'recruiter', label: '🧲 Recruiter Magnet' },
                { id: 'thought-leader', label: '💡 Thought Leader' },
                { id: 'tech', label: '⚡ Tech Authority' },
                { id: 'founder', label: '🚀 Builder/Founder' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleToneChange(t.id as OptimizationTone)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                    targetTone === t.id
                      ? 'bg-blue-50 text-[#0a66c2] border border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-800 shadow-xs'
                      : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            <Button
              size="lg"
              onClick={() => handleRunAudit()}
              isLoading={isAuditing}
              leftIcon={<Sparkles className="h-4 w-4" />}
            >
              Run Profile Audit
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* ─────────────────────────────────────────────────────────────
          SECTION 2: AUDIT SCORE & CATEGORY EXPLANATIONS
      ───────────────────────────────────────────────────────────── */}
      {analysisResult && (
        <div className="space-y-6 animate-slide-up">
          {/* AI vs Heuristic Operational Status Banner */}
          {analysisResult.isAiPowered ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3.5 text-xs text-emerald-900 dark:border-emerald-800/60 dark:bg-emerald-950/30 dark:text-emerald-300 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-emerald-600 shrink-0" />
                <span>
                  <strong>Live AI Synthesis Active:</strong> High-impact rewrites and keyword suggestions generated live via <span className="font-mono font-semibold">{analysisResult.engineUsed}</span> with strict anti-fabrication constraints.
                </span>
              </div>
              <Badge variant="success" size="sm" className="shrink-0 text-[10px]">
                Real AI Generated
              </Badge>
            </div>
          ) : analysisResult.fallbackReason ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-3.5 text-xs text-amber-900 dark:border-amber-800/60 dark:bg-amber-950/30 dark:text-amber-300 flex items-center justify-between gap-3 shadow-xs">
              <div className="flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-amber-600 shrink-0" />
                <span>
                  <strong>AI Unavailable (Fallback Engaged):</strong> {analysisResult.fallbackReason}. Suggestions generated deterministically via the built-in Heuristic Analyzer.
                </span>
              </div>
              <Badge variant="warning" size="sm" className="shrink-0 text-[10px]">
                Heuristic Fallback
              </Badge>
            </div>
          ) : null}

          {/* Transparent Score Disclaimer Alert */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3.5 text-xs text-blue-900 dark:border-slate-700 dark:bg-slate-800/40 dark:text-blue-300 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#0a66c2] shrink-0" />
              <span>
                <strong>Algorithmic Heuristic Score (0-100):</strong> Independent talent acquisition benchmark analyzing clarity, keyword density, and quantifiable outcomes. Not an official LinkedIn score.
              </span>
            </div>
            <Badge variant="linkedin" size="sm" className="shrink-0 text-[10px]">
              {analysisResult.engineUsed}
            </Badge>
          </div>

          {/* Overall Score Header Card */}
          <Card className="bg-gradient-to-br from-blue-50/80 to-indigo-50/40 dark:from-slate-800 dark:to-slate-800/50 border-blue-100 dark:border-slate-700 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#0a66c2] dark:text-blue-400">
                    Overall Profile Strength
                  </span>
                  <div className="mt-2 flex items-baseline gap-3">
                    <span className="text-5xl font-black text-slate-900 dark:text-white">
                      {analysisResult.overallScore}
                    </span>
                    <span className="text-base font-bold text-slate-400">
                      / 100
                    </span>
                    <Badge
                      variant={
                        analysisResult.overallScore >= 80
                          ? 'success'
                          : analysisResult.overallScore >= 60
                          ? 'warning'
                          : 'error'
                      }
                      size="md"
                    >
                      {analysisResult.overallRating}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-300 mt-2 max-w-xl leading-relaxed">
                    {analysisResult.summary}
                  </p>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-2.5 flex items-center gap-1.5 font-medium">
                    <ShieldCheck className="h-3.5 w-3.5 text-[#0a66c2]" />
                    <span>Audited by LinkedPulse &middot; Based on algorithmic recruiter heuristics, not an official LinkedIn metric.</span>
                  </p>
                </div>

                <div className="shrink-0 flex flex-col gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRunAudit()}
                    leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
                  >
                    Re-run Analysis
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 5 Individual Category Score Breakdown with Positive & Deduction Explanations */}
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white mb-3">
              Category Breakdown & Score Explanations
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Object.entries(analysisResult.categories).map(([catKey, cat]) => (
                <Card
                  key={catKey}
                  className="hover:border-[#0a66c2]/40 transition-all shadow-xs"
                >
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                        {cat.name}
                      </span>
                      <Badge
                        variant={
                          cat.score >= 80
                            ? 'success'
                            : cat.score >= 60
                            ? 'warning'
                            : 'error'
                        }
                        size="sm"
                      >
                        {cat.score}/100
                      </Badge>
                    </div>

                    <div className="mt-2.5">
                      <div className="h-1.5 w-full rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            cat.score >= 80
                              ? 'bg-emerald-500'
                              : cat.score >= 60
                              ? 'bg-amber-500'
                              : 'bg-red-500'
                          }`}
                          style={{ width: `${cat.score}%` }}
                        />
                      </div>
                    </div>

                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 leading-relaxed">
                      {cat.feedback}
                    </p>

                    {/* Expand/Collapse Explanation details */}
                    <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                      <button
                        type="button"
                        onClick={() => toggleCategoryExpand(catKey)}
                        className="flex items-center justify-between w-full text-[11px] font-bold text-[#0a66c2] dark:text-blue-400"
                      >
                        <span>
                          {expandedCategories[catKey]
                            ? 'Hide Score Factors'
                            : 'View Why This Score'}
                        </span>
                        {expandedCategories[catKey] ? (
                          <ChevronUp className="h-3 w-3" />
                        ) : (
                          <ChevronDown className="h-3 w-3" />
                        )}
                      </button>

                      {expandedCategories[catKey] && (
                        <div className="mt-2 space-y-2 text-[11px] animate-fade-in">
                          {cat.positiveFactors.length > 0 && (
                            <div>
                              <span className="font-semibold text-emerald-600 block mb-1">
                                Positive Factors (+ Points):
                              </span>
                              <ul className="space-y-1">
                                {cat.positiveFactors.map((pos, i) => (
                                  <li
                                    key={i}
                                    className="text-slate-600 dark:text-slate-300 flex items-start gap-1.5"
                                  >
                                    <Check className="h-3 w-3 text-emerald-500 shrink-0 mt-0.5" />
                                    <span>{pos}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {cat.deductions.length > 0 && (
                            <div className="pt-1">
                              <span className="font-semibold text-red-500 block mb-1">
                                Deductions (- Points):
                              </span>
                              <ul className="space-y-1">
                                {cat.deductions.map((ded, i) => (
                                  <li
                                    key={i}
                                    className="text-slate-600 dark:text-slate-400 flex items-start gap-1.5"
                                  >
                                    <span className="h-1.5 w-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                                    <span>{ded}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 3: SIDE-BY-SIDE ORIGINAL VS IMPROVED SECTIONS
          ───────────────────────────────────────────────────────────── */}
          <div className="space-y-4 pt-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">
                  Profile Improvements (Side-by-Side)
                </h2>
                <p className="text-xs text-slate-500">
                  Compare your original copy against recruiter-optimized rewrites. Edit, copy, or regenerate in any tone.
                </p>
              </div>

              {/* Tone Quick Re-generator */}
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-slate-400">Tone:</span>
                {(['recruiter', 'thought-leader', 'tech', 'founder'] as OptimizationTone[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleToneChange(t)}
                    className={`px-2 py-1 rounded text-xs font-bold capitalize transition-all ${
                      targetTone === t
                        ? 'bg-[#0a66c2] text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {t.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>

            {/* Section Navigation Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-800 gap-1 overflow-x-auto pb-1">
              {(['headline', 'about', 'experience', 'skills'] as SectionType[]).map(
                (sec) => {
                  const section = analysisResult.improvements[sec]
                  return (
                    <button
                      key={sec}
                      type="button"
                      onClick={() => {
                        setActiveSection(sec)
                        setEditingSection(null)
                      }}
                      className={`flex items-center gap-2 px-4 py-3 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${
                        activeSection === sec
                          ? 'border-[#0a66c2] text-[#0a66c2] dark:text-blue-400'
                          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
                      }`}
                    >
                      <span>{section.name}</span>
                      <span className="rounded-full bg-slate-100 dark:bg-slate-800 px-2 py-0.5 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                        {section.score}/100
                      </span>
                    </button>
                  )
                }
              )}
            </div>

            {/* Before vs After Cards */}
            {currentImprovement && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Original Section Card */}
                <Card className="border-slate-200 dark:border-slate-800">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 bg-slate-50/50 dark:bg-slate-900/50 rounded-t-xl">
                    <div>
                      <CardTitle className="text-sm font-bold text-slate-700 dark:text-slate-300">
                        Original {currentImprovement.name}
                      </CardTitle>
                      <span className="text-[11px] text-slate-400">
                        Before optimization audit
                      </span>
                    </div>
                    <Badge variant="error" size="sm">
                      Original
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-5">
                    <div className="rounded-lg bg-slate-50 dark:bg-slate-900/80 p-4 border border-slate-200/60 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap min-h-[140px]">
                      {currentImprovement.original || 'None provided'}
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                      <span className="text-[11px] text-slate-400">
                        {currentImprovement.original
                          ? 'Original profile content preserved'
                          : 'Section was empty'}
                      </span>
                      {originalBackup[activeSection as 'headline' | 'about'] && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleRevertOriginal(activeSection)}
                          leftIcon={<RotateCcw className="h-3.5 w-3.5 text-blue-500" />}
                        >
                          Revert to Original
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* AI-Optimized Section Card */}
                <Card className="border-[#0a66c2]/40 shadow-md">
                  <CardHeader className="flex flex-row items-center justify-between pb-3 bg-blue-50/40 dark:bg-blue-950/20 rounded-t-xl border-b border-[#0a66c2]/20">
                    <div className="flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-[#0a66c2]" />
                      <div>
                        <CardTitle className="text-sm font-bold text-slate-900 dark:text-white">
                          Optimized {currentImprovement.name}
                        </CardTitle>
                        <span className="text-[11px] text-slate-500">
                          {targetTone.replace('-', ' ')} formulation
                        </span>
                      </div>
                    </div>
                    <Badge variant="success" size="sm">
                      {currentImprovement.score}/100 Score
                    </Badge>
                  </CardHeader>
                  <CardContent className="p-5">
                    {editingSection === activeSection ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          rows={6}
                          className="text-xs leading-relaxed"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSection(null)}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => handleSaveEdit(activeSection)}
                          >
                            Save Changes
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-blue-50/30 dark:bg-blue-950/10 p-4 border border-blue-200/50 dark:border-blue-900/40 text-xs text-slate-900 dark:text-slate-100 leading-relaxed whitespace-pre-wrap min-h-[140px]">
                        {currentImprovement.optimized}
                      </div>
                    )}

                    {/* Specific Applied Suggestions Checklist */}
                    <div className="mt-4">
                      <span className="text-xs font-bold text-slate-500 dark:text-slate-400 block mb-2">
                        Enhancements Applied:
                      </span>
                      <div className="space-y-1.5">
                        {currentImprovement.suggestions.map((sug, idx) => (
                          <div
                            key={idx}
                            className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300"
                          >
                            <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                            <span>{sug}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Copy, Apply, and Edit Actions */}
                    <div className="mt-5 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStartEdit(
                              activeSection,
                              currentImprovement.optimized
                            )
                          }
                          leftIcon={<Edit3 className="h-3.5 w-3.5" />}
                        >
                          Edit Copy
                        </Button>

                        {(activeSection === 'headline' || activeSection === 'about') && (
                          <Button
                            size="sm"
                            variant="secondary"
                            onClick={() =>
                              handleApplyToEditor(
                                activeSection,
                                currentImprovement.optimized
                              )
                            }
                            leftIcon={<Sparkles className="h-3.5 w-3.5 text-[#0a66c2]" />}
                          >
                            Apply to Form Editor
                          </Button>
                        )}
                      </div>

                      <Button
                        size="sm"
                        onClick={() =>
                          handleCopy(
                            currentImprovement.optimized,
                            currentImprovement.name
                          )
                        }
                        leftIcon={
                          copiedSection === currentImprovement.name ? (
                            <Check className="h-3.5 w-3.5 text-emerald-300" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )
                        }
                      >
                        {copiedSection === currentImprovement.name
                          ? 'Copied!'
                          : 'Copy to Clipboard'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </div>
            )}
          </div>

          {/* ─────────────────────────────────────────────────────────────
              SECTION 4: KEYWORD INSIGHTS & RECRUITER SEARCH BENCHMARKS
          ───────────────────────────────────────────────────────────── */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-bold flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-[#0a66c2]" />
                    Profile Skills vs Recruiter Hiring Benchmarks ({analysisResult.keywordInsights.targetRole})
                  </CardTitle>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Transparent comparison between your verified profile skills and standard market search queries
                  </p>
                </div>
                <Badge variant="linkedin" size="sm">
                  Density: {analysisResult.keywordInsights.searchDensityRating}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="pt-2 space-y-5">
              {/* 1. Verified Profile Skills */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                    Verified Skills in Your Profile ({skills.length} skills):
                  </span>
                  <span className="text-[11px] text-slate-400">
                    Existing profile data preserved
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {skills.length > 0 ? (
                    skills.map((skill, i) => {
                      const isMatched = analysisResult.keywordInsights.matchedKeywords.some(
                        (mk) => mk.toLowerCase() === skill.toLowerCase() || skill.toLowerCase().includes(mk.toLowerCase())
                      )
                      return (
                        <span
                          key={i}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border ${
                            isMatched
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800'
                              : 'bg-slate-50 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isMatched ? (
                            <Check className="h-3 w-3 text-emerald-600 dark:text-emerald-400" />
                          ) : (
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                          )}
                          {skill}
                          {isMatched && (
                            <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-200 px-1.5 py-0.2 rounded font-normal">
                              Matched
                            </span>
                          )}
                        </span>
                      )
                    })
                  ) : (
                    <span className="text-xs text-slate-400">
                      No skills listed in profile.
                    </span>
                  )}
                </div>
              </div>

              {/* 2. Target Role Transferable / Matched Skills */}
              {analysisResult.keywordInsights.matchedKeywords.length > 0 && (
                <div>
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 block mb-2">
                    Direct & Transferable Matches for {analysisResult.keywordInsights.targetRole}:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.keywordInsights.matchedKeywords.map((kw, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800 text-xs font-semibold"
                      >
                        <Check className="h-3 w-3 text-emerald-500" />
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 3. Recommended Market Benchmarks to Learn / Add Once Verified */}
              {analysisResult.keywordInsights.missingRecommendedKeywords.length > 0 && (
                <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-bold text-amber-700 dark:text-amber-400">
                      Recommended Market Benchmarks to Consider Adding:
                    </span>
                    <span className="text-[11px] text-slate-400">
                      Click to add only if practiced
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-2">
                    These are standard skills queried by recruiters for <strong>{analysisResult.keywordInsights.targetRole}</strong>. The audit does not claim you possess these; add them only once practiced in coursework, projects, or professional tasks.
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {analysisResult.keywordInsights.missingRecommendedKeywords.map(
                      (rec, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => {
                            handleAddSkill(rec)
                            handleRunAudit()
                          }}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-50 text-slate-700 border border-dashed border-slate-300 hover:border-[#0a66c2] hover:text-[#0a66c2] dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700 text-xs font-medium transition-colors"
                          title="Click to add to your verified profile skills"
                        >
                          + {rec}
                        </button>
                      )
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL 1: URL SCRAPING EXPLANATION MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isUrlModalOpen}
        onClose={() => setIsUrlModalOpen(false)}
        title="LinkedIn Profile URL Analysis"
        description="Transparent Information Regarding LinkedIn URL Retrieval"
      >
        <div className="space-y-4 pt-2">
          <div className="p-4 rounded-xl border border-blue-100 bg-blue-50/60 dark:border-slate-700 dark:bg-slate-800/40 text-xs leading-relaxed text-slate-700 dark:text-slate-300 space-y-2">
            <p className="font-bold text-slate-900 dark:text-white">
              Why automated direct profile scraping is restricted:
            </p>
            <p>
              1. <strong>CORS & Security Policies:</strong> LinkedIn restricts automated third-party browser requests to protect user account data.
            </p>
            <p>
              2. <strong>Zero Login Risk:</strong> We never ask for your LinkedIn login password or run risky headless browser scraping that could trigger account safety warnings.
            </p>
            <p>
              3. <strong>Immediate Solution:</strong> Simply paste your headline, about, and skills into our Manual Form. We have pre-filled sample developer information so you can run the audit immediately!
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsUrlModalOpen(false)}
            >
              Close
            </Button>
            <Button
              size="sm"
              onClick={() => {
                setIsUrlModalOpen(false)
                setActiveInputTab('form')
                handleLoadSample()
                handleRunAudit()
              }}
            >
              Pre-fill Sample & Run Audit
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          MODAL 2: AI PROVIDER ENGINE SETTINGS MODAL
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="AI Optimization Engine Architecture"
        description="Configure Server-Side OpenRouter AI or Offline Local Heuristic Mode"
      >
        <div className="space-y-4 pt-2 text-xs">
          {/* Active Engine Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-4 space-y-2 bg-slate-50/50 dark:bg-slate-800/40">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                <Cpu className="h-4 w-4 text-[#0a66c2]" />
                Selected Engine:
              </span>
              <Badge variant={engineMode === 'openrouter' ? 'linkedin' : 'default'} size="sm">
                {engineMode === 'openrouter' ? 'OpenRouter AI (Server)' : 'Heuristic Engine (Local)'}
              </Badge>
            </div>
            <p className="text-slate-600 dark:text-slate-300 leading-relaxed">
              When <strong>OpenRouter AI</strong> is active, requests are routed to the secure Python backend which interacts with eligible free AI models using server-side credentials. If the server or model is congested, the system seamlessly falls back to the transparent local Heuristic Analyzer.
            </p>
          </div>

          {/* Server Backend Status Card */}
          <div className="rounded-xl border border-slate-200 dark:border-slate-700 p-3.5 space-y-2.5 bg-white dark:bg-slate-800/80">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                Backend AI Diagnostics:
              </span>
              <span className="inline-flex items-center gap-1 text-[11px] font-medium">
                {serverAiStatus?.status === 'ready' ? (
                  <span className="text-emerald-600 flex items-center gap-1">
                    <CheckCircle2 className="h-3 w-3" /> Server Online & Configured
                  </span>
                ) : serverAiStatus?.status === 'unconfigured' ? (
                  <span className="text-amber-500 flex items-center gap-1">
                    <AlertCircle className="h-3 w-3" /> Key Not Set in Server .env
                  </span>
                ) : (
                  <span className="text-slate-400 flex items-center gap-1">
                    <Info className="h-3 w-3" /> Backend Offline (Port 8000)
                  </span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px] bg-slate-50 dark:bg-slate-900/40 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-slate-400 block text-[10px]">Primary Free Model:</span>
                <span className="font-mono font-medium text-slate-700 dark:text-slate-300 truncate block">
                  {serverAiStatus?.model || 'meta-llama/llama-3.3-70b-instruct:free'}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Security Architecture:</span>
                <span className="text-emerald-600 dark:text-emerald-400 font-medium block">
                  Server-Side Secrets (Zero Client Leak)
                </span>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-normal">
              To configure your OpenRouter API key, add <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">OPENROUTER_API_KEY=...</code> into the server environment or <code className="px-1 py-0.5 rounded bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200">linkedin-optimizer/.env</code>.
            </p>
          </div>

          {/* Engine Mode Selection */}
          <div className="space-y-2">
            <label className="font-bold text-slate-800 dark:text-slate-200 block">
              Optimization Engine Preference:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setEngineModeState('openrouter')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  engineMode === 'openrouter'
                    ? 'border-[#0a66c2] bg-blue-50/50 dark:bg-blue-900/20 text-[#0a66c2]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between mb-1">
                  <span>OpenRouter AI</span>
                  {engineMode === 'openrouter' && <Check className="h-3.5 w-3.5" />}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  Free LLM synthesis via backend proxy with heuristic fallback
                </p>
              </button>

              <button
                type="button"
                onClick={() => setEngineModeState('heuristic')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  engineMode === 'heuristic'
                    ? 'border-[#0a66c2] bg-blue-50/50 dark:bg-blue-900/20 text-[#0a66c2]'
                    : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 text-slate-600 dark:text-slate-300'
                }`}
              >
                <div className="font-bold text-xs flex items-center justify-between mb-1">
                  <span>Heuristic Engine</span>
                  {engineMode === 'heuristic' && <Check className="h-3.5 w-3.5" />}
                </div>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-tight">
                  100% private in-browser analysis without external API calls
                </p>
              </button>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                const status = await checkServerAiStatus()
                setServerAiStatus(status)
                info('Status Refreshed', status.status === 'ready' ? 'Backend OpenRouter is ready.' : 'Checked backend status.')
              }}
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Check Server
            </Button>

            <Button
              size="sm"
              onClick={() => {
                setEnginePreference(engineMode)
                success('Preference Saved', `Active mode: ${engineMode === 'openrouter' ? 'OpenRouter AI' : 'Local Heuristic Engine'}`)
                setIsAiModalOpen(false)
              }}
            >
              Save Preferences
            </Button>
          </div>
        </div>
      </Modal>

      {/* ─────────────────────────────────────────────────────────────
          Phase 6: Audit History Modal
      ───────────────────────────────────────────────────────────── */}
      <Modal
        isOpen={isAuditHistoryOpen}
        onClose={() => setIsAuditHistoryOpen(false)}
        title="Profile Audit History"
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {auditHistory.length === 0 ? (
            <div className="text-center py-8 text-slate-500">
              <FileText className="h-10 w-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
              <p className="font-semibold text-slate-700 dark:text-slate-300">No Audits Saved Yet</p>
              <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                Run an algorithmic audit on your profile to automatically record transparent scores and optimization history here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {auditHistory.map((audit: any, idx: number) => {
                const dateStr = audit.createdAt
                  ? new Date(audit.createdAt).toLocaleString(undefined, {
                      dateStyle: 'medium',
                      timeStyle: 'short',
                    })
                  : 'Recent'
                const score = audit.overallScore ?? audit.score ?? 0
                const rating = audit.overallRating ?? 'Fair'
                const target = audit.targetRole || 'General'

                return (
                  <div
                    key={audit.id || idx}
                    className="p-3.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 hover:border-[#0a66c2]/40 transition-all flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-extrabold text-slate-900 dark:text-white">
                          {score}
                        </span>
                        <span className="text-xs text-slate-400">/100</span>
                        <Badge
                          variant={
                            score >= 85
                              ? 'success'
                              : score >= 70
                              ? 'info'
                              : score >= 55
                              ? 'warning'
                              : 'error'
                          }
                          size="sm"
                        >
                          {rating}
                        </Badge>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">{dateStr}</span>
                    </div>

                    <div className="text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-medium text-slate-900 dark:text-white">Target Role:</span>{' '}
                      {target}
                    </div>

                    {audit.summary && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                        {audit.summary}
                      </p>
                    )}

                    <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-700/60">
                      <span className="text-[10px] text-slate-400 font-medium">
                        Engine: {audit.engineUsed || 'Heuristic Analyzer'}
                      </span>
                      {audit.improvements && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 text-[11px] text-[#0a66c2] hover:bg-blue-50 dark:hover:bg-blue-950/40"
                          onClick={() => {
                            setAnalysisResult({
                              overallScore: audit.overallScore,
                              overallRating: audit.overallRating,
                              summary: audit.summary || '',
                              engineUsed: audit.engineUsed || 'Archived Audit',
                              isAiPowered: Boolean(audit.engineUsed?.includes('AI')),
                              categories: audit.categoryScores || audit.categories || {},
                              improvements: audit.improvements || {},
                              keywordInsights: audit.keywordInsights || {
                                existingUserSkills: skills,
                                matchedKeywords: [],
                                missingRecommendedKeywords: [],
                                searchDensityRating: 'Moderate',
                                targetRole: audit.targetRole || targetRole,
                              },
                              timestamp: audit.createdAt || new Date().toISOString(),
                            })
                            setIsAuditHistoryOpen(false)
                            success('Loaded Past Audit', `Viewing audit from ${dateStr}`)
                          }}
                        >
                          Load into View →
                        </Button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  )
}
