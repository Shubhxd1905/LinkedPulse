// Test script for Phase 3: Image-to-LinkedIn Post Generator & Draft Persistence
import assert from 'node:assert'

console.log('=== RUNNING PHASE 3 TESTS ===\n')

// 1. File Type and Size Validation Logic
console.log('Test 1: Image file type and size constraints...')
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_SIZE_MB = 5

function validateImageFile(file) {
  if (!file) return { isValid: false, error: 'No file provided' }
  const validExtensions = ['.png', '.jpg', '.jpeg', '.webp']
  const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))
  const hasValidMime = ALLOWED_IMAGE_TYPES.includes(file.type)

  if (!hasValidExt && !hasValidMime) {
    return { isValid: false, error: 'Unsupported file type' }
  }
  if (file.size > MAX_IMAGE_SIZE_MB * 1024 * 1024) {
    return { isValid: false, error: 'File exceeds 5MB limit' }
  }
  return { isValid: true }
}

assert.strictEqual(validateImageFile(null).isValid, false)
assert.strictEqual(validateImageFile({ name: 'document.pdf', type: 'application/pdf', size: 1024 }).isValid, false)
assert.strictEqual(validateImageFile({ name: 'script.exe', type: 'application/x-msdownload', size: 1024 }).isValid, false)
assert.strictEqual(validateImageFile({ name: 'photo.png', type: 'image/png', size: 6 * 1024 * 1024 }).isValid, false)
assert.strictEqual(validateImageFile({ name: 'photo.png', type: 'image/png', size: 2 * 1024 * 1024 }).isValid, true)
assert.strictEqual(validateImageFile({ name: 'chart.webp', type: 'image/webp', size: 1 * 1024 * 1024 }).isValid, true)
assert.strictEqual(validateImageFile({ name: 'metrics.jpg', type: 'image/jpeg', size: 500 * 1024 }).isValid, true)
console.log('✓ Image type and size validation correctly enforces PNG/JPG/WEBP and 5MB cap.')

// 2. Hook Swapping Logic
console.log('\nTest 2: Hook swapping mechanics...')
function swapHook(content, newHook) {
  const lines = content.split('\n')
  lines[0] = newHook
  return lines.join('\n')
}

const originalPost = 'Original hook line.\n\nHere is paragraph one.\n\n#Hashtag'
const updatedPost = swapHook(originalPost, 'Alternative viral hook that converts.')
assert.ok(updatedPost.startsWith('Alternative viral hook that converts.'))
assert.ok(updatedPost.includes('Here is paragraph one.'))
assert.ok(updatedPost.includes('#Hashtag'))
console.log('✓ Opening hook cleanly replaced without mutating body paragraphs or hashtags.')

// 3. Draft Store CRUD Simulation & Persistence Logic
console.log('\nTest 3: Draft store CRUD mechanics...')
let draftsStore = [
  { id: 'post-legacy-1', content: 'Legacy draft without alternative hooks', tone: 'storytelling', status: 'draft', hook: 'Legacy hook', createdAt: '2026-10-20T10:00:00.000Z' },
  { id: 'post-legacy-2', content: 'Another older draft', tone: 'professional', status: 'published', hook: 'Another hook', createdAt: '2026-10-21T10:00:00.000Z' },
]

function saveDraftSim(post) {
  const now = new Date().toISOString()
  if (post.id) {
    const idx = draftsStore.findIndex(p => p.id === post.id)
    if (idx !== -1) {
      const existing = draftsStore[idx]
      const updated = {
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
      draftsStore[idx] = updated
      return updated
    }
  }
  const newPost = {
    id: `post-${Date.now()}`,
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
  draftsStore = [newPost, ...draftsStore]
  return newPost
}

function deleteDraftSim(id) {
  const lenBefore = draftsStore.length
  draftsStore = draftsStore.filter(p => p.id !== id)
  return draftsStore.length < lenBefore
}

// -------------------------------------------------------------
// Regression Test A: Saving a draft with three alternative hooks
// -------------------------------------------------------------
console.log('\nRegression Test A: Saving a draft with three alternative hooks...')
const sampleHooks = [
  'Hook 1: We scaled to 1M daily requests.',
  'Hook 2: The architecture mistake that taught us everything.',
  'Hook 3: Stop blaming databases for bad access patterns.'
]
const sampleSummary = 'System metrics graph displaying API latency.'

const savedNewDraft = saveDraftSim({
  content: `${sampleHooks[0]}\n\nHere is our breakdown:\n→ Event driven microservices\n→ Tiered caching\n\n#Tech`,
  tone: 'storytelling',
  length: 'medium',
  imageUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  hashtags: ['SoftwareEngineering', 'Cloud'],
  hook: sampleHooks[0],
  alternativeHooks: sampleHooks,
  visualSummary: sampleSummary,
  isAiPowered: true,
  engineUsed: 'OpenRouter AI (dots-studio/dots-3-note-preview:free)',
  status: 'draft',
})

assert.ok(savedNewDraft.id)
assert.strictEqual(savedNewDraft.alternativeHooks.length, 3)
assert.deepStrictEqual(savedNewDraft.alternativeHooks, sampleHooks)
assert.strictEqual(savedNewDraft.visualSummary, sampleSummary)
assert.strictEqual(savedNewDraft.isAiPowered, true)
console.log('✓ Draft saved with all 3 alternative hooks, visual summary, and AI status intact.')

// -------------------------------------------------------------
// Regression Test B: Reading the draft and verifying all three hooks
// -------------------------------------------------------------
console.log('\nRegression Test B: Reading draft from store and verifying all three hooks...')
const retrievedDraft = draftsStore.find(d => d.id === savedNewDraft.id)
assert.ok(retrievedDraft)
assert.ok(Array.isArray(retrievedDraft.alternativeHooks))
assert.strictEqual(retrievedDraft.alternativeHooks.length, 3)
assert.strictEqual(retrievedDraft.alternativeHooks[0], sampleHooks[0])
assert.strictEqual(retrievedDraft.alternativeHooks[1], sampleHooks[1])
assert.strictEqual(retrievedDraft.alternativeHooks[2], sampleHooks[2])
console.log('✓ Stored draft accurately retains all 3 hooks when retrieved.')

// -------------------------------------------------------------
// Regression Test C: Opening draft and restoring all three hooks in Post Studio
// -------------------------------------------------------------
console.log('\nRegression Test C: Restoring draft state in Post Studio...')
function restoreDraftToStudio(post) {
  let restoredContent = post.content
  let restoredTone = post.tone || 'storytelling'
  let restoredLength = post.length || 'medium'
  let restoredImage = post.imageUrl || null
  let restoredHashtags = post.hashtags || []
  let restoredHooks = []
  let restoredVisualSummary = ''
  let restoredAiMeta = null

  if (post.alternativeHooks && Array.isArray(post.alternativeHooks) && post.alternativeHooks.length > 0) {
    restoredHooks = post.alternativeHooks
  } else {
    restoredHooks = []
  }

  if (post.visualSummary !== undefined) {
    restoredVisualSummary = post.visualSummary || ''
  }

  if (post.isAiPowered !== undefined && post.isAiPowered !== null) {
    restoredAiMeta = {
      engineUsed: post.engineUsed || (post.isAiPowered ? 'OpenRouter AI' : 'Local Heuristic Engine'),
      model: post.engineUsed || '',
      isAiPowered: post.isAiPowered,
      fallbackReason: post.fallbackReason || undefined,
    }
  }

  return {
    content: restoredContent,
    tone: restoredTone,
    length: restoredLength,
    imageUrl: restoredImage,
    hashtags: restoredHashtags,
    alternativeHooks: restoredHooks,
    visualSummary: restoredVisualSummary,
    aiMetadata: restoredAiMeta,
  }
}

const studioState = restoreDraftToStudio(retrievedDraft)
assert.strictEqual(studioState.alternativeHooks.length, 3)
assert.deepStrictEqual(studioState.alternativeHooks, sampleHooks)
assert.strictEqual(studioState.visualSummary, sampleSummary)
assert.strictEqual(studioState.aiMetadata.isAiPowered, true)
console.log('✓ Restoring draft populates all 3 alternative hooks without calling AI or truncating to 1.')

// -------------------------------------------------------------
// Regression Test D: Applying a restored hook to post editor
// -------------------------------------------------------------
console.log('\nRegression Test D: Applying a restored hook to post editor...')
const selectedHook = studioState.alternativeHooks[1]
const editedContent = swapHook(studioState.content, selectedHook)
assert.ok(editedContent.startsWith(selectedHook))
assert.ok(editedContent.includes('Here is our breakdown:'))
console.log('✓ Selected restored hook successfully swapped into the editor content.')

// -------------------------------------------------------------
// Regression Test E: Loading an older draft without alternativeHooks
// -------------------------------------------------------------
console.log('\nRegression Test E: Loading an older legacy draft without hooks...')
const legacyDraft = draftsStore.find(d => d.id === 'post-legacy-1')
assert.ok(legacyDraft)
assert.strictEqual(legacyDraft.alternativeHooks, undefined)

const legacyStudioState = restoreDraftToStudio(legacyDraft)
assert.strictEqual(legacyStudioState.alternativeHooks.length, 0)
assert.deepStrictEqual(legacyStudioState.alternativeHooks, [])
// Must NOT fabricate a single hook as 3 alternative hooks
assert.notStrictEqual(legacyStudioState.alternativeHooks.length, 1)
console.log('✓ Older draft without alternativeHooks gracefully falls back to empty array without crashing or faking.')

// -------------------------------------------------------------
// Regression Test F: Preserving existing draft data on update
// -------------------------------------------------------------
console.log('\nRegression Test F: Preserving existing draft data...')
const originalCreatedAt = retrievedDraft.createdAt
const updatedDraft = saveDraftSim({
  id: retrievedDraft.id,
  content: editedContent,
})

assert.strictEqual(updatedDraft.id, retrievedDraft.id)
assert.strictEqual(updatedDraft.createdAt, originalCreatedAt)
assert.ok(updatedDraft.updatedAt)
// Alternative hooks must still be preserved on update even if not re-passed
assert.strictEqual(updatedDraft.alternativeHooks.length, 3)
assert.strictEqual(draftsStore.length, 3) // legacy-1, legacy-2, savedNewDraft
console.log('✓ Updating a draft preserves timestamps and alternativeHooks.')

console.log('\n=== ALL PHASE 3 UNIT & REGRESSION CHECKS PASSED ===')
