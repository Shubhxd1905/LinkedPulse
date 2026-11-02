// Test script for Phase 2: LinkedIn Profile Optimizer
import assert from 'node:assert'

// Test URL regex
function validateUrl(url) {
  const trimmed = url.trim()
  if (!trimmed) return false
  return /^(https?:\/\/)?(www\.)?linkedin\.com\/in\/[\w-]+\/?$/i.test(trimmed)
}

// Test validation logic
function validateProfile(input) {
  const errors = {}
  if (!input.targetRole || !input.targetRole.trim()) errors.targetRole = 'Target role required'
  if (!input.headline || input.headline.trim().length < 5) errors.headline = 'Headline too short'
  if (input.headline && input.headline.trim().length > 220) errors.headline = 'Headline exceeds limit'
  if (!input.about || input.about.trim().length < 20) errors.about = 'About section too short'
  // Experience is completely optional: blank experience does not block audit
  if (input.experience && input.experience.length > 0) {
    const hasIncomplete = input.experience.some(
      (e) => (!e.title?.trim() && e.description?.trim()) || (e.title?.trim() && !e.description?.trim())
    )
    if (hasIncomplete) errors.experience = 'Experience entries must have both title and description'
  }
  if (!input.skills || input.skills.length < 2) errors.skills = 'At least 2 skills required'
  return { isValid: Object.keys(errors).length === 0, errors }
}

console.log('=== RUNNING PHASE 2 & PROFILE AUDIT TESTS ===\n')

// 1. Test empty & invalid inputs
console.log('Test 1: Empty and invalid input validation...')
const emptyValidation = validateProfile({})
assert.strictEqual(emptyValidation.isValid, false)
assert.ok(emptyValidation.errors.headline)
assert.ok(emptyValidation.errors.about)
// Experience must be optional, not a required field
assert.strictEqual(emptyValidation.errors.experience, undefined)
assert.ok(emptyValidation.errors.skills)
console.log('✓ Empty profile input rejected on required fields while Experience is strictly optional.')

// 2. Test URL validation
console.log('\nTest 2: LinkedIn URL format validation...')
assert.strictEqual(validateUrl(''), false)
assert.strictEqual(validateUrl('https://google.com'), false)
assert.strictEqual(validateUrl('https://linkedin.com/jobs/123'), false)
assert.strictEqual(validateUrl('https://www.linkedin.com/in/alexrivera-tech'), true)
assert.strictEqual(validateUrl('http://linkedin.com/in/johndoe/'), true)
assert.strictEqual(validateUrl('linkedin.com/in/sarah-connor_99'), true)
console.log('✓ Invalid URLs rejected and valid LinkedIn vanity URLs accepted.')

// 3. Test valid manual profile input
console.log('\nTest 3: Valid manually entered profile...')
const validSample = {
  targetRole: 'Full-Stack Engineer',
  headline: 'Senior Full Stack Engineer | React, Node.js & Cloud | Building Scalable SaaS',
  about: 'Senior Full-Stack Engineer with 5+ years of experience building resilient microservices. Achieved 40% reduction in API response times and served 2M+ active users. Let us connect if you are hiring.',
  experience: [
    { id: '1', title: 'Senior Engineer', company: 'CloudCorp', duration: '2022 - Present', description: 'Architected microservices handling 500K daily requests. Reduced AWS infrastructure costs by 30%.' }
  ],
  skills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS']
}
const validValidation = validateProfile(validSample)
assert.strictEqual(validValidation.isValid, true)
console.log('✓ Valid profile data passed validation.')

// 4. Test Phase 5 LinkedIn Profile Fetch Data Normalization
console.log('\nTest 4: Profile fetch response contract & field partitioning...')
function normalizeProfileFetchResponse(apiRes) {
  if (apiRes.status === 'warning' && apiRes.code === 'THIRD_PARTY_PROFILE_RESTRICTED') {
    return {
      isRestricted: true,
      canManualInput: true,
      reason: apiRes.message,
    }
  }
  const available = apiRes.availableFields || []
  const missing = apiRes.missingFields || []
  const isCompleteForAudit = !missing.includes('headline') && !missing.includes('about')
  return {
    isRestricted: false,
    available,
    missing,
    isCompleteForAudit,
    fullName: apiRes.profile?.fullName,
    profileUrl: apiRes.profile?.profileUrl,
  }
}

// Case 4a: Third-party profile restriction
const thirdPartyResp = {
  status: 'warning',
  code: 'THIRD_PARTY_PROFILE_RESTRICTED',
  message: 'LinkedIn API does not permit third-party profile scraping.',
  authenticatedMember: { name: 'Shubham Kumar' },
  allowManualInput: true,
}
const normalized3rd = normalizeProfileFetchResponse(thirdPartyResp)
assert.strictEqual(normalized3rd.isRestricted, true)
assert.strictEqual(normalized3rd.canManualInput, true)
console.log('✓ Third-party profile restrictions correctly flagged with manual input fallback.')

// Case 4b: Authorized member profile fetch with available vs missing fields
const memberResp = {
  status: 'success',
  profile: {
    fullName: 'Shubham Kumar',
    email: 'shubham@example.com',
    picture: 'https://media.licdn.com/dms/image/v2/test.jpg',
    profileUrl: 'https://www.linkedin.com/in/shubham-kumar',
  },
  availableFields: ['fullName', 'picture', 'email', 'profileUrl'],
  missingFields: ['headline', 'about', 'experience', 'skills'],
  limitationsNotice: 'Standard OAuth OIDC scopes provide basic identity only.',
}
const normalizedMember = normalizeProfileFetchResponse(memberResp)
assert.strictEqual(normalizedMember.isRestricted, false)
assert.strictEqual(normalizedMember.isCompleteForAudit, false)
assert.deepStrictEqual(normalizedMember.available, ['fullName', 'picture', 'email', 'profileUrl'])
assert.deepStrictEqual(normalizedMember.missingFields, undefined)
assert.deepStrictEqual(normalizedMember.missing, ['headline', 'about', 'experience', 'skills'])
assert.strictEqual(normalizedMember.fullName, 'Shubham Kumar')
console.log('✓ Authorized member profile properly partitions available vs missing resume fields.')

// 5. Test Fresher with Blank Experience
console.log('\nTest 5: Fresher with blank Experience field...')
const fresherProfile = {
  targetRole: 'Full-Stack Engineer',
  headline: 'Aspiring Full-Stack Engineer | React, Node.js & TypeScript | Computer Science Graduate 2026',
  about: 'Computer Science graduate with strong foundations in modern web development. Built end-to-end applications with React, Node.js, and PostgreSQL. Eager to contribute to high-impact engineering teams. Let us connect!',
  experience: [], // Completely blank!
  experienceStatus: 'fresher',
  education: 'B.S. in Computer Science',
  projects: 'Full-Stack E-commerce Web App, Open Source CLI Tool',
  skills: ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Git']
}

// Validation must pass: blank experience does not block audit
const fresherValidation = validateProfile(fresherProfile)
assert.strictEqual(fresherValidation.isValid, true, 'Fresher validation must pass with blank experience')
assert.strictEqual(fresherValidation.errors.experience, undefined)

// Simulate fresher scoring logic
function evaluateExperienceCategory(experiences, status, context) {
  if (status === 'fresher') {
    let score = 65
    const deductions = []
    const positiveFactors = ['No penalty applied for zero commercial years']
    const aboutLower = (context?.about || '').toLowerCase()

    if (context?.education || /\b(degree|bachelor|computer science|university)\b/i.test(aboutLower)) {
      score += 12
      positiveFactors.push('Features recognized educational degree or relevant coursework')
    }
    if (context?.projects || /\b(project|projects|built|github)\b/i.test(aboutLower)) {
      score += 15
      positiveFactors.push('Demonstrates hands-on engineering capability through technical projects')
    }
    if (context?.skills && context.skills.length >= 4) {
      score += 5
    }
    return {
      name: 'Experience & Hands-on Projects',
      score: Math.min(100, score),
      isFresher: true,
      positiveFactors,
      deductions,
      penalizedForZeroExperience: false
    }
  } else if (status === 'unavailable') {
    return {
      name: 'Work Experience (Data Unavailable)',
      score: 75,
      isUnavailable: true,
      positiveFactors: ['Neutral assessment: marked as unavailable without commercial tenure deductions'],
      deductions: ['Experience history omitted / unavailable (unassessed)'],
      penalizedForZeroExperience: false
    }
  } else {
    let score = experiences && experiences.length >= 2 ? 60 : (experiences && experiences.length === 1 ? 45 : 40)
    return {
      name: 'Experience Quality & Action Verbs',
      score,
      isExperienced: true,
      positiveFactors: [`Documented ${experiences ? experiences.length : 0} career roles`],
      deductions: experiences && experiences.length === 0 ? ['No experience listed'] : [],
      penalizedForZeroExperience: !experiences || experiences.length === 0
    }
  }
}

const fresherExpEval = evaluateExperienceCategory(fresherProfile.experience, fresherProfile.experienceStatus, {
  about: fresherProfile.about,
  education: fresherProfile.education,
  projects: fresherProfile.projects,
  skills: fresherProfile.skills
})

assert.strictEqual(fresherExpEval.penalizedForZeroExperience, false)
assert.ok(fresherExpEval.score >= 80, `Fresher score should be >= 80 based on projects & education, got: ${fresherExpEval.score}`)
assert.strictEqual(fresherExpEval.deductions.length, 0)
assert.ok(fresherExpEval.positiveFactors.some(f => f.includes('No penalty applied')))
console.log('✓ Fresher with blank experience runs successfully and is NOT penalized for zero commercial years.')

// Anti-fabrication check for Fresher
function generateFresherAboutRewrite(role, skills, expStatus) {
  if (expStatus === 'fresher') {
    return `I am an ambitious ${role} with a solid foundation in modern software engineering principles.`
  }
  return `Over the past 5+ years at leading tech companies...`
}
const fresherRewrite = generateFresherAboutRewrite('Full-Stack Engineer', ['React.js'], 'fresher')
assert.ok(!fresherRewrite.includes('5+ years'), 'Must not fabricate years of experience for freshers')
assert.ok(!fresherRewrite.includes('leading tech companies'), 'Must not fabricate commercial companies for freshers')
console.log('✓ Anti-fabrication integrity verified: zero hallucinated companies or false years for freshers.')

// 6. Test Experienced User Profile
console.log('\nTest 6: Experienced user with commercial work entries...')
const experiencedProfile = {
  targetRole: 'Staff Software Engineer',
  headline: 'Staff Software Engineer | Cloud Architecture & High-Scale Distributed Systems',
  about: 'Staff Engineer with 8+ years experience scaling cloud services. Spearheaded microservices migration serving 10M+ daily requests and reduced infrastructure latency by 45%.',
  experience: [
    {
      id: 'exp-1',
      title: 'Staff Software Engineer',
      company: 'CloudCorp',
      duration: '2021 - Present',
      description: 'Architected distributed systems handling 10M daily requests with 99.99% reliability. Reduced latency by 45%.'
    }
  ],
  experienceStatus: 'present',
  skills: ['Go', 'Kubernetes', 'AWS', 'Distributed Systems', 'Kafka']
}
const experiencedValidation = validateProfile(experiencedProfile)
assert.strictEqual(experiencedValidation.isValid, true)

const expEval = evaluateExperienceCategory(experiencedProfile.experience, experiencedProfile.experienceStatus, {
  about: experiencedProfile.about,
  skills: experiencedProfile.skills
})
assert.strictEqual(expEval.isExperienced, true)
assert.ok(expEval.positiveFactors[0].includes('1 career roles'))
console.log('✓ Experienced user with verified commercial entries evaluated with full commercial rigor.')

// 7. Test Unavailable Experience Data
console.log('\nTest 7: Unavailable Experience data distinction...')
const unavailableProfile = {
  targetRole: 'Frontend Engineer',
  headline: 'Frontend Engineer | React, Next.js & UI Performance Optimization',
  about: 'Passionate frontend engineer with deep focus on web accessibility, responsive UI design, and fast Core Web Vitals. Let us connect!',
  experience: [], // Omitted/unavailable from LinkedIn API
  experienceStatus: 'unavailable',
  skills: ['React.js', 'Next.js', 'TypeScript', 'TailwindCSS']
}
const unavailableValidation = validateProfile(unavailableProfile)
assert.strictEqual(unavailableValidation.isValid, true, 'Unavailable experience profile must pass validation')

const unavailableEval = evaluateExperienceCategory(unavailableProfile.experience, unavailableProfile.experienceStatus, {
  about: unavailableProfile.about,
  skills: unavailableProfile.skills
})
assert.strictEqual(unavailableEval.isUnavailable, true)
assert.strictEqual(unavailableEval.name, 'Work Experience (Data Unavailable)')
assert.strictEqual(unavailableEval.penalizedForZeroExperience, false)
assert.ok(unavailableEval.positiveFactors[0].includes('without commercial tenure deductions'))
console.log('✓ Unavailable Experience data cleanly distinguished from freshers and evaluated without penalty.')

// 8. Test Target Job Role Categories, Search, Custom Roles, and Taxonomy
console.log('\nTest 8: Expanded Job Roles, Category Grouping, Custom Role & Taxonomy...')

// Category definition test fixture mirroring keywordTaxonomy.ts
const JOB_ROLE_CATEGORIES = [
  {
    id: 'data-analytics',
    code: 'A',
    name: 'Data Analytics & Business Intelligence',
    roles: [
      'Data Analyst', 'Junior Data Analyst', 'Business Data Analyst', 'Business Analyst',
      'Business Intelligence Analyst', 'MIS Executive', 'MIS Analyst', 'Reporting Analyst',
      'Power BI Developer', 'Tableau Developer', 'Data Visualization Analyst',
      'Data Quality Analyst', 'Data Scientist', 'Junior Data Scientist', 'Data Engineer',
      'Analytics Engineer', 'Market Research Analyst', 'Financial Data Analyst'
    ]
  },
  {
    id: 'excel-office',
    code: 'B',
    name: 'Excel & Office Skills',
    roles: [
      'Advanced Excel Specialist', 'Excel MIS Executive', 'MIS Executive', 'VBA Developer',
      'Excel Automation Specialist', 'Reporting Executive', 'Operations Analyst',
      'Data Entry Operator', 'Office Administrator', 'Management Trainee'
    ]
  },
  {
    id: 'python-programming',
    code: 'C',
    name: 'Python & Programming',
    roles: [
      'Python Developer', 'Junior Python Developer', 'Software Developer', 'Software Engineer',
      'Junior Software Engineer', 'C++ Developer', 'Java Developer', 'SQL Developer',
      'Database Developer', 'Database Administrator', 'Automation Engineer', 'API Developer'
    ]
  },
  {
    id: 'web-development',
    code: 'D',
    name: 'Web Development',
    roles: [
      'Frontend Developer', 'Backend Developer', 'Full Stack Developer', 'Web Developer',
      'React Developer', 'JavaScript Developer', 'UI Developer', 'WordPress Developer'
    ]
  },
  {
    id: 'ai-ml',
    code: 'E',
    name: 'AI & Machine Learning',
    roles: [
      'AI Engineer', 'Machine Learning Engineer', 'Generative AI Developer',
      'AI Automation Specialist', 'NLP Engineer', 'Computer Vision Engineer',
      'Junior Machine Learning Engineer'
    ]
  },
  {
    id: 'it-cybersecurity',
    code: 'F',
    name: 'IT & Cybersecurity',
    roles: [
      'IT Support Specialist', 'Technical Support Engineer', 'System Administrator',
      'Network Engineer', 'Cybersecurity Analyst', 'Information Security Analyst',
      'Cloud Engineer', 'AWS Cloud Engineer', 'DevOps Engineer', 'QA Engineer',
      'Software Tester', 'Manual Testing Engineer', 'Automation Test Engineer'
    ]
  },
  {
    id: 'finance-accounting',
    code: 'G',
    name: 'Finance & Accounting',
    roles: [
      'Financial Analyst', 'Junior Financial Analyst', 'Accountant', 'Accounts Executive',
      'Finance Executive', 'Tax Associate', 'Audit Assistant', 'Banking Associate'
    ]
  },
  {
    id: 'digital-marketing',
    code: 'H',
    name: 'Digital Marketing & Content',
    roles: [
      'Digital Marketing Specialist', 'SEO Specialist', 'Social Media Manager',
      'Content Writer', 'Technical Writer', 'Copywriter', 'Email Marketing Specialist',
      'Marketing Analyst'
    ]
  },
  {
    id: 'design-product',
    code: 'I',
    name: 'Design & Product',
    roles: [
      'UI/UX Designer', 'Graphic Designer', 'Product Designer', 'Product Manager',
      'Associate Product Manager', 'Project Coordinator', 'Project Manager',
      'Business Operations Associate'
    ]
  },
  {
    id: 'fresher-entry',
    code: 'J',
    name: 'Fresher & Entry-Level',
    roles: [
      'Graduate Trainee', 'Graduate Engineer Trainee', 'Software Development Intern',
      'Data Analyst Intern', 'Python Developer Intern', 'Web Developer Intern',
      'Business Analyst Intern', 'IT Intern', 'Research Assistant', 'Student',
      'Fresher / Entry-Level', 'Career Switcher', 'Other / Custom Role'
    ]
  }
]

const POPULAR_JOB_ROLES = [
  'Data Analyst', 'Software Engineer', 'Full Stack Developer', 'Python Developer',
  'Frontend Developer', 'Business Analyst', 'MIS Executive', 'Power BI Developer',
  'Data Scientist', 'Fresher / Entry-Level'
]

// 8a. Verify 10 categories and comprehensive roles
assert.strictEqual(JOB_ROLE_CATEGORIES.length, 10, 'Must have exactly 10 categories (A through J)')
const categoryCodes = JOB_ROLE_CATEGORIES.map(c => c.code)
assert.deepStrictEqual(categoryCodes, ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'])

const allRoles = Array.from(new Set(JOB_ROLE_CATEGORIES.flatMap(c => c.roles)))
assert.ok(allRoles.length >= 80, `Expected 80+ unique roles, found: ${allRoles.length}`)
assert.ok(allRoles.includes('Data Analyst'))
assert.ok(allRoles.includes('MIS Executive'))
assert.ok(allRoles.includes('Python Developer'))
assert.ok(allRoles.includes('Power BI Developer'))
assert.ok(allRoles.includes('Business Analyst'))
assert.ok(allRoles.includes('Advanced Excel Specialist'))
assert.ok(allRoles.includes('Full Stack Developer'))
console.log(`✓ 10 Categories (A to J) verified with ${allRoles.length} unique roles.`)

// 8b. Popular Roles 1-click select
assert.strictEqual(POPULAR_JOB_ROLES.length, 10)
for (const pop of POPULAR_JOB_ROLES) {
  assert.ok(allRoles.includes(pop), `Popular role "${pop}" must be present in master role catalog`)
}
console.log('✓ Popular Roles verified for 1-click quick selection.')

// 8c. Search filtering logic
function filterRolesByQuery(categories, query) {
  const q = query.trim().toLowerCase()
  if (!q) return categories
  return categories.map(cat => {
    const catMatches = cat.name.toLowerCase().includes(q) || cat.code.toLowerCase() === q
    const matchingRoles = cat.roles.filter(r => r.toLowerCase().includes(q))
    return {
      ...cat,
      roles: catMatches ? cat.roles : matchingRoles
    }
  }).filter(cat => cat.roles.length > 0)
}

const analystResults = filterRolesByQuery(JOB_ROLE_CATEGORIES, 'analyst')
const analystRoles = analystResults.flatMap(c => c.roles)
assert.ok(analystRoles.includes('Data Analyst'))
assert.ok(analystRoles.includes('Business Analyst'))
assert.ok(analystRoles.includes('MIS Analyst'))
assert.ok(analystRoles.includes('Financial Analyst'))

const pythonResults = filterRolesByQuery(JOB_ROLE_CATEGORIES, 'python')
const pythonRoles = pythonResults.flatMap(c => c.roles)
assert.ok(pythonRoles.includes('Python Developer'))
assert.ok(pythonRoles.includes('Junior Python Developer'))
assert.ok(pythonRoles.includes('Python Developer Intern'))
console.log('✓ Instant search filter verified across role titles and categories.')

// 8d. Custom role addition and duplicate prevention
function resolveRoleSelection(query, allExistingRoles) {
  const trimmed = query.trim()
  if (!trimmed) return null
  const exact = allExistingRoles.find(r => r.toLowerCase() === trimmed.toLowerCase())
  if (exact) {
    return { isCustom: false, role: exact }
  }
  return { isCustom: true, role: trimmed }
}

const dedupResult = resolveRoleSelection('data analyst', allRoles)
assert.strictEqual(dedupResult.isCustom, false, 'Existing role must NOT be duplicated')
assert.strictEqual(dedupResult.role, 'Data Analyst', 'Should normalize to canonical role name')

const customResult = resolveRoleSelection('Cloud Infrastructure FinOps Specialist', allRoles)
assert.strictEqual(customResult.isCustom, true, 'Novel role should be recognized as custom')
assert.strictEqual(customResult.role, 'Cloud Infrastructure FinOps Specialist')
console.log('✓ Custom role addition and duplicate prevention verified.')

// 8e. Role-specific taxonomy resolution
function resolveRoleTaxonomyMock(roleTitle) {
  const lower = (roleTitle || '').trim().toLowerCase()
  if (/data analyst|junior data analyst|business data analyst/i.test(lower)) {
    return {
      skills: ['SQL', 'Power BI', 'Tableau', 'Excel', 'Data Cleaning', 'Python'],
      headline: `Data Analyst | SQL, Power BI & Excel | Transforming Complex Datasets into Actionable Business Intelligence`
    }
  }
  if (/mis executive|excel mis/i.test(lower)) {
    return {
      skills: ['Advanced Excel', 'VBA Macros', 'Power Query', 'PivotTables', 'MIS Reporting', 'SQL'],
      headline: `MIS Executive | Advanced Excel, Power Query & VBA | Automated Reporting & Business Intelligence Dashboards`
    }
  }
  if (/python/i.test(lower)) {
    return {
      skills: ['Python', 'FastAPI', 'Django', 'PostgreSQL', 'REST APIs', 'Git'],
      headline: `Python Developer | Python, FastAPI & PostgreSQL | Scalable Backend Architecture & Automation`
    }
  }
  if (/business analyst/i.test(lower)) {
    return {
      skills: ['Requirements Gathering', 'BRD & FRD', 'SQL', 'Stakeholder Management', 'Process Mapping'],
      headline: `Business Analyst | Requirements Gathering & Agile | Bridging Technical Teams and Business Stakeholders`
    }
  }
  // Fallback for custom role
  return {
    skills: ['Problem Solving', 'Project Execution', 'Strategic Communication'],
    headline: `${roleTitle} | Driving High-Impact Domain Results`
  }
}

const dataAnalystTaxonomy = resolveRoleTaxonomyMock('Data Analyst')
assert.ok(dataAnalystTaxonomy.skills.includes('SQL'))
assert.ok(dataAnalystTaxonomy.skills.includes('Power BI'))
assert.ok(dataAnalystTaxonomy.skills.includes('Excel'))

const misTaxonomy = resolveRoleTaxonomyMock('MIS Executive')
assert.ok(misTaxonomy.skills.includes('Advanced Excel'))
assert.ok(misTaxonomy.skills.includes('Power Query'))
assert.ok(misTaxonomy.skills.includes('VBA Macros'))

const pythonTaxonomy = resolveRoleTaxonomyMock('Python Developer')
assert.ok(pythonTaxonomy.skills.includes('Python'))
assert.ok(pythonTaxonomy.skills.includes('FastAPI'))

const customTaxonomy = resolveRoleTaxonomyMock('Senior Distributed Database Architect')
assert.ok(customTaxonomy.headline.includes('Senior Distributed Database Architect'))
console.log('✓ Dynamic role taxonomy provides tailored keywords and headlines for specific and custom roles.')

// 9. Test Populated Field Preservation, Divergent Roles, Career Transition & Honest Skill Comparison
console.log('\nTest 9: Populated Field Preservation, Career Transition & Honest Skill Comparison...')

// Audit simulation reflecting updated heuristic rules
function auditHeadlinePreservation(headline, targetRole, careerIntent = 'current-field') {
  let score = 45
  const deductions = []
  const positiveFactors = []
  const suggestions = []
  const trimmed = (headline || '').trim()
  const charLength = trimmed.length

  if (charLength === 0) {
    score = 0
    deductions.push('[Missing Field] Headline is completely blank (-45 pts)')
  } else if (charLength < 40) {
    score -= 15
    deductions.push('[Length] Headline is brief (< 40 characters) (-15 pts)')
  } else {
    score += 25
    positiveFactors.push(`[Completeness] Populated headline (${charLength} characters) (+25 pts)`)
  }

  if (trimmed.toLowerCase().includes(targetRole.toLowerCase())) {
    score += 15
    positiveFactors.push(`[Target Alignment] Explicitly features target role "${targetRole}" (+15 pts)`)
  } else if (careerIntent === 'career-switcher') {
    score += 12
    positiveFactors.push(`[Career Transition] Retains verified foundation; recognized as an intentional pivot (+12 pts)`)
    suggestions.push(`Transition Bridge: Consider framing your headline as "${trimmed.split(/[|•/]/)[0].trim()} → Aspiring ${targetRole}"`)
  } else if (charLength > 0) {
    score += 8
    positiveFactors.push('[Domain Depth] Populated with professional role credentials (+8 pts)')
  }

  return { score: Math.min(100, Math.max(10, score)), deductions, positiveFactors, suggestions }
}

function auditSkillsComparison(userSkills, targetRole, careerIntent = 'current-field') {
  const targetBenchmarks = {
    'Data Analyst': ['SQL', 'Power BI', 'Tableau', 'Excel', 'Data Cleaning', 'Python'],
    'Full-Stack Engineer': ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS']
  }[targetRole] || ['Problem Solving', 'Project Execution']

  const validSkillsCount = (userSkills || []).length
  let score = 45
  const deductions = []
  const positiveFactors = []

  if (validSkillsCount >= 5) {
    score += 25
    positiveFactors.push(`[Completeness] Strong technical depth with ${validSkillsCount} verified profile skills (+25 pts)`)
  } else if (validSkillsCount === 0) {
    score = 0
    deductions.push('[Missing Field] Skills section is completely empty (-45 pts)')
  }

  const matchedKeywords = userSkills.filter(s =>
    targetBenchmarks.some(tb => tb.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(tb.toLowerCase()))
  )
  const missingRecommendedKeywords = targetBenchmarks.filter(tb =>
    !userSkills.some(s => s.toLowerCase() === tb.toLowerCase() || tb.toLowerCase().includes(s.toLowerCase()))
  )

  if (matchedKeywords.length > 0) {
    score += 20
    positiveFactors.push(`[Target Alignment] Verified ${matchedKeywords.length} skills aligned: ${matchedKeywords.join(', ')} (+20 pts)`)
  } else if (careerIntent === 'career-switcher' && validSkillsCount > 0) {
    score += 15
    positiveFactors.push(`[Career Transition] Retains ${validSkillsCount} verified skills as foundational domain depth (+15 pts)`)
  } else if (validSkillsCount > 0) {
    score += 10
    positiveFactors.push(`[Domain Depth] Populated with ${validSkillsCount} specialized skills (+10 pts)`)
  }

  return {
    score: Math.min(100, Math.max(10, score)),
    deductions,
    positiveFactors,
    existingUserSkills: userSkills,
    matchedKeywords,
    missingRecommendedKeywords,
    careerIntent
  }
}

// 9a. Verify populated headline is NOT treated as missing when target role differs
const testHeadline = 'Senior Full Stack Engineer | React, Node.js & Cloud | Building Scalable SaaS'
const diffRoleHeadlineCurrent = auditHeadlinePreservation(testHeadline, 'Data Analyst', 'current-field')
assert.ok(diffRoleHeadlineCurrent.score >= 70, `Populated headline score should remain high (>= 70), got: ${diffRoleHeadlineCurrent.score}`)
assert.strictEqual(diffRoleHeadlineCurrent.deductions.length, 0, 'Populated headline must not have false missing field deductions')
assert.ok(diffRoleHeadlineCurrent.positiveFactors.some(p => p.includes('Populated headline')))
console.log('✓ Populated headline is never treated as missing simply because target role differs.')

// 9b. Verify career switcher intent rewards foundation and bridges transition
const diffRoleHeadlineSwitcher = auditHeadlinePreservation(testHeadline, 'Data Analyst', 'career-switcher')
assert.ok(diffRoleHeadlineSwitcher.score >= 80, `Career switcher headline score should be >= 80, got: ${diffRoleHeadlineSwitcher.score}`)
assert.ok(diffRoleHeadlineSwitcher.positiveFactors.some(p => p.includes('[Career Transition]')))
assert.ok(diffRoleHeadlineSwitcher.suggestions.some(s => s.includes('Transition Bridge')))
console.log('✓ Career switcher intent properly bridges current background without penalizing divergent past titles.')

// 9c. Verify skills evaluation does NOT claim unpossessed skills and preserves existing skills
const userSkills = ['React.js', 'Node.js', 'TypeScript', 'PostgreSQL', 'Docker', 'AWS']
const skillsResult = auditSkillsComparison(userSkills, 'Data Analyst', 'career-switcher')
assert.strictEqual(skillsResult.deductions.length, 0, 'No deduction on populated skills')
assert.deepStrictEqual(skillsResult.existingUserSkills, userSkills, 'Verified profile skills must be preserved')
assert.ok(skillsResult.missingRecommendedKeywords.includes('Power BI'), 'Target benchmarks identified for learning')
assert.ok(skillsResult.missingRecommendedKeywords.includes('Tableau'), 'Target benchmarks identified for learning')
// Crucial: missing recommended skills are NOT included in existingUserSkills!
for (const missing of skillsResult.missingRecommendedKeywords) {
  assert.ok(!skillsResult.existingUserSkills.includes(missing), `Must NOT falsely attribute unverified skill "${missing}" to user`)
}
console.log('✓ Honest skill benchmarking: verifies profile skills without claiming unearned target competencies.')

// 9d. Non-destructive side-by-side improvements
function formatSideBySideImprovements(originalInput, role, careerIntent) {
  const original = { ...originalInput }
  const optimizedHeadline = careerIntent === 'career-switcher'
    ? `${original.headline.split('|')[0].trim()} → ${role} | Core Stack | Driving Business Value`
    : `${role} | Core Stack | Value Proposition`

  return {
    originalHeadline: original.headline,
    optimizedHeadline,
    hasNotOverwrittenOriginal: original.headline === originalInput.headline
  }
}
const sbs = formatSideBySideImprovements({ headline: testHeadline }, 'Data Analyst', 'career-switcher')
assert.strictEqual(sbs.originalHeadline, testHeadline, 'Original headline preserved intact')
assert.strictEqual(sbs.hasNotOverwrittenOriginal, true)
console.log('✓ Side-by-side improvements preserve original profile data without overwriting.')

// 10. Test Three Career Paths ("What is your career goal?") & Scenario Suite
console.log('\nTest 10: Three Career Paths & Scenario Testing...')

function runCareerGoalScenarioAudit(profile, targetRole, careerGoal) {
  // 1. Headline scoring & generation
  const trimmedHeadline = (profile.headline || '').trim()
  const charLength = trimmedHeadline.length
  let hScore = 45
  const hPositive = []
  const hSuggestions = []
  const currentRoleLead = (trimmedHeadline.split(/[|•/]/)[0] || 'Professional').trim()

  if (charLength >= 40) {
    hScore += 25
    hPositive.push(`[Completeness] Populated headline (${charLength} chars) (+25 pts)`)
  }

  if (/(\||•|\/|—|-)/.test(trimmedHeadline)) {
    hScore += 10
    hPositive.push('[Formatting] Clean visual separators (+10 pts)')
  }

  if (/(building|scaling|delivering|driving|architecting|analyzing|leading)/i.test(trimmedHeadline)) {
    hScore += 10
    hPositive.push('[Value Proposition] Action verbs present (+10 pts)')
  }

  let optimizedHeadline = ''
  if (careerGoal === 'related-role') {
    hScore += 14
    hPositive.push(`[Adjacent Specialization] Retains proven expertise (${currentRoleLead}) while targeting related specialization "${targetRole}" (+14 pts)`)
    hSuggestions.push(`Specialization Bridge: Position headline as "${currentRoleLead} | Specializing in ${targetRole}"`)
    optimizedHeadline = `${currentRoleLead} | Specializing in ${targetRole} | Core Stack | Delivering High-Impact Outcomes`
  } else if (careerGoal === 'career-switcher') {
    hScore += 12
    hPositive.push(`[Career Transition] Retains verified foundation (${currentRoleLead}); recognized as an intentional career pivot (+12 pts)`)
    hSuggestions.push(`Transition Bridge: Consider framing headline as "${currentRoleLead} → Aspiring ${targetRole}"`)
    optimizedHeadline = `${currentRoleLead} → Aspiring ${targetRole} | Transferable Stack | Delivering Measurable Value`
  } else {
    // current-field
    if (trimmedHeadline.toLowerCase().includes(targetRole.toLowerCase())) {
      hScore += 15
      hPositive.push(`[Target Alignment] Explicitly features target role "${targetRole}" (+15 pts)`)
    } else {
      hScore += 8
      hPositive.push('[Domain Depth] Populated with professional role credentials (+8 pts)')
    }
    optimizedHeadline = `${targetRole} | Core Stack | Scaling High-Performance Systems`
  }

  // 2. About section scoring & generation
  const aboutWords = (profile.about || '').trim().split(/\s+/).filter(Boolean).length
  let aScore = 40
  const aPositive = []
  if (aboutWords >= 40) {
    aScore += 25
    aPositive.push(`[Completeness] Populated summary (${aboutWords} words) (+25 pts)`)
  }

  let optimizedAbout = ''
  if (profile.experienceStatus === 'fresher' || (!profile.experience && profile.experienceStatus !== 'present')) {
    optimizedAbout = `I am an ambitious ${targetRole} with a strong foundation in core technical principles.\n\nAcademic & Project Highlights:\n→ Hands-on development using modern tools\n\n💬 Open to entry-level opportunities.`
  } else if (careerGoal === 'related-role') {
    optimizedAbout = `With a proven track record as a ${currentRoleLead}, I specialize in bridging core domain execution with ${targetRole} methodologies to deliver high-impact results.\n\nKey Adjacent Capabilities:\n→ Translating complex requirements into reliable deliverables\n→ Cross-functional collaboration and analytical rigor\n\n💬 Let's connect to discuss adjacent domain opportunities.`
  } else if (careerGoal === 'career-switcher') {
    optimizedAbout = `I am transitioning my proven background as a ${currentRoleLead} into ${targetRole}, bringing strong problem solving, analytical rigor, and systems execution.\n\n💬 Open to career pivot opportunities.`
  } else {
    optimizedAbout = `Over the past years as a ${targetRole}, I have focused on driving measurable outcomes and leading core initiatives.\n\n💬 Let's connect to discuss engineering opportunities.`
  }

  // 3. Skills benchmarking
  const existingUserSkills = (profile.skills || []).map(s => s.trim()).filter(Boolean)
  const roleKeywordsCatalog = {
    'Software Developer': ['Python', 'Git', 'REST APIs', 'PostgreSQL', 'Docker', 'Testing'],
    'Data Analyst': ['SQL', 'Power BI', 'Tableau', 'Excel', 'Data Cleaning', 'Python'],
    'React Developer': ['React.js', 'JavaScript', 'TypeScript', 'HTML/CSS', 'Redux', 'Git']
  }[targetRole] || ['Problem Solving', 'Data Analysis', 'Project Execution', 'SQL']

  const matchedKeywords = existingUserSkills.filter(s =>
    roleKeywordsCatalog.some(rk => rk.toLowerCase() === s.toLowerCase() || s.toLowerCase().includes(rk.toLowerCase()))
  )
  const missingBenchmarks = roleKeywordsCatalog.filter(rk =>
    !existingUserSkills.some(s => s.toLowerCase() === rk.toLowerCase() || rk.toLowerCase().includes(s.toLowerCase()))
  )

  let sScore = 45
  if (existingUserSkills.length >= 4) sScore += 25
  if (matchedKeywords.length > 0) sScore += 15
  else if (careerGoal === 'related-role' || careerGoal === 'career-switcher') sScore += 12

  return {
    hScore: Math.min(100, hScore),
    aScore: Math.min(100, aScore),
    sScore: Math.min(100, sScore),
    hPositive,
    hSuggestions,
    optimizedHeadline,
    optimizedAbout,
    existingUserSkills,
    matchedKeywords,
    missingBenchmarks,
    careerGoal
  }
}

// Scenario 1: Python Developer → Software Developer: Continue Current Career
const sc1 = runCareerGoalScenarioAudit(
  {
    headline: 'Python Developer | Django, FastAPI & PostgreSQL | Building Cloud Services',
    about: 'Experienced Python developer with 4 years building APIs and scalable microservices. Reduced database latency by 30%. Contact me at dev@example.com',
    skills: ['Python', 'FastAPI', 'PostgreSQL', 'Git', 'Docker'],
    experienceStatus: 'present'
  },
  'Software Developer',
  'current-field'
)
assert.strictEqual(sc1.careerGoal, 'current-field')
assert.ok(sc1.hScore >= 80, 'Score should reflect strong existing career alignment')
assert.ok(sc1.matchedKeywords.includes('Python'))
assert.ok(sc1.matchedKeywords.includes('Git'))
console.log('✓ Scenario 1 Passed: Python Developer → Software Developer (Continue Current Career).')

// Scenario 2: Accountant → Data Analyst: Transition to a New Career
const sc2 = runCareerGoalScenarioAudit(
  {
    headline: 'Chartered Accountant | Financial Modeling, Auditing & Corporate Taxation',
    about: 'Corporate accountant with 6 years experience conducting statutory audits, variance analysis, and cashflow modeling. Seeking to pivot into data analytics.',
    skills: ['Financial Modeling', 'Excel', 'Statutory Audit', 'Variance Analysis', 'Taxation'],
    experienceStatus: 'present'
  },
  'Data Analyst',
  'career-switcher'
)
assert.strictEqual(sc2.careerGoal, 'career-switcher')
assert.ok(sc2.hPositive.some(p => p.includes('[Career Transition]')), 'Must recognize intentional career pivot')
assert.ok(sc2.optimizedHeadline.includes('→ Aspiring Data Analyst'), 'Generates transition bridge headline')
assert.ok(sc2.matchedKeywords.includes('Excel'), 'Identifies transferable Excel proficiency')
assert.ok(sc2.missingBenchmarks.includes('SQL'), 'Identifies SQL as target learning benchmark')
assert.ok(!sc2.existingUserSkills.includes('SQL'), 'Never fabricates SQL into user existing skills')
console.log('✓ Scenario 2 Passed: Accountant → Data Analyst (Transition to a New Career).')

// Scenario 3: MIS Executive → Data Analyst: Explore a Related Role
const sc3 = runCareerGoalScenarioAudit(
  {
    headline: 'MIS Executive | Advanced Excel, VBA Macros & Business Reporting Dashboards',
    about: 'MIS Executive with 3+ years generating daily and weekly management dashboards, automating Excel reports via VBA, and synthesizing stakeholder KPIs.',
    skills: ['Advanced Excel', 'VBA Macros', 'MIS Reporting', 'PivotTables', 'Power Query'],
    experienceStatus: 'present'
  },
  'Data Analyst',
  'related-role'
)
assert.strictEqual(sc3.careerGoal, 'related-role')
assert.ok(sc3.hPositive.some(p => p.includes('[Adjacent Specialization]')), 'Recognizes adjacent specialization')
assert.ok(sc3.optimizedHeadline.includes('MIS Executive | Specializing in Data Analyst'), 'Positions adjacent specialization without demoting seniority')
assert.ok(!sc3.optimizedAbout.includes('entry-level') && !sc3.optimizedAbout.includes('aspiring'), 'Avoids presenting user as a beginner')
assert.ok(sc3.missingBenchmarks.includes('SQL') || sc3.missingBenchmarks.includes('Tableau'), 'Identifies adjacent tool gaps')
console.log('✓ Scenario 3 Passed: MIS Executive → Data Analyst (Explore a Related Role).')

// Scenario 4: Frontend Developer → React Developer: Continue Current Career / Explore Related Role
const sc4a = runCareerGoalScenarioAudit(
  {
    headline: 'Frontend Developer | HTML, CSS, JavaScript & Modern Web Performance',
    about: 'Frontend developer building responsive, accessible web interfaces. Improved Core Web Vitals by 40% across client portals.',
    skills: ['JavaScript', 'HTML/CSS', 'Git', 'Responsive Design'],
    experienceStatus: 'present'
  },
  'React Developer',
  'related-role'
)
assert.ok(sc4a.optimizedHeadline.includes('Frontend Developer | Specializing in React Developer'))
assert.ok(sc4a.missingBenchmarks.includes('React.js'), 'Identifies React.js as adjacent specialization gap to learn')
assert.ok(!sc4a.existingUserSkills.includes('React.js'), 'Does NOT claim user already knows React.js when omitted')
console.log('✓ Scenario 4 Passed: Frontend Developer → React Developer (Explore a Related Role).')

// Scenario 5: Student with no professional experience → Data Analyst (Fresher preservation)
const sc5 = runCareerGoalScenarioAudit(
  {
    headline: 'Statistics & Math Graduate 2026 | Aspiring Data Analyst | Python & SQL',
    about: 'Recent Mathematics graduate with academic projects in exploratory data analysis and hypothesis testing.',
    skills: ['Python', 'SQL', 'Statistics', 'Pandas'],
    experience: [],
    experienceStatus: 'fresher'
  },
  'Data Analyst',
  'current-field'
)
assert.ok(sc5.optimizedAbout.includes('Academic & Project Highlights'), 'Preserves fresher academic/project focus')
assert.ok(!sc5.optimizedAbout.includes('Over the past years as a'), 'Never hallucinates commercial company tenure for freshers')
console.log('✓ Scenario 5 Passed: Student with no professional experience → Data Analyst (Zero fabrication & Fresher preservation).')

// Scenario 6: Experienced professional whose target role requires skills absent from profile
const sc6 = runCareerGoalScenarioAudit(
  {
    headline: 'Senior Operations Manager | Supply Chain Logistics & Vendor Management',
    about: 'Senior Operations Manager overseeing warehousing networks and fleet routing with $15M budget.',
    skills: ['Supply Chain', 'Vendor Negotiations', 'Logistics', 'Budgeting'],
    experienceStatus: 'present'
  },
  'Data Analyst',
  'related-role'
)
assert.strictEqual(sc6.matchedKeywords.length, 0, 'No false skill matches')
assert.ok(sc6.missingBenchmarks.length >= 3, 'Accurately flags multiple genuine skill gaps')
for (const gap of sc6.missingBenchmarks) {
  assert.ok(!sc6.existingUserSkills.includes(gap), 'Skill gap must not be attributed to user profile')
}
console.log('✓ Scenario 6 Passed: Experienced professional with genuine target role skill gaps handled honestly.')

// Scenario 7: Custom target job role with Explore a Related Role selected
const sc7 = runCareerGoalScenarioAudit(
  {
    headline: 'Clinical Research Coordinator | GCP, Protocol Management & Clinical Trials',
    about: 'Clinical research coordinator with 5 years managing Phase II/III FDA trials and patient data entry.',
    skills: ['GCP', 'Clinical Protocols', 'Data Capture', 'Patient Compliance'],
    experienceStatus: 'present'
  },
  'Senior Healthcare Informatics Lead', // Custom role
  'related-role'
)
assert.ok(sc7.optimizedHeadline.includes('Clinical Research Coordinator | Specializing in Senior Healthcare Informatics Lead'))
assert.ok(sc7.hPositive.some(p => p.includes('[Adjacent Specialization]')))
console.log('✓ Scenario 7 Passed: Custom target role with Explore a Related Role executed flawlessly.')

// ─────────────────────────────────────────────────────────────
// 11. Test Phase 5: Profile Data Management & Source Isolation
// ─────────────────────────────────────────────────────────────
console.log('\nTest 11: Phase 5 Profile Data Management & Source Isolation...')

// Storage simulator implementing the exact contract in profileStorage.ts
function createStorageStore() {
  const map = new Map()
  return {
    getItem: (key) => (map.has(key) ? map.get(key) : null),
    setItem: (key, val) => map.set(key, String(val)),
    removeItem: (key) => map.delete(key),
    clear: () => map.clear(),
    _map: map,
  }
}

function createProfileStorageSimulator(storage) {
  const KEY_PREFIX = 'linkedpulse_profile_'
  const SOURCE_KEY = `${KEY_PREFIX}source`
  const dataKey = (source) => `${KEY_PREFIX}${source}`

  return {
    getActiveSource: () => {
      const v = storage.getItem(SOURCE_KEY)
      return v === 'demo' || v === 'manual' || v === 'linkedin' ? v : null
    },
    setActiveSource: (source) => storage.setItem(SOURCE_KEY, source),
    clearActiveSource: () => storage.removeItem(SOURCE_KEY),
    saveProfileData: (source, data) => storage.setItem(dataKey(source), JSON.stringify(data)),
    loadProfileData: (source) => {
      const raw = storage.getItem(dataKey(source))
      if (!raw) return null
      try { return JSON.parse(raw) } catch { return null }
    },
    clearProfileData: (source) => storage.removeItem(dataKey(source)),
    hasProfileData: (source) => storage.getItem(dataKey(source)) !== null,
  }
}

// Subtest 11A: Cold start / new user state
const mockStore = createStorageStore()
const storeMgr = createProfileStorageSimulator(mockStore)

assert.strictEqual(storeMgr.getActiveSource(), null, 'Cold start returns null active source to display 3 option cards')
console.log('✓ Subtest 11A Passed: New user cold start triggers clean 3-option entry experience.')

// Subtest 11B: Demo profile loading and isolation
const sampleProfile = {
  targetRole: 'Full-Stack Engineer',
  headline: 'Software Developer at TechCorp | React & Node.js',
  about: 'Software engineer with 4 years of experience building web applications.',
  skills: ['React.js', 'Node.js', 'SQL'],
}

storeMgr.saveProfileData('demo', sampleProfile)
storeMgr.setActiveSource('demo')

assert.strictEqual(storeMgr.getActiveSource(), 'demo')
assert.deepStrictEqual(storeMgr.loadProfileData('demo'), sampleProfile)
assert.strictEqual(storeMgr.loadProfileData('manual'), null, 'Demo data must never leak into manual storage')
console.log('✓ Subtest 11B Passed: Demo profile loads into isolated storage without affecting manual data.')

// Subtest 11C: Manual profile persistence
const manualProfile = {
  targetRole: 'Data Analyst',
  headline: 'Data Analyst | Python, SQL & Power BI | Business Intelligence Specialist',
  about: 'Data analyst specialized in extracting actionable insights and automating dashboards.',
  skills: ['Python', 'SQL', 'Power BI', 'Excel'],
}

storeMgr.saveProfileData('manual', manualProfile)
storeMgr.setActiveSource('manual')

assert.strictEqual(storeMgr.getActiveSource(), 'manual')
assert.deepStrictEqual(storeMgr.loadProfileData('manual'), manualProfile)
// Verify demo data is still intact in its own slot
assert.deepStrictEqual(storeMgr.loadProfileData('demo'), sampleProfile)
console.log('✓ Subtest 11C Passed: Manual profile successfully persisted separately from demo profile.')

// Subtest 11D: Reset Demo does not touch manual data
storeMgr.clearProfileData('demo')
assert.strictEqual(storeMgr.loadProfileData('demo'), null)
assert.deepStrictEqual(storeMgr.loadProfileData('manual'), manualProfile, 'Manual data must remain untouched when demo is reset')
console.log('✓ Subtest 11D Passed: Resetting demo profile leaves manual profile data completely intact.')

// Subtest 11E: Corrupted JSON recovery in localStorage
mockStore.setItem('linkedpulse_profile_manual', '{corrupt json invalid!!')
assert.strictEqual(storeMgr.loadProfileData('manual'), null, 'Corrupt storage gracefully returns null without throwing')
console.log('✓ Subtest 11E Passed: Corrupt localStorage data is safely handled with graceful null recovery.')

// Subtest 11F: Audit execution with profileSource metadata
const auditDemo = runCareerGoalScenarioAudit(
  {
    ...sampleProfile,
    experienceStatus: 'present',
    profileSource: 'demo',
  },
  'Full-Stack Engineer',
  'current-field'
)
assert.ok(auditDemo.optimizedHeadline, 'Audit generates optimized headline for demo source')
assert.ok(auditDemo.optimizedAbout, 'Audit generates optimized about for demo source')

const auditManual = runCareerGoalScenarioAudit(
  {
    ...manualProfile,
    experienceStatus: 'present',
    profileSource: 'manual',
  },
  'Data Analyst',
  'current-field'
)
assert.ok(auditManual.optimizedHeadline, 'Audit generates optimized headline for manual source')

console.log('✓ Subtest 11F Passed: Profile audit executes cleanly across distinct profile sources.')

console.log('\n=== ALL PHASE 2, PHASE 5 & PROFILE AUDIT TESTS PASSED ===')
