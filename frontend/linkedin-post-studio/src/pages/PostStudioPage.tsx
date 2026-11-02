import { useState, useRef, useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import {
  Upload,
  Sparkles,
  Image as ImageIcon,
  X,
  Copy,
  Check,
  Bookmark,
  Calendar,
  ThumbsUp,
  MessageSquare,
  Repeat2,
  Send,
  MoreHorizontal,
  Globe,
  AlertCircle,
  RefreshCw,
  Lightbulb,
  CheckCircle2,
  Eye,
  Hash,
  Linkedin,
  ExternalLink,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Badge } from '@/components/ui/Badge'
import { Textarea } from '@/components/ui/Textarea'
import { Input } from '@/components/ui/Input'
import { Modal } from '@/components/ui/Modal'
import { Skeleton } from '@/components/ui/Skeleton'
import { EmptyState } from '@/components/ui/EmptyState'
import { useToast } from '@/hooks/useToast'
import { useAuth } from '@/hooks/useAuth'
import { POST_TONES, ALLOWED_IMAGE_TYPES, MAX_IMAGE_SIZE_MB } from '@/lib/constants'
import {
  generatePostFromImage,
  getLinkedInStatus,
  publishToLinkedIn,
  type LinkedInStatusResponse,
  type PublishResponse,
} from '@/lib/api'
import { saveDraft } from '@/lib/draftsStore'
import type { PostTone, PostLength, Post } from '@/types'
import type { DemoStateMode } from '@/components/layout/AppLayout'

interface PostStudioPageProps {
  stateMode?: DemoStateMode
  onStateModeChange?: (mode: DemoStateMode) => void
}

export function PostStudioPage({ stateMode = 'normal', onStateModeChange }: PostStudioPageProps) {
  const { user } = useAuth()
  const { success, info, error } = useToast()
  const location = useLocation()
  const navigate = useNavigate()
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form Inputs
  const [imagePreview, setImagePreview] = useState<string | null>(
    'https://images.unsplash.com/photo-1551288049-bebda4e38f71?auto=format&fit=crop&w=800&q=80'
  )
  const [imageFileName, setImageFileName] = useState<string | null>('analytics-dashboard.png')
  const [contextNote, setContextNote] = useState(
    'Key metrics from our latest architecture rewrite: 70% decrease in latency and 1M API calls reached.'
  )
  const [tone, setTone] = useState<PostTone>('storytelling')
  const [length, setLength] = useState<PostLength>('medium')

  // Generated Post State
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationStep, setGenerationStep] = useState('')
  const [hasGenerated, setHasGenerated] = useState(true)
  const [copied, setCopied] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [isScheduleModalOpen, setIsScheduleModalOpen] = useState(false)
  const [scheduleDate, setScheduleDate] = useState('2026-10-24T09:00')
  const [activeDraftId, setActiveDraftId] = useState<string | null>(null)

  // LinkedIn Publishing State
  const [linkedInStatus, setLinkedInStatus] = useState<LinkedInStatusResponse | null>(null)
  const [isPublishModalOpen, setIsPublishModalOpen] = useState(false)
  const [isNotConnectedModalOpen, setIsNotConnectedModalOpen] = useState(false)
  const [isPublishing, setIsPublishing] = useState(false)
  const [includeImageInPost, setIncludeImageInPost] = useState(true)
  const [publishSuccessData, setPublishSuccessData] = useState<PublishResponse | null>(null)
  const [publishError, setPublishError] = useState<string | null>(null)

  // Load LinkedIn authorization status on mount
  useEffect(() => {
    getLinkedInStatus()
      .then((status) => setLinkedInStatus(status))
      .catch((err) => console.error('Failed to retrieve LinkedIn status:', err))
  }, [])

  // AI Generation Output & Anti-Hallucination Metadata
  const [visualSummary, setVisualSummary] = useState<string>(
    'Metrics dashboard showing low server response times and daily transaction throughput reaching 1M calls.'
  )
  const [alternativeHooks, setAlternativeHooks] = useState<string[]>([
    'We just hit 1,000,000 API calls per day. 🚀',
    'Most scalability bottlenecks aren\'t hardware problems — they are database access pattern problems.',
    'A year ago our system collapsed at 10K requests. Here is the architecture we rebuilt:',
  ])
  const [hashtags, setHashtags] = useState<string[]>([
    'SoftwareEngineering',
    'CloudArchitecture',
    'TechLeadership',
    'WebDev',
    'SystemDesign',
  ])
  const [aiMetadata, setAiMetadata] = useState<{
    engineUsed: string
    model: string
    isAiPowered: boolean
    fallbackReason?: string
  } | null>({
    engineUsed: 'OpenRouter AI (openrouter/free)',
    model: 'openrouter/free',
    isAiPowered: true,
  })

  // Post Content
  const [generatedContent, setGeneratedContent] = useState<string>(
    `We just hit 1,000,000 API calls per day. 🚀\n\nA year ago, our system could barely handle 10K.\n\nHere's what changed everything:\n\n→ We shifted from a monolith to decoupled event-driven services\n→ Implemented multi-tier caching that reduced database pressure by 70%\n→ Built resilient backpressure handling that stays calm under peak traffic\n\nThe biggest lesson? Scalability isn't just about throwing bigger servers at the problem. It's about respecting your data access patterns.\n\nBig shoutout to our engineering team for making this milestone happen.\n\nWhat's the #1 scalability mistake you've learned from?\n\n#SoftwareEngineering #CloudArchitecture #TechLeadership #WebDev #SystemDesign`
  )

  // Load draft passed from DraftsHistoryPage navigation
  useEffect(() => {
    if (location.state?.editPost) {
      const post = location.state.editPost as Post
      setGeneratedContent(post.content)
      if (post.tone) setTone(post.tone)
      if (post.length) setLength(post.length)
      if (post.imageUrl) setImagePreview(post.imageUrl)
      if (post.hashtags && post.hashtags.length > 0) setHashtags(post.hashtags)

      // Restore all alternative hooks if present on the saved draft
      if (post.alternativeHooks && Array.isArray(post.alternativeHooks) && post.alternativeHooks.length > 0) {
        setAlternativeHooks(post.alternativeHooks)
      } else {
        // Backward compatibility: older drafts do not contain alternativeHooks.
        // Safely provide empty array so UI shows clean empty state instead of faking hooks.
        setAlternativeHooks([])
      }

      // Restore visual summary if present
      if (post.visualSummary !== undefined) {
        setVisualSummary(post.visualSummary || '')
      }

      // Restore AI metadata if present without calling AI again
      if (post.isAiPowered !== undefined && post.isAiPowered !== null) {
        setAiMetadata({
          engineUsed: post.engineUsed || (post.isAiPowered ? 'OpenRouter AI' : 'Local Heuristic Engine'),
          model: post.engineUsed || '',
          isAiPowered: post.isAiPowered,
          fallbackReason: post.fallbackReason || undefined,
        })
      } else if (post.engineUsed) {
        setAiMetadata({
          engineUsed: post.engineUsed,
          model: post.engineUsed,
          isAiPowered: !post.fallbackReason,
          fallbackReason: post.fallbackReason || undefined,
        })
      } else {
        setAiMetadata(null)
      }

      setActiveDraftId(post.id)
      setHasGenerated(true)
      info('Draft Loaded', `Editing draft from ${new Date(post.createdAt).toLocaleDateString()}`)
    }
  }, [location.state])

  // Handle client-side file upload and validation
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      const validExtensions = ['.png', '.jpg', '.jpeg', '.webp']
      const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
      const hasValidMime = ALLOWED_IMAGE_TYPES.includes(file.type)

      if (!hasValidExt && !hasValidMime) {
        error('Unsupported File Type', 'Please upload a PNG, JPG, JPEG, or WEBP image.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
        error('File Too Large', `Please upload an image smaller than ${MAX_IMAGE_SIZE_MB}MB.`)
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }

      setImageFileName(file.name)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
        success('Image Uploaded', `${file.name} ready for vision analysis.`)
      }
      reader.onerror = () => {
        error('Upload Failed', 'Failed to read the selected image file.')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveImage = () => {
    setImagePreview(null)
    setImageFileName(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // Generate Post via OpenRouter Vision AI (with fallback support)
  const handleGeneratePost = async () => {
    if (!imagePreview) {
      error('Image Required', 'Please upload an image (PNG, JPG, or WEBP) before generating.')
      return
    }

    setIsGenerating(true)
    setGenerationStep('Uploading and scanning visual elements...')

    const t1 = setTimeout(() => {
      setGenerationStep('Analyzing charts, metrics, and narrative context...')
    }, 1200)

    const t2 = setTimeout(() => {
      setGenerationStep('Synthesizing post with OpenRouter AI vision model...')
    }, 2400)

    try {
      const res = await generatePostFromImage({
        imageBase64: imagePreview,
        tone,
        length,
        context: contextNote,
      })

      clearTimeout(t1)
      clearTimeout(t2)

      if (res.data) {
        setGeneratedContent(res.data.primaryPost)
        if (res.data.alternativeHooks && res.data.alternativeHooks.length > 0) {
          setAlternativeHooks(res.data.alternativeHooks)
        }
        if (res.data.hashtags && res.data.hashtags.length > 0) {
          setHashtags(res.data.hashtags)
        }
        setVisualSummary(res.data.visualSummary || res.visualSummary || '')
        setAiMetadata({
          engineUsed: res.engineUsed,
          model: res.model || '',
          isAiPowered: res.isAiPowered,
          fallbackReason: res.fallbackReason,
        })
        setHasGenerated(true)

        if (res.isAiPowered) {
          success('Post Generated!', `Created with ${res.engineUsed || 'OpenRouter AI'}.`)
        } else {
          info(
            'Draft Created (Fallback)',
            res.fallbackReason || 'Generated using local heuristic templates.'
          )
        }
      }
    } catch (err: any) {
      clearTimeout(t1)
      clearTimeout(t2)
      error('Generation Error', err?.message || 'Failed to generate post from image.')
    } finally {
      setIsGenerating(false)
    }
  }

  // Swap alternative hook into post editor
  const handleSelectHook = (selectedHook: string) => {
    const lines = generatedContent.split('\n')
    lines[0] = selectedHook
    setGeneratedContent(lines.join('\n'))
    success('Hook Applied', 'Opening line updated in the live editor.')
  }

  // Copy post to clipboard
  const handleCopyPost = () => {
    navigator.clipboard.writeText(generatedContent)
    setCopied(true)
    success('Copied to clipboard', 'Ready to paste into LinkedIn feed.')
    setTimeout(() => setCopied(false), 2000)
  }

  // Save to persistent localStorage drafts store
  const handleSaveDraft = () => {
    const saved = saveDraft({
      id: activeDraftId || undefined,
      content: generatedContent,
      tone,
      length,
      imageUrl: imagePreview,
      hashtags,
      hook: alternativeHooks[0] || generatedContent.split('\n')[0],
      alternativeHooks: alternativeHooks,
      visualSummary: visualSummary,
      isAiPowered: aiMetadata?.isAiPowered,
      engineUsed: aiMetadata?.engineUsed,
      fallbackReason: aiMetadata?.fallbackReason,
      status: 'draft',
    })
    setActiveDraftId(saved.id)
    success('Draft Saved', 'Post draft added to Saved Drafts & History.')
  }

  const handleSchedulePost = () => {
    setIsScheduleModalOpen(false)
    success(
      'Post Scheduled',
      `Scheduled for publication on ${new Date(scheduleDate).toLocaleString()}.`
    )
  }

  // LinkedIn Publishing Handlers
  const handleOpenPublishModal = () => {
    setPublishError(null)
    if (!linkedInStatus?.isConnected) {
      setIsNotConnectedModalOpen(true)
      return
    }
    setIncludeImageInPost(Boolean(imagePreview))
    setIsPublishModalOpen(true)
  }

  const handleConfirmPublish = async () => {
    setIsPublishing(true)
    setPublishError(null)

    try {
      const res = await publishToLinkedIn({
        content: generatedContent,
        imageBase64: (includeImageInPost && imagePreview) ? imagePreview : undefined,
        includeImage: includeImageInPost && Boolean(imagePreview),
        visibility: 'PUBLIC',
      })

      if (res.status === 'success') {
        setIsPublishModalOpen(false)
        setPublishSuccessData(res)
        success('Post Published!', 'Your update is now live on your LinkedIn profile.')
      } else {
        setPublishError(res.message || 'LinkedIn publishing failed.')
        error('Publish Failed', res.message || 'LinkedIn rejected the post.')
      }
    } catch (err: any) {
      let msg = err?.message || 'Failed to communicate with LinkedIn publishing API.'
      try {
        const parsed = JSON.parse(msg)
        if (parsed.message) {
          msg = parsed.message
        }
      } catch {
        // Not a JSON string, retain raw msg
      }
      setPublishError(msg)
      error('Publishing Error', msg)
    } finally {
      setIsPublishing(false)
    }
  }

  // Formatting helper tools
  const insertFormatting = (type: 'bold' | 'bullet' | 'hashtag') => {
    if (type === 'bullet') {
      setGeneratedContent((prev) => prev + '\n→ ')
    } else if (type === 'bold') {
      setGeneratedContent((prev) => prev + ' 𝗕𝗼𝗹𝗱 ')
    } else if (type === 'hashtag') {
      setGeneratedContent((prev) => prev + ' #LinkedInGrowth #TechLeadership')
    }
    success('Formatted', `Applied ${type} format helper.`)
  }

  // Loading State
  if (stateMode === 'loading' || isGenerating) {
    return (
      <div className="space-y-6 animate-fade-in max-w-5xl mx-auto">
        <div className="text-center py-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-50 text-[#0a66c2] dark:bg-slate-800 dark:text-blue-400 mb-4 animate-bounce">
            <Sparkles className="h-8 w-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Transforming Image into LinkedIn Post...
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            {generationStep || 'Scanning visual themes, chart metrics, and optimizing narrative tone.'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-[480px] rounded-xl" />
          <Skeleton className="h-[480px] rounded-xl" />
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
              Failed to generate post from image
            </h3>
            <p className="text-sm text-slate-600 dark:text-slate-400 max-w-sm mx-auto mb-6">
              The image processing model or text synthesizer returned an error.
            </p>
            {onStateModeChange && (
              <Button variant="primary" onClick={() => onStateModeChange('normal')}>
                Retry Generation
              </Button>
            )}
          </CardContent>
        </Card>
      </div>
    )
  }

  // Empty State
  if (stateMode === 'empty' || (!hasGenerated && stateMode !== 'normal')) {
    return (
      <div className="space-y-6 animate-fade-in max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
            Image-to-LinkedIn Post Generator
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Upload any screenshot, architecture diagram, infographic, or photo to generate an engaging LinkedIn post.
          </p>
        </div>

        <Card>
          <CardContent className="py-16 text-center">
            <EmptyState
              icon={<ImageIcon className="h-14 w-14 text-slate-300 dark:text-slate-600" />}
              title="No Post Generated Yet"
              description="Drop an image from your computer or use our sample metrics screenshot to generate high-performing LinkedIn copy in seconds."
              action={{
                label: 'Load Sample & View Post Preview',
                onClick: () => {
                  setHasGenerated(true)
                  onStateModeChange?.('normal')
                },
              }}
            />
          </CardContent>
        </Card>
      </div>
    )
  }

  const wordCount = generatedContent.trim() ? generatedContent.trim().split(/\s+/).length : 0
  const charCount = generatedContent.length

  // Normal populated state
  return (
    <div className="space-y-8 animate-fade-in max-w-6xl mx-auto">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-slate-900 dark:text-white">
              Image-to-LinkedIn Post Generator
            </h1>
            <Badge variant="linkedin" size="sm">
              Visual AI
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Transform screenshots, charts, project wins, and event photos into viral LinkedIn narratives.
          </p>
        </div>

        {/* Engine status indicator */}
        {aiMetadata && (
          <div className="flex items-center gap-2">
            <Badge
              variant={aiMetadata.isAiPowered ? 'success' : 'warning'}
              size="sm"
              className="flex items-center gap-1.5 py-1 px-3"
            >
              {aiMetadata.isAiPowered ? (
                <>
                  <Sparkles className="h-3 w-3 text-emerald-500" />
                  <span>{aiMetadata.engineUsed}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 text-amber-500" />
                  <span>Heuristic Fallback</span>
                </>
              )}
            </Badge>
          </div>
        )}
      </div>

      {/* Two-Column Layout: Controls & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Image Upload & Parameters (5 cols) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Image Upload Box */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold flex items-center justify-between">
                <span>1. Upload Source Image</span>
                {imagePreview && (
                  <button
                    onClick={handleRemoveImage}
                    className="text-xs text-red-500 hover:text-red-700 flex items-center gap-1 font-semibold transition-colors"
                  >
                    <X className="h-3.5 w-3.5" /> Remove
                  </button>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-2">
              {imagePreview ? (
                <div className="relative rounded-xl overflow-hidden border border-slate-200 dark:border-slate-700 group">
                  <img
                    src={imagePreview}
                    alt="Upload Preview"
                    className="w-full h-48 object-cover transition-transform group-hover:scale-102"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <Button
                      size="sm"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Replace Image
                    </Button>
                  </div>
                  <div className="p-2.5 bg-white dark:bg-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
                    <span className="truncate max-w-[200px]">{imageFileName || 'Uploaded image'}</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Ready for Vision AI
                    </span>
                  </div>
                </div>
              ) : (
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl p-8 text-center hover:border-[#0a66c2] transition-colors cursor-pointer bg-slate-50/50 dark:bg-slate-900/50"
                >
                  <Upload className="h-8 w-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                    Upload image or screenshot
                  </p>
                  <p className="text-xs text-slate-400 mt-1">PNG, JPG, WebP up to 5MB</p>
                  <span className="mt-4 inline-block px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold hover:bg-slate-50">
                    Select File
                  </span>
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp"
                className="hidden"
                onChange={handleImageUpload}
              />
            </CardContent>
          </Card>

          {/* Tone & Parameters */}
          <Card className="shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-bold">2. Tone & Post Settings</CardTitle>
            </CardHeader>
            <CardContent className="pt-2 space-y-4">
              {/* Tone Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Tone of Voice
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {POST_TONES.map((t) => (
                    <button
                      key={t.value}
                      onClick={() => setTone(t.value)}
                      className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                        tone === t.value
                          ? 'border-[#0a66c2] bg-blue-50/60 dark:bg-blue-950/40 dark:border-[#0a66c2]'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <span className="text-sm">{t.emoji}</span>
                      <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1">
                        {t.label}
                      </span>
                      <span className="text-[10px] text-slate-400 line-clamp-1">{t.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Length Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2">
                  Post Length
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'short', label: 'Short (~100w)' },
                    { id: 'medium', label: 'Medium (~250w)' },
                    { id: 'long', label: 'Long (~400w)' },
                  ].map((l) => (
                    <button
                      key={l.id}
                      onClick={() => setLength(l.id as PostLength)}
                      className={`py-2 px-2 rounded-lg text-xs font-semibold text-center transition-all ${
                        length === l.id
                          ? 'bg-[#0a66c2] text-white shadow-sm'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300'
                      }`}
                    >
                      {l.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Context Note */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                  Additional Context / Angle (Optional)
                </label>
                <Textarea
                  value={contextNote}
                  onChange={(e) => setContextNote(e.target.value)}
                  rows={3}
                  placeholder="e.g. Focus on lessons learned, our team's perseverance, or call for feedback..."
                />
              </div>

              {/* Generate Action Button */}
              <Button
                className="w-full mt-2"
                onClick={handleGeneratePost}
                isLoading={isGenerating}
                leftIcon={<Sparkles className="h-4 w-4" />}
              >
                Generate Viral Post
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live LinkedIn Preview & Alternative Hooks (7 cols) */}
        <div className="lg:col-span-7 space-y-5">
          {/* Visual Comprehension & AI Diagnostics Banner */}
          {visualSummary && (
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/50 dark:border-blue-900/40 dark:bg-slate-800/60 p-3.5">
              <div className="flex items-start gap-2.5">
                <Eye className="h-4 w-4 text-[#0a66c2] dark:text-blue-400 mt-0.5 shrink-0" />
                <div className="text-xs">
                  <p className="font-bold text-slate-800 dark:text-slate-200">
                    Image Comprehension Summary:
                  </p>
                  <p className="text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                    {visualSummary}
                  </p>
                  {aiMetadata?.fallbackReason && (
                    <p className="text-[11px] text-amber-600 dark:text-amber-400 mt-1 font-medium">
                      ⚠️ Notice: {aiMetadata.fallbackReason}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Live Preview Header Toolbar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Live LinkedIn Feed Mockup
              </span>
              <Badge variant="linkedin" size="sm">
                Desktop & Mobile Preview
              </Badge>
            </div>

            {/* Quick Formatting Helpers */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => insertFormatting('bullet')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-bold"
                title="Insert Bullet Point"
              >
                →
              </button>
              <button
                onClick={() => insertFormatting('bold')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 font-serif font-bold"
                title="Insert Bold Unicode"
              >
                𝗕
              </button>
              <button
                onClick={() => insertFormatting('hashtag')}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Insert Hashtags"
              >
                #
              </button>
            </div>
          </div>

          {/* Authentic LinkedIn Feed Post Card */}
          <div className="rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-md overflow-hidden">
            {/* Post Header */}
            <div className="p-4 flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#0a66c2] text-base font-bold text-white shadow-sm">
                  {user?.displayName ? user.displayName.charAt(0).toUpperCase() : 'A'}
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-slate-900 dark:text-white">
                      {user?.displayName || 'Alex Rivera'}
                    </span>
                    <span className="text-xs text-slate-400">• 1st</span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1">
                    Senior Full-Stack Engineer | Building Scalable Web Systems
                  </p>
                  <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                    <span>Just now</span>
                    <span>•</span>
                    <Globe className="h-3 w-3" />
                  </p>
                </div>
              </div>
              <button className="text-slate-400 hover:text-slate-600">
                <MoreHorizontal className="h-5 w-5" />
              </button>
            </div>

            {/* Post Editable Content */}
            <div className="px-4 pb-3">
              <Textarea
                value={generatedContent}
                onChange={(e) => setGeneratedContent(e.target.value)}
                rows={isExpanded ? 12 : 7}
                className="border-none focus:ring-0 p-0 text-[13px] leading-relaxed text-slate-900 dark:text-slate-100 bg-transparent resize-none font-sans"
              />
              <div className="flex items-center justify-between mt-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="text-xs font-semibold text-[#0a66c2] hover:underline"
                >
                  {isExpanded ? 'Show less' : '...see more'}
                </button>
                <span className="text-[10px] text-slate-400 font-medium">
                  {wordCount} words • {charCount} chars
                </span>
              </div>
            </div>

            {/* Post Image Preview */}
            {imagePreview && (
              <div className="border-t border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950">
                <img
                  src={imagePreview}
                  alt="Post Attachment"
                  className="w-full max-h-96 object-contain"
                />
              </div>
            )}

            {/* Post Engagement Counts */}
            <div className="px-4 py-2 flex items-center justify-between text-xs text-slate-400 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5">
                <span className="flex -space-x-1">
                  <span className="h-4 w-4 rounded-full bg-blue-500 flex items-center justify-center text-[9px] text-white">👍</span>
                  <span className="h-4 w-4 rounded-full bg-red-500 flex items-center justify-center text-[9px] text-white">❤️</span>
                  <span className="h-4 w-4 rounded-full bg-amber-500 flex items-center justify-center text-[9px] text-white">💡</span>
                </span>
                <span className="text-[11px]">142 reactions</span>
              </div>
              <div className="text-[11px] flex gap-3">
                <span>38 comments</span>
                <span>12 reposts</span>
              </div>
            </div>

            {/* Post Action Buttons */}
            <div className="px-2 py-1.5 flex items-center justify-around text-slate-600 dark:text-slate-300">
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors">
                <ThumbsUp className="h-4 w-4" />
                <span>Like</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors">
                <MessageSquare className="h-4 w-4" />
                <span>Comment</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors">
                <Repeat2 className="h-4 w-4" />
                <span>Repost</span>
              </button>
              <button className="flex items-center gap-1.5 px-3 py-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-semibold transition-colors">
                <Send className="h-4 w-4" />
                <span>Send</span>
              </button>
            </div>
          </div>

          {/* Action Toolbar Below Preview */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleSaveDraft}
                leftIcon={<Bookmark className="h-3.5 w-3.5" />}
              >
                Save as Draft
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGeneratePost}
                isLoading={isGenerating}
                leftIcon={<RefreshCw className="h-3.5 w-3.5" />}
              >
                Regenerate
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsScheduleModalOpen(true)}
                leftIcon={<Calendar className="h-3.5 w-3.5" />}
              >
                Schedule
              </Button>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCopyPost}
                leftIcon={copied ? <Check className="h-3.5 w-3.5 text-emerald-300" /> : <Copy className="h-3.5 w-3.5" />}
              >
                {copied ? 'Copied!' : 'Copy'}
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenPublishModal}
                leftIcon={<Linkedin className="h-3.5 w-3.5" />}
              >
                Publish to LinkedIn
              </Button>
            </div>
          </div>

          {/* Alternative Opening Hooks Card */}
          <Card className="shadow-sm border-slate-200 dark:border-slate-800">
            <CardHeader className="pb-2.5">
              <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                <Lightbulb className="h-4 w-4 text-amber-500" />
                <span>
                  {alternativeHooks.length > 0
                    ? `${alternativeHooks.length} Alternative Opening Hook${alternativeHooks.length > 1 ? 's' : ''} (Click to apply)`
                    : 'Alternative Opening Hooks'}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0 space-y-2">
              {alternativeHooks.length > 0 ? (
                alternativeHooks.map((h, idx) => (
                  <div
                    key={idx}
                    className="group p-2.5 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/60 dark:bg-slate-800/40 hover:border-[#0a66c2] hover:bg-blue-50/40 dark:hover:bg-slate-800 transition-all flex items-center justify-between gap-3"
                  >
                    <p className="text-xs text-slate-800 dark:text-slate-200 font-medium leading-relaxed">
                      {h}
                    </p>
                    <button
                      onClick={() => handleSelectHook(h)}
                      className="shrink-0 text-[11px] font-semibold text-[#0a66c2] dark:text-blue-400 group-hover:underline px-2.5 py-1 rounded-md border border-[#0a66c2]/30 bg-white dark:bg-slate-900 shadow-2xs transition-colors hover:bg-blue-50"
                    >
                      Use Hook
                    </button>
                  </div>
                ))
              ) : (
                <div className="py-4 px-3 rounded-xl border border-dashed border-slate-200 dark:border-slate-700 text-center bg-slate-50/40 dark:bg-slate-900/30">
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    No alternative hooks were saved with this draft.
                  </p>
                  <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">
                    Click "Regenerate" to create fresh hooks with Vision AI.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Relevant Hashtags */}
          {hashtags && hashtags.length > 0 && (
            <div className="flex items-center flex-wrap gap-1.5 pt-1">
              <span className="text-[11px] font-bold text-slate-400 flex items-center gap-1 mr-1">
                <Hash className="h-3.5 w-3.5" /> Hashtags:
              </span>
              {hashtags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => {
                    const tagStr = tag.startsWith('#') ? tag : `#${tag}`
                    if (!generatedContent.includes(tagStr)) {
                      setGeneratedContent((prev) => prev + ` ${tagStr}`)
                      success('Hashtag Added', `Appended ${tagStr} to post.`)
                    }
                  }}
                  className="px-2 py-0.5 rounded-md bg-blue-50 dark:bg-slate-800 text-[#0a66c2] dark:text-blue-400 border border-blue-200/60 dark:border-slate-700 text-xs font-semibold hover:bg-blue-100 transition-colors"
                  title="Click to append hashtag"
                >
                  #{tag.replace(/^#/, '')}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Schedule Post Modal */}
      <Modal
        isOpen={isScheduleModalOpen}
        onClose={() => setIsScheduleModalOpen(false)}
        title="Schedule LinkedIn Post"
        description="Pick the optimal date and time based on LinkedIn algorithm peak hours."
      >
        <div className="space-y-4 pt-2">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5">
              Target Publication Date & Time
            </label>
            <Input
              type="datetime-local"
              value={scheduleDate}
              onChange={(e) => setScheduleDate(e.target.value)}
            />
          </div>

          <div className="rounded-xl bg-blue-50/70 dark:bg-slate-800/60 p-3.5 border border-blue-100 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300">
            <p className="font-semibold text-[#0a66c2] dark:text-blue-400 mb-1">
              ✨ Recommended Algorithm Window:
            </p>
            <p>
              Tuesday or Thursday mornings (09:00 AM – 10:30 AM local time) see the highest comment velocity.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsScheduleModalOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={handleSchedulePost}>
              Confirm Schedule
            </Button>
          </div>
        </div>
      </Modal>

      {/* 1. LinkedIn Publish Confirmation Modal */}
      <Modal
        isOpen={isPublishModalOpen}
        onClose={() => !isPublishing && setIsPublishModalOpen(false)}
        title="Confirm LinkedIn Publication"
        description="Verify post details before sending live to your personal LinkedIn network."
      >
        <div className="space-y-4 pt-2">
          {/* Target Account Info */}
          <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/60">
            {linkedInStatus?.memberPicture ? (
              <img
                src={linkedInStatus.memberPicture}
                alt={linkedInStatus.memberName}
                className="h-10 w-10 rounded-xl object-cover border border-slate-300 dark:border-slate-600"
              />
            ) : (
              <div className="h-10 w-10 rounded-xl bg-[#0a66c2] text-white flex items-center justify-center font-bold text-sm">
                {linkedInStatus?.memberName?.charAt(0) || 'L'}
              </div>
            )}
            <div className="text-xs">
              <p className="font-bold text-slate-900 dark:text-white">
                Publishing to: {linkedInStatus?.memberName}
              </p>
              <p className="text-slate-500 dark:text-slate-400">
                Visibility: Public Feed Post • <code className="text-[#0a66c2]">w_member_social</code>
              </p>
            </div>
          </div>

          {/* Post Content Excerpt */}
          <div className="space-y-1">
            <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider">
              Post Content Excerpt
            </span>
            <div className="p-3 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 max-h-36 overflow-y-auto text-xs text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
              {generatedContent}
            </div>
          </div>

          {/* Image Attachment Toggle */}
          {imagePreview && (
            <div className="flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/60 dark:bg-slate-800/40 text-xs">
              <div className="flex items-center gap-2">
                <ImageIcon className="h-4 w-4 text-[#0a66c2]" />
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-200">
                    Include Attached Image
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Uploads binary image through LinkedIn Images API
                  </p>
                </div>
              </div>
              <input
                type="checkbox"
                checked={includeImageInPost}
                onChange={(e) => setIncludeImageInPost(e.target.checked)}
                className="h-4 w-4 rounded border-slate-300 text-[#0a66c2] focus:ring-[#0a66c2]"
              />
            </div>
          )}

          {/* Error Message if publish failed */}
          {publishError && (
            <div className="p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-900/60 dark:bg-red-950/30 dark:text-red-300 text-xs flex items-start gap-2">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <p className="leading-relaxed">{publishError}</p>
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button
              variant="outline"
              size="sm"
              disabled={isPublishing}
              onClick={() => setIsPublishModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleConfirmPublish}
              isLoading={isPublishing}
              leftIcon={<Send className="h-3.5 w-3.5" />}
            >
              {isPublishing ? 'Publishing...' : 'Confirm & Publish Live'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* 2. LinkedIn Not Connected Prompt Modal */}
      <Modal
        isOpen={isNotConnectedModalOpen}
        onClose={() => setIsNotConnectedModalOpen(false)}
        title="LinkedIn Account Required"
        description="Connect your LinkedIn account to publish posts directly from Post Studio."
      >
        <div className="space-y-4 pt-2 text-center py-2">
          <div className="h-14 w-14 rounded-2xl bg-blue-50 text-[#0a66c2] dark:bg-slate-800 dark:text-blue-400 mx-auto flex items-center justify-center">
            <Linkedin className="h-7 w-7" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              No Active LinkedIn Authorization Found
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
              To publish posts live, authenticate with LinkedIn via OAuth 2.0 in the Settings page. Your tokens will be stored securely on the server.
            </p>
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setIsNotConnectedModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setIsNotConnectedModalOpen(false)
                navigate('/settings')
              }}
              leftIcon={<ExternalLink className="h-3.5 w-3.5" />}
            >
              Open Settings & Connect
            </Button>
          </div>
        </div>
      </Modal>

      {/* 3. Publish Success Modal */}
      <Modal
        isOpen={Boolean(publishSuccessData)}
        onClose={() => setPublishSuccessData(null)}
        title="Post Published to LinkedIn!"
      >
        <div className="space-y-4 pt-2 text-center py-2">
          <div className="h-14 w-14 rounded-full bg-emerald-100 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400 mx-auto flex items-center justify-center">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-900 dark:text-white">
              Your Update is Live on LinkedIn
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Confirmed through official LinkedIn REST API response.
            </p>
            {publishSuccessData?.postUrn && (
              <p className="text-[11px] font-mono text-slate-400 mt-1">
                Post URN: {publishSuccessData.postUrn}
              </p>
            )}
          </div>

          <div className="flex items-center justify-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <Button variant="outline" size="sm" onClick={() => setPublishSuccessData(null)}>
              Done
            </Button>
            {publishSuccessData?.shareUrl && (
              <a
                href={publishSuccessData.shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0a66c2] text-white text-xs font-semibold hover:bg-[#004182] transition-colors shadow-sm"
              >
                <span>View on LinkedIn</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>
        </div>
      </Modal>
    </div>
  )
}
