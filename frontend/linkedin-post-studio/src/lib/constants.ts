import type { NavItem, DashboardStats, Post, ProfileOptimization, PostTone } from '@/types'

// ─── Navigation ──────────────────────────────────
export const NAV_ITEMS: NavItem[] = [
  { label: 'Dashboard', path: '/dashboard', icon: 'LayoutDashboard' },
  { label: 'Profile Optimizer', path: '/optimize', icon: 'UserCheck' },
  { label: 'Post Studio', path: '/post-studio', icon: 'PenSquare' },
  { label: 'My Content', path: '/content', icon: 'FolderOpen' },
  { label: 'Settings', path: '/settings', icon: 'Settings' },
]

// ─── Post Tones ──────────────────────────────────
export const POST_TONES: { value: PostTone; label: string; description: string; emoji: string }[] = [
  { value: 'professional', label: 'Professional', description: 'Polished & corporate-ready', emoji: '💼' },
  { value: 'educational', label: 'Educational', description: 'Teach & share knowledge', emoji: '📚' },
  { value: 'storytelling', label: 'Storytelling', description: 'Narrative & engaging', emoji: '📖' },
  { value: 'personal-branding', label: 'Personal Branding', description: 'Authentic & memorable', emoji: '⭐' },
]

// ─── File Upload Constraints ─────────────────────
export const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const MAX_IMAGE_SIZE_MB = 5
export const ALLOWED_PDF_TYPES = ['application/pdf']
export const MAX_PDF_SIZE_MB = 10

// ─── Profile Score Weights ───────────────────────
export const SCORE_WEIGHTS = {
  headline: 0.25,
  about: 0.30,
  experience: 0.25,
  skills: 0.20,
}

// ─── Mock Data ───────────────────────────────────
export const MOCK_DASHBOARD_STATS: DashboardStats = {
  totalOptimizations: 12,
  postsCreated: 34,
  postsDrafted: 8,
  averageScore: 82,
}

export const MOCK_PROFILE_OPTIMIZATION: ProfileOptimization = {
  id: 'opt-1',
  userId: 'user-1',
  inputType: 'text',
  originalData: {
    headline: 'Software Developer at TechCorp',
    about: 'I am a software developer with 5 years of experience. I know React, Node.js and Python. Looking for new opportunities.',
    experience: [
      {
        title: 'Software Developer',
        company: 'TechCorp',
        duration: '2021 - Present',
        description: 'Working on web applications using React and Node.js.',
      },
      {
        title: 'Junior Developer',
        company: 'StartupXYZ',
        duration: '2019 - 2021',
        description: 'Helped build the company website and internal tools.',
      },
    ],
    skills: ['React', 'Node.js', 'Python', 'JavaScript', 'HTML', 'CSS'],
  },
  optimizedData: {
    headline: {
      name: 'Headline',
      original: 'Software Developer at TechCorp',
      optimized: 'Senior Full-Stack Engineer | React & Node.js | Building Scalable Web Applications that Drive Business Growth',
      score: 92,
      maxScore: 100,
      suggestions: [
        'Added specific tech stack for recruiter searchability',
        'Included value proposition to stand out',
        'Used separator format preferred by LinkedIn algorithm',
      ],
      isEdited: false,
    },
    about: {
      name: 'About',
      original: 'I am a software developer with 5 years of experience. I know React, Node.js and Python. Looking for new opportunities.',
      optimized: 'I architect high-performance web applications that have served 2M+ users across fintech and SaaS platforms.\n\nOver the past 5 years, I\'ve specialized in:\n→ Full-stack development with React, Node.js & Python\n→ System design for scalable microservices\n→ Reducing infrastructure costs by up to 35%\n\nAt TechCorp, I led the migration to a modern tech stack that improved page load times by 60% and increased user engagement by 25%.\n\nI\'m passionate about clean architecture and mentoring the next generation of engineers.\n\n💬 Let\'s connect if you\'re building something ambitious.',
      score: 88,
      maxScore: 100,
      suggestions: [
        'Added quantifiable achievements for credibility',
        'Structured with visual hierarchy using arrow bullets',
        'Included a clear call-to-action',
        'Opening hook grabs attention immediately',
      ],
      isEdited: false,
    },
    experience: {
      name: 'Experience',
      original: 'Working on web applications using React and Node.js.',
      optimized: '→ Architected and deployed 3 production microservices processing 500K+ daily requests\n→ Led frontend migration to React 18, improving Lighthouse score from 52 to 94\n→ Mentored 4 junior developers through structured code review processes\n→ Reduced CI/CD pipeline time by 40% through Docker optimization',
      score: 85,
      maxScore: 100,
      suggestions: [
        'Added quantifiable metrics to each bullet point',
        'Used action verbs (Architected, Led, Mentored, Reduced)',
        'Highlighted leadership and mentoring',
      ],
      isEdited: false,
    },
    skills: {
      name: 'Skills',
      original: 'React, Node.js, Python, JavaScript, HTML, CSS',
      optimized: 'React.js, TypeScript, Node.js, Python, System Design, Cloud Architecture (AWS), Docker, PostgreSQL, REST APIs, Microservices',
      score: 90,
      maxScore: 100,
      suggestions: [
        'Prioritized high-demand skills first',
        'Added missing in-demand skills: TypeScript, System Design, Docker',
        'Replaced generic skills (HTML/CSS) with specialized ones',
      ],
      isEdited: false,
    },
    keywords: [
      'Full Stack', 'React.js', 'Node.js', 'TypeScript', 'System Design',
      'Cloud Architecture', 'Microservices', 'API Design', 'Scalability',
    ],
  },
  scoreBefore: 38,
  scoreAfter: 89,
  createdAt: new Date().toISOString(),
}

export const MOCK_POSTS: Post[] = [
  {
    id: 'post-1',
    userId: 'user-1',
    content: 'Most developers think writing clean code is about following rigid rules.\n\nIn reality, clean code is about empathy for the engineer reading it 6 months from now.\n\nHere are 3 refactoring principles that changed how I write code:\n\n1. Name things by what they DO, not what they ARE\n2. If a function needs a comment to explain it, it needs a better name\n3. The best abstraction is the one you don\'t create\n\nWhat\'s your #1 clean code principle?\n\n#SoftwareEngineering #CleanCode #WebDevelopment',
    tone: 'educational',
    length: 'medium',
    imageUrl: null,
    hashtags: ['SoftwareEngineering', 'CleanCode', 'WebDevelopment'],
    hook: 'Most developers think writing clean code is about following rigid rules.',
    status: 'draft',
    publishedAt: null,
    linkedinPostId: null,
    createdAt: new Date(Date.now() - 86400000).toISOString(),
    updatedAt: new Date(Date.now() - 86400000).toISOString(),
  },
  {
    id: 'post-2',
    userId: 'user-1',
    content: 'We just hit 1M API calls per day. 🚀\n\nA year ago, our system could barely handle 10K.\n\nHere\'s what changed everything:\n\n→ We moved from a monolith to event-driven microservices\n→ Implemented intelligent caching that reduced DB load by 70%\n→ Built a custom rate limiter that actually works under pressure\n\nThe biggest lesson? Architecture isn\'t about the tech stack — it\'s about understanding your data flow.\n\nGrateful for the team that made this possible.\n\n#Engineering #Scalability #TechLeadership',
    tone: 'storytelling',
    length: 'medium',
    imageUrl: null,
    hashtags: ['Engineering', 'Scalability', 'TechLeadership'],
    hook: 'We just hit 1M API calls per day. 🚀',
    status: 'published',
    publishedAt: new Date(Date.now() - 172800000).toISOString(),
    linkedinPostId: null,
    createdAt: new Date(Date.now() - 259200000).toISOString(),
    updatedAt: new Date(Date.now() - 172800000).toISOString(),
  },
  {
    id: 'post-3',
    userId: 'user-1',
    content: 'Stop applying to jobs. Start building in public instead.\n\nI\'ve gotten 3 job offers this year without sending a single application.\n\nHow? By sharing what I learn, every single week.\n\n#PersonalBranding #CareerGrowth #LinkedIn',
    tone: 'personal-branding',
    length: 'short',
    imageUrl: null,
    hashtags: ['PersonalBranding', 'CareerGrowth', 'LinkedIn'],
    hook: 'Stop applying to jobs. Start building in public instead.',
    status: 'draft',
    publishedAt: null,
    linkedinPostId: null,
    createdAt: new Date(Date.now() - 43200000).toISOString(),
    updatedAt: new Date(Date.now() - 43200000).toISOString(),
  },
]

// ─── API Configuration ───────────────────────────
export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api'

// ─── App Info ────────────────────────────────────
export const APP_NAME = 'LinkedIn Optimizer & Post Studio'
export const APP_SHORT_NAME = 'LinkOptimize'
