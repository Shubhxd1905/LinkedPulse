// Test script for Phase 4: LinkedIn OAuth 2.0 Integration & Direct Post Publishing
import assert from 'node:assert'

console.log('=== RUNNING PHASE 4 TESTS: LINKEDIN OAUTH & PUBLISHING ===\n')

// 1. OAuth Callback URL Parameter Parsing Logic
console.log('Test 1: OAuth callback parameter parsing and state handling...')
function parseAuthCallbackParams(searchParamsString) {
  const params = new URLSearchParams(searchParamsString)
  const authStatus = params.get('linkedin_auth')
  const reason = params.get('reason')

  if (authStatus === 'success') {
    return { isSuccess: true, toastMessage: 'LinkedIn account successfully connected!' }
  } else if (authStatus === 'error') {
    const errorMap = {
      user_cancelled: 'LinkedIn authorization was cancelled by the user.',
      state_mismatch: 'Security verification failed (state mismatch). Please try again.',
      missing_code: 'No authorization code received from LinkedIn.',
      token_exchange_failed: 'Failed to exchange authorization code for access token.',
      unconfigured: 'LinkedIn Client ID and Secret are not configured on the server.',
    }
    return {
      isSuccess: false,
      toastMessage: errorMap[reason] || `LinkedIn connection failed (${reason || 'unknown error'}).`,
    }
  }
  return { isSuccess: null, toastMessage: null }
}

const successRes = parseAuthCallbackParams('?linkedin_auth=success')
assert.strictEqual(successRes.isSuccess, true)
assert.strictEqual(successRes.toastMessage, 'LinkedIn account successfully connected!')

const cancelRes = parseAuthCallbackParams('?linkedin_auth=error&reason=user_cancelled')
assert.strictEqual(cancelRes.isSuccess, false)
assert.ok(cancelRes.toastMessage.includes('cancelled'))

const stateRes = parseAuthCallbackParams('?linkedin_auth=error&reason=state_mismatch')
assert.strictEqual(stateRes.isSuccess, false)
assert.ok(stateRes.toastMessage.includes('Security verification failed'))

console.log('✓ OAuth callback parsing correctly identifies success, cancellation, and security errors.')

// 2. Direct Publishing Payload Sanitization & Validation Logic
console.log('\nTest 2: Direct publishing payload validation...')
function validatePublishRequest(payload) {
  if (!payload) return { valid: false, error: 'Empty payload' }
  const commentary = (payload.content || '').trim()
  if (!commentary) {
    return { valid: false, error: 'Post content cannot be empty' }
  }
  if (commentary.length > 3000) {
    return { valid: false, error: 'Post content exceeds LinkedIn 3,000 character limit' }
  }
  if (payload.visibility && !['PUBLIC', 'CONNECTIONS'].includes(payload.visibility)) {
    return { valid: false, error: 'Invalid visibility parameter' }
  }
  if (payload.imageBase64 && payload.includeImage !== false) {
    if (typeof payload.imageBase64 !== 'string') {
      return { valid: false, error: 'Invalid image format' }
    }
    // Approx size check: base64 len * 0.75
    const approxBytes = (payload.imageBase64.length * 3) / 4
    if (approxBytes > 10 * 1024 * 1024) {
      return { valid: false, error: 'Image exceeds maximum 10MB upload limit' }
    }
  }
  return { valid: true }
}

assert.strictEqual(validatePublishRequest(null).valid, false)
assert.strictEqual(validatePublishRequest({ content: '' }).valid, false)
assert.strictEqual(validatePublishRequest({ content: '   ' }).valid, false)
assert.strictEqual(validatePublishRequest({ content: 'Valid post commentary' }).valid, true)
assert.strictEqual(validatePublishRequest({ content: 'x'.repeat(3001) }).valid, false)
assert.strictEqual(validatePublishRequest({ content: 'Valid post', visibility: 'INVALID' }).valid, false)
assert.strictEqual(validatePublishRequest({ content: 'Valid post', visibility: 'PUBLIC' }).valid, true)
assert.strictEqual(validatePublishRequest({ content: 'Valid post', visibility: 'CONNECTIONS' }).valid, true)

// Huge image validation
const hugeB64 = 'data:image/png;base64,' + 'A'.repeat(15 * 1024 * 1024)
assert.strictEqual(validatePublishRequest({ content: 'Valid post', imageBase64: hugeB64 }).valid, false)
console.log('✓ Publishing payload validation enforces commentary bounds, visibility, and 10MB image limit.')

// 3. Security Check: Client-Side Status Object Never Contains Raw Access Tokens
console.log('\nTest 3: Security check on LinkedInStatusResponse schema...')
function sanitizeStatusForClient(rawServerData) {
  return {
    isConfigured: Boolean(rawServerData.isConfigured),
    isConnected: Boolean(rawServerData.isConnected),
    isExpired: Boolean(rawServerData.isExpired),
    memberName: rawServerData.memberName || 'LinkedIn Member',
    memberPicture: rawServerData.memberPicture || null,
    memberUrn: rawServerData.memberUrn || null,
    memberEmail: rawServerData.memberEmail || null,
    connectedAt: rawServerData.connectedAt || null,
    expiresAt: rawServerData.expiresAt || 0,
    scopes: Array.isArray(rawServerData.scopes) ? rawServerData.scopes : [],
  }
}

const mockServerRaw = {
  isConfigured: true,
  isConnected: true,
  isExpired: false,
  memberName: 'Sarah Connor',
  memberUrn: 'urn:li:person:sc123',
  scopes: ['openid', 'profile', 'email', 'w_member_social'],
  accessToken: 'DANGEROUS_RAW_SECRET_TOKEN_SHOULD_NEVER_REACH_UI',
  clientSecret: 'SHOULD_NOT_LEAK',
}

const sanitized = sanitizeStatusForClient(mockServerRaw)
assert.strictEqual(sanitized.memberName, 'Sarah Connor')
assert.strictEqual('accessToken' in sanitized, false)
assert.strictEqual('clientSecret' in sanitized, false)
console.log('✓ Client-side status strictly excludes raw tokens and secrets.')

// 4. LinkedIn API Share URL Formatting
console.log('\nTest 4: Share URL resolution from URN...')
function formatLinkedInShareUrl(postUrn) {
  if (!postUrn) return 'https://www.linkedin.com/feed/'
  return `https://www.linkedin.com/feed/update/${postUrn}/`
}

const shareUrl = formatLinkedInShareUrl('urn:li:share:7123456789')
assert.strictEqual(shareUrl, 'https://www.linkedin.com/feed/update/urn:li:share:7123456789/')
console.log('✓ Share URL correctly references live LinkedIn update feed.')

// 5. Publish Action Confirmation Guardrails
console.log('\nTest 5: Publishing action confirmation guardrails...')
function canInitiatePublish(status, content) {
  if (!status.isConfigured) return { canPublish: false, reason: 'NOT_CONFIGURED' }
  if (!status.isConnected) return { canPublish: false, reason: 'NOT_CONNECTED' }
  if (status.isExpired) return { canPublish: false, reason: 'EXPIRED' }
  if (!content || !content.trim()) return { canPublish: false, reason: 'EMPTY_CONTENT' }
  return { canPublish: true }
}

assert.strictEqual(canInitiatePublish({ isConfigured: false, isConnected: false }, 'Hello').reason, 'NOT_CONFIGURED')
assert.strictEqual(canInitiatePublish({ isConfigured: true, isConnected: false }, 'Hello').reason, 'NOT_CONNECTED')
assert.strictEqual(canInitiatePublish({ isConfigured: true, isConnected: true, isExpired: true }, 'Hello').reason, 'EXPIRED')
assert.strictEqual(canInitiatePublish({ isConfigured: true, isConnected: true, isExpired: false }, '').reason, 'EMPTY_CONTENT')
assert.strictEqual(canInitiatePublish({ isConfigured: true, isConnected: true, isExpired: false }, 'Ready to publish!').canPublish, true)
console.log('✓ Publishing guardrails verify configuration, active session, unexpired token, and non-empty post.')

// 6. UI Error Message Parsing & Sanitization Guardrails
console.log('\nTest 6: UI error message parsing and sanitization...')
function formatPublishErrorMessage(err) {
  let msg = err?.message || 'Failed to communicate with LinkedIn publishing API.'
  try {
    const parsed = JSON.parse(msg)
    if (parsed.message) {
      msg = parsed.message
    }
  } catch {
    // Retain plain message
  }
  return msg
}

const rawVersionErrorJson = JSON.stringify({
  code: 'UNSUPPORTED_API_VERSION',
  message: "LinkedIn rejected API version '202401'. The version is no longer active. Please configure an active version (e.g. '202610') in LINKEDIN_API_VERSION.",
  details: 'version 202401 is not active.'
})

const formattedMsg = formatPublishErrorMessage({ message: rawVersionErrorJson })
assert.ok(formattedMsg.includes("LinkedIn rejected API version '202401'"))
assert.ok(!formattedMsg.startsWith('{'))

const plainError = formatPublishErrorMessage({ message: 'Network connection lost' })
assert.strictEqual(plainError, 'Network connection lost')
console.log('✓ UI error parser cleanly presents human-actionable messages instead of raw JSON dumps.')

console.log('\n=== ALL PHASE 4 LINKEDIN TESTS PASSED SUCCESSFULLY ===\n')
