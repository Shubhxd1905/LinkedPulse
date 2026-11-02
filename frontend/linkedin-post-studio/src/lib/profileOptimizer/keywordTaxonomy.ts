// Keyword taxonomy and role dictionary for profile heuristic analysis and AI optimization

export interface RoleTaxonomy {
  title: string
  coreKeywords: string[]
  recommendedSkills: string[]
  valuePropositionTemplate: string
  actionVerbs: string[]
  sampleProjects?: string[]
  certifications?: string[]
}

export interface RoleCategory {
  id: string
  code: string
  name: string
  description: string
  roles: string[]
}

export const JOB_ROLE_CATEGORIES: RoleCategory[] = [
  {
    id: 'data-analytics',
    code: 'A',
    name: 'Data Analytics & Business Intelligence',
    description: 'Data transformation, SQL, BI dashboards, and commercial insights',
    roles: [
      'Data Analyst',
      'Junior Data Analyst',
      'Business Data Analyst',
      'Business Analyst',
      'Business Intelligence Analyst',
      'MIS Executive',
      'MIS Analyst',
      'Reporting Analyst',
      'Power BI Developer',
      'Tableau Developer',
      'Data Visualization Analyst',
      'Data Quality Analyst',
      'Data Scientist',
      'Junior Data Scientist',
      'Data Engineer',
      'Analytics Engineer',
      'Market Research Analyst',
      'Financial Data Analyst',
    ],
  },
  {
    id: 'excel-office',
    code: 'B',
    name: 'Excel & Office Skills',
    description: 'Advanced spreadsheets, automated workflows, and management reporting',
    roles: [
      'Advanced Excel Specialist',
      'Excel MIS Executive',
      'MIS Executive',
      'VBA Developer',
      'Excel Automation Specialist',
      'Reporting Executive',
      'Operations Analyst',
      'Data Entry Operator',
      'Office Administrator',
      'Management Trainee',
    ],
  },
  {
    id: 'python-programming',
    code: 'C',
    name: 'Python & Programming',
    description: 'Backend engineering, scripting, database architecture, and automation',
    roles: [
      'Python Developer',
      'Junior Python Developer',
      'Software Developer',
      'Software Engineer',
      'Junior Software Engineer',
      'C++ Developer',
      'Java Developer',
      'SQL Developer',
      'Database Developer',
      'Database Administrator',
      'Automation Engineer',
      'API Developer',
    ],
  },
  {
    id: 'web-development',
    code: 'D',
    name: 'Web Development',
    description: 'Modern frontends, responsive user experiences, and web applications',
    roles: [
      'Frontend Developer',
      'Backend Developer',
      'Full Stack Developer',
      'Web Developer',
      'React Developer',
      'JavaScript Developer',
      'UI Developer',
      'WordPress Developer',
    ],
  },
  {
    id: 'ai-ml',
    code: 'E',
    name: 'AI & Machine Learning',
    description: 'Predictive modeling, deep learning, NLP, and Generative AI systems',
    roles: [
      'AI Engineer',
      'Machine Learning Engineer',
      'Generative AI Developer',
      'AI Automation Specialist',
      'NLP Engineer',
      'Computer Vision Engineer',
      'Junior Machine Learning Engineer',
    ],
  },
  {
    id: 'it-cybersecurity',
    code: 'F',
    name: 'IT & Cybersecurity',
    description: 'Infrastructure, cloud platforms, security protocols, and QA testing',
    roles: [
      'IT Support Specialist',
      'Technical Support Engineer',
      'System Administrator',
      'Network Engineer',
      'Cybersecurity Analyst',
      'Information Security Analyst',
      'Cloud Engineer',
      'AWS Cloud Engineer',
      'DevOps Engineer',
      'QA Engineer',
      'Software Tester',
      'Manual Testing Engineer',
      'Automation Test Engineer',
    ],
  },
  {
    id: 'finance-accounting',
    code: 'G',
    name: 'Finance & Accounting',
    description: 'Financial analysis, corporate accounting, tax compliance, and auditing',
    roles: [
      'Financial Analyst',
      'Junior Financial Analyst',
      'Accountant',
      'Accounts Executive',
      'Finance Executive',
      'Tax Associate',
      'Audit Assistant',
      'Banking Associate',
    ],
  },
  {
    id: 'digital-marketing',
    code: 'H',
    name: 'Digital Marketing & Content',
    description: 'Search visibility, audience growth, storytelling, and marketing analytics',
    roles: [
      'Digital Marketing Specialist',
      'SEO Specialist',
      'Social Media Manager',
      'Content Writer',
      'Technical Writer',
      'Copywriter',
      'Email Marketing Specialist',
      'Marketing Analyst',
    ],
  },
  {
    id: 'design-product',
    code: 'I',
    name: 'Design & Product',
    description: 'User experience, product roadmaps, visual interfaces, and project execution',
    roles: [
      'UI/UX Designer',
      'Graphic Designer',
      'Product Designer',
      'Product Manager',
      'Associate Product Manager',
      'Project Coordinator',
      'Project Manager',
      'Business Operations Associate',
    ],
  },
  {
    id: 'fresher-entry',
    code: 'J',
    name: 'Fresher & Entry-Level',
    description: 'Internships, early-career paths, student portfolios, and career transitions',
    roles: [
      'Graduate Trainee',
      'Graduate Engineer Trainee',
      'Software Development Intern',
      'Data Analyst Intern',
      'Python Developer Intern',
      'Web Developer Intern',
      'Business Analyst Intern',
      'IT Intern',
      'Research Assistant',
      'Student',
      'Fresher / Entry-Level',
      'Career Switcher',
      'Other / Custom Role',
    ],
  },
]

// Prominent popular roles displayed first for 1-click access
export const POPULAR_JOB_ROLES: string[] = [
  'Data Analyst',
  'Software Engineer',
  'Full Stack Developer',
  'Python Developer',
  'Frontend Developer',
  'Business Analyst',
  'MIS Executive',
  'Power BI Developer',
  'Data Scientist',
  'Fresher / Entry-Level',
]

// De-duplicated list of all recognized job roles
export const ALL_UNIQUE_JOB_ROLES: string[] = Array.from(
  new Set(JOB_ROLE_CATEGORIES.flatMap((c) => c.roles))
)

// Maintained for backward compatibility
export const TARGET_ROLE_OPTIONS = ALL_UNIQUE_JOB_ROLES

// Rich role taxonomies for heuristic analysis and recommendation generation
export const ROLE_TAXONOMY: Record<string, RoleTaxonomy> = {
  // ── DATA ANALYTICS & BI ───────────────────────────────────────
  'Data Analyst': {
    title: 'Data Analyst',
    coreKeywords: [
      'SQL Queries',
      'Data Cleaning',
      'Power BI',
      'Tableau',
      'Excel Dashboards',
      'Data Modeling',
      'Exploratory Data Analysis',
      'Python / Pandas',
      'Business Metrics',
      'Statistical Analysis',
      'ETL Pipelines',
    ],
    recommendedSkills: [
      'SQL',
      'Advanced Excel',
      'Power BI',
      'Tableau',
      'Python',
      'Data Visualization',
      'Data Cleaning',
      'Business Problem Solving',
      'Statistical Modeling',
      'DAX',
    ],
    valuePropositionTemplate:
      'Transforming complex raw data into actionable commercial dashboards and executive insights',
    actionVerbs: [
      'Analyzed',
      'Engineered',
      'Automated',
      'Visualized',
      'Queried',
      'Optimized',
      'Synthesized',
      'Modeled',
    ],
    sampleProjects: [
      'Customer Churn Prediction & Retention Dashboard',
      'E-commerce Sales Analytics & Funnel Optimization in Power BI',
      'Automated ETL Pipeline using Python and PostgreSQL',
    ],
    certifications: [
      'Google Data Analytics Professional Certificate',
      'Microsoft Certified: Power BI Data Analyst Associate (PL-300)',
      'Tableau Certified Data Analyst',
    ],
  },

  'Business Analyst': {
    title: 'Business Analyst',
    coreKeywords: [
      'Requirements Gathering',
      'BRD / FRD Documentation',
      'Stakeholder Management',
      'Process Mapping',
      'SQL',
      'Excel Modeling',
      'Agile / Scrum',
      'User Stories',
      'GAP Analysis',
      'Power BI',
    ],
    recommendedSkills: [
      'Requirements Analysis',
      'Documentation (BRD/FRD)',
      'Stakeholder Communication',
      'SQL',
      'Advanced Excel',
      'Process Flow (BPMN)',
      'Agile / Scrum',
      'Power BI',
      'User Acceptance Testing (UAT)',
    ],
    valuePropositionTemplate:
      'Bridging business goals and technical execution through rigorous requirements and commercial workflows',
    actionVerbs: [
      'Facilitated',
      'Documented',
      'Streamlined',
      'Identified',
      'Communicated',
      'Mapped',
      'Evaluated',
    ],
  },

  'Power BI Developer': {
    title: 'Power BI Developer',
    coreKeywords: [
      'Power BI Desktop',
      'DAX Measures',
      'Power Query',
      'Data Modeling',
      'Star Schema',
      'SQL Server',
      'Business Intelligence',
      'Row-Level Security (RLS)',
      'Executive Dashboards',
    ],
    recommendedSkills: [
      'Power BI',
      'DAX',
      'Power Query (M Language)',
      'Data Modeling',
      'SQL',
      'Business Intelligence',
      'Data Warehousing',
      'Data Visualization',
    ],
    valuePropositionTemplate:
      'Designing intuitive, real-time Power BI reporting ecosystems that accelerate data-driven decision making',
    actionVerbs: [
      'Designed',
      'Implemented',
      'Optimized',
      'Consolidated',
      'Modeled',
      'Architected',
    ],
  },

  'Tableau Developer': {
    title: 'Tableau Developer',
    coreKeywords: [
      'Tableau Desktop',
      'Tableau Server',
      'LOD Expressions',
      'Data Visualization',
      'SQL Queries',
      'Interactive Dashboards',
      'Data Blending',
      'Performance Tuning',
    ],
    recommendedSkills: [
      'Tableau',
      'SQL',
      'LOD Expressions',
      'Data Storytelling',
      'Data Blending',
      'Dashboard UX',
      'Business Analytics',
    ],
    valuePropositionTemplate:
      'Crafting high-impact Tableau visualizations that clarify complex operational trends',
    actionVerbs: [
      'Built',
      'Visualized',
      'Synthesized',
      'Deployed',
      'Automated',
    ],
  },

  'Data Scientist': {
    title: 'Data Scientist',
    coreKeywords: [
      'Machine Learning',
      'Python',
      'Scikit-learn',
      'Pandas/NumPy',
      'Predictive Modeling',
      'Statistical Testing',
      'Feature Engineering',
      'Deep Learning',
      'SQL',
      'Model Evaluation',
    ],
    recommendedSkills: [
      'Python',
      'Machine Learning',
      'SQL',
      'Statistical Analysis',
      'Scikit-learn',
      'Pandas',
      'Data Visualization',
      'Hypothesis Testing',
    ],
    valuePropositionTemplate:
      'Building predictive machine learning models that generate forecast accuracy and revenue upside',
    actionVerbs: [
      'Formulated',
      'Engineered',
      'Trained',
      'Evaluated',
      'Researched',
      'Deployed',
    ],
  },

  // ── EXCEL & OFFICE SKILLS ─────────────────────────────────────
  'MIS Executive': {
    title: 'MIS Executive',
    coreKeywords: [
      'Advanced Excel',
      'PivotTables',
      'Power Query',
      'VLOOKUP / XLOOKUP',
      'MIS Reporting',
      'VBA Macros',
      'Daily Performance Reports',
      'Data Consolidation',
      'Conditional Formatting',
      'Data Integrity',
    ],
    recommendedSkills: [
      'Advanced Excel',
      'PivotTables',
      'Power Query',
      'VLOOKUP & XLOOKUP',
      'VBA Macros',
      'Executive Dashboards',
      'MIS Reporting',
      'Data Reconciliation',
      'Process Automation',
    ],
    valuePropositionTemplate:
      'Delivering flawless management reporting, automated spreadsheets, and accurate operational metrics',
    actionVerbs: [
      'Automated',
      'Consolidated',
      'Reconciled',
      'Structured',
      'Reported',
      'Streamlined',
    ],
    sampleProjects: [
      'Automated Daily Sales & Operations MIS using Power Query & VBA',
      'Consolidated Executive Financial Dashboard with Dynamic PivotTables',
    ],
  },

  'Advanced Excel Specialist': {
    title: 'Advanced Excel Specialist',
    coreKeywords: [
      'Advanced Formulas',
      'INDEX-MATCH',
      'LAMBDA Functions',
      'Dynamic Arrays',
      'Power Query',
      'VBA Automation',
      'Financial Modeling',
      'Interactive Dashboards',
    ],
    recommendedSkills: [
      'Microsoft Excel (Advanced)',
      'Power Query',
      'VBA / Macros',
      'Data Cleansing',
      'Dynamic Array Formulas',
      'Financial Modeling',
      'Dashboarding',
    ],
    valuePropositionTemplate:
      'Streamlining enterprise workflows through high-speed Excel modeling, Power Query, and VBA automation',
    actionVerbs: [
      'Automated',
      'Programmed',
      'Optimized',
      'Engineered',
      'Consolidated',
    ],
  },

  // ── PYTHON & PROGRAMMING ──────────────────────────────────────
  'Python Developer': {
    title: 'Python Developer',
    coreKeywords: [
      'Python 3',
      'FastAPI',
      'Django',
      'Flask',
      'RESTful APIs',
      'PostgreSQL',
      'OOP & Clean Code',
      'Automated Unit Testing',
      'AsyncIO',
      'Docker',
      'Git Workflow',
    ],
    recommendedSkills: [
      'Python',
      'FastAPI',
      'Django',
      'REST APIs',
      'PostgreSQL',
      'Git',
      'Docker',
      'Data Structures & Algorithms',
      'Pytest',
      'Celery / Redis',
    ],
    valuePropositionTemplate:
      'Developing robust, high-concurrency Python backend services and scalable API ecosystems',
    actionVerbs: [
      'Architected',
      'Programmed',
      'Implemented',
      'Refactored',
      'Deployed',
      'Tested',
    ],
    sampleProjects: [
      'High-Throughput REST API built with FastAPI and PostgreSQL',
      'Distributed Task Processing Pipeline with Celery and Redis',
      'Automated Web Scraping and Data Ingestion Service',
    ],
  },

  'Software Engineer': {
    title: 'Software Engineer',
    coreKeywords: [
      'Data Structures',
      'Algorithms',
      'System Design',
      'Object-Oriented Programming',
      'REST APIs',
      'Unit & Integration Testing',
      'Git',
      'SQL Databases',
      'CI/CD Pipelines',
      'Clean Code',
    ],
    recommendedSkills: [
      'Data Structures & Algorithms',
      'System Architecture',
      'Python',
      'Java or C++',
      'SQL',
      'Git',
      'REST APIs',
      'Unit Testing',
      'Docker',
    ],
    valuePropositionTemplate:
      'Building maintainable, fault-tolerant software systems that balance velocity with architectural rigor',
    actionVerbs: [
      'Engineered',
      'Architected',
      'Designed',
      'Optimized',
      'Shipped',
      'Refactored',
    ],
  },

  // ── WEB DEVELOPMENT ───────────────────────────────────────────
  'Full Stack Developer': {
    title: 'Full Stack Developer',
    coreKeywords: [
      'Full Stack',
      'React.js',
      'Node.js',
      'TypeScript',
      'Next.js',
      'PostgreSQL',
      'System Design',
      'REST APIs',
      'Microservices',
      'Cloud Architecture',
      'Docker',
      'CI/CD',
    ],
    recommendedSkills: [
      'TypeScript',
      'React.js',
      'Node.js',
      'PostgreSQL',
      'System Architecture',
      'Docker',
      'REST APIs',
      'AWS',
      'Tailwind CSS',
    ],
    valuePropositionTemplate:
      'Architecting resilient full-stack web applications from prototype to production scale',
    actionVerbs: [
      'Architected',
      'Engineered',
      'Deployed',
      'Led',
      'Optimized',
      'Scaled',
    ],
  },

  'Frontend Developer': {
    title: 'Frontend Developer',
    coreKeywords: [
      'React.js',
      'TypeScript',
      'JavaScript (ES6+)',
      'Next.js',
      'Tailwind CSS',
      'HTML5/CSS3',
      'Responsive Design',
      'State Management',
      'Web Performance',
      'REST APIs',
    ],
    recommendedSkills: [
      'React.js',
      'TypeScript',
      'JavaScript',
      'Tailwind CSS',
      'Next.js',
      'Responsive Web Design',
      'State Management (Redux/Zustand)',
      'Web Performance (Core Web Vitals)',
      'Git',
    ],
    valuePropositionTemplate:
      'Crafting lightning-fast, accessible, and responsive user interfaces with modern React and TypeScript',
    actionVerbs: [
      'Engineered',
      'Revamped',
      'Built',
      'Standardized',
      'Designed',
      'Optimized',
    ],
  },

  'Backend Developer': {
    title: 'Backend Developer',
    coreKeywords: [
      'Node.js',
      'Express.js',
      'PostgreSQL',
      'MongoDB',
      'RESTful APIs',
      'Microservices',
      'Redis Caching',
      'Database Optimization',
      'Authentication (JWT/OAuth)',
      'Docker',
    ],
    recommendedSkills: [
      'Node.js',
      'Python',
      'PostgreSQL',
      'REST APIs',
      'Microservices',
      'Database Indexing',
      'Docker',
      'Redis',
      'API Security',
    ],
    valuePropositionTemplate:
      'Engineering secure, high-throughput backend APIs and optimized database storage architectures',
    actionVerbs: [
      'Engineered',
      'Scaled',
      'Secured',
      'Integrated',
      'Migrated',
    ],
  },

  // ── AI & MACHINE LEARNING ─────────────────────────────────────
  'AI Engineer': {
    title: 'AI Engineer',
    coreKeywords: [
      'Generative AI',
      'Large Language Models (LLMs)',
      'PyTorch',
      'LangChain',
      'RAG Architectures',
      'Vector Databases',
      'Hugging Face',
      'Python',
      'Model Fine-Tuning',
      'API Deployment',
    ],
    recommendedSkills: [
      'Python',
      'Generative AI',
      'PyTorch',
      'Large Language Models',
      'RAG & Vector Embeddings',
      'LangChain',
      'Model Fine-Tuning',
      'FastAPI',
    ],
    valuePropositionTemplate:
      'Building production-grade Generative AI applications and automated RAG systems that unlock business velocity',
    actionVerbs: [
      'Architected',
      'Fine-Tuned',
      'Integrated',
      'Trained',
      'Deployed',
    ],
  },

  // ── IT & CYBERSECURITY ────────────────────────────────────────
  'Cybersecurity Analyst': {
    title: 'Cybersecurity Analyst',
    coreKeywords: [
      'Threat Detection',
      'SIEM (Splunk)',
      'Vulnerability Assessment',
      'Incident Response',
      'Network Security',
      'Firewalls',
      'Compliance (ISO/SOC2)',
      'Identity & Access Management (IAM)',
      'Penetration Testing',
    ],
    recommendedSkills: [
      'Network Security',
      'Threat Hunting',
      'SIEM & Log Analysis',
      'Vulnerability Management',
      'Incident Response',
      'Linux Security',
      'Security Auditing',
    ],
    valuePropositionTemplate:
      'Safeguarding corporate digital infrastructure through proactive threat detection, vulnerability audits, and rapid incident response',
    actionVerbs: [
      'Mitigated',
      'Audited',
      'Protected',
      'Monitored',
      'Investigated',
    ],
  },

  'Cloud Engineer': {
    title: 'Cloud Engineer',
    coreKeywords: [
      'AWS Services',
      'Cloud Architecture',
      'Terraform / IaC',
      'Docker Containers',
      'Kubernetes',
      'CI/CD Pipelines',
      'Linux Administration',
      'Cloud Security',
      'Cost Optimization',
    ],
    recommendedSkills: [
      'AWS / Azure',
      'Docker',
      'Kubernetes',
      'Terraform',
      'CI/CD (GitHub Actions)',
      'Linux Administration',
      'Cloud Networking',
    ],
    valuePropositionTemplate:
      'Architecting resilient, cost-optimized cloud infrastructure with Infrastructure as Code and automated CI/CD',
    actionVerbs: [
      'Provisioned',
      'Automated',
      'Migrated',
      'Orchestrated',
      'Scaled',
    ],
  },

  'QA Engineer': {
    title: 'QA Engineer',
    coreKeywords: [
      'Test Automation',
      'Selenium',
      'Cypress',
      'Playwright',
      'Manual Testing',
      'API Testing (Postman)',
      'Test Plans & Test Cases',
      'Defect Lifecycle',
      'Regression Testing',
    ],
    recommendedSkills: [
      'Test Automation',
      'Selenium / Playwright',
      'API Testing',
      'Regression Testing',
      'Bug Tracking (Jira)',
      'CI/CD Test Integration',
      'Quality Assurance',
    ],
    valuePropositionTemplate:
      'Ensuring zero-defect releases through comprehensive test automation suites, API validation, and regression safeguards',
    actionVerbs: [
      'Automated',
      'Tested',
      'Identified',
      'Validated',
      'Verified',
    ],
  },

  // ── FINANCE & ACCOUNTING ──────────────────────────────────────
  'Financial Analyst': {
    title: 'Financial Analyst',
    coreKeywords: [
      'Financial Modeling',
      'DCF Valuation',
      'Variance Analysis',
      'Budgeting & Forecasting',
      'Advanced Excel',
      'Financial Statements (P&L, Balance Sheet)',
      'Power BI',
      'KPI Reporting',
    ],
    recommendedSkills: [
      'Financial Modeling',
      'Advanced Excel',
      'DCF Valuation',
      'Budgeting & Forecasting',
      'Financial Statement Analysis',
      'Variance Analysis',
      'Power BI',
    ],
    valuePropositionTemplate:
      'Delivering precision financial models, forecasting, and investment valuations that steer executive capital allocation',
    actionVerbs: [
      'Modeled',
      'Forecasted',
      'Evaluated',
      'Streamlined',
      'Calculated',
    ],
  },

  // ── DIGITAL MARKETING & CONTENT ───────────────────────────────
  'Digital Marketing Specialist': {
    title: 'Digital Marketing Specialist',
    coreKeywords: [
      'Search Engine Optimization (SEO)',
      'Google Analytics 4',
      'Content Marketing',
      'Pay-Per-Click (Google Ads)',
      'Social Media Growth',
      'Conversion Rate Optimization (CRO)',
      'Email Campaigns',
      'Keyword Research',
    ],
    recommendedSkills: [
      'SEO',
      'Google Analytics',
      'Content Strategy',
      'Performance Marketing (PPC)',
      'Social Media Marketing',
      'Conversion Optimization',
      'Email Automation',
    ],
    valuePropositionTemplate:
      'Scaling organic inbound traffic and digital revenue through high-intent SEO, content strategy, and conversion optimization',
    actionVerbs: [
      'Scaled',
      'Ranked',
      'Optimized',
      'Produced',
      'Executed',
    ],
  },

  // ── DESIGN & PRODUCT ──────────────────────────────────────────
  'UI/UX Designer': {
    title: 'UI/UX Designer',
    coreKeywords: [
      'Figma',
      'User Research',
      'Wireframing',
      'Interactive Prototyping',
      'Design Systems',
      'Usability Testing',
      'Information Architecture',
      'Mobile App Design',
      'Responsive Web UI',
    ],
    recommendedSkills: [
      'Figma',
      'UI/UX Design',
      'Wireframing & Prototyping',
      'User Research',
      'Design Systems',
      'Usability Testing',
      'Information Architecture',
    ],
    valuePropositionTemplate:
      'Designing intuitive, accessible product experiences that eliminate user friction and elevate retention',
    actionVerbs: [
      'Designed',
      'Prototyped',
      'Researched',
      'Iterated',
      'Standardized',
    ],
  },

  'Product Manager': {
    title: 'Product Manager',
    coreKeywords: [
      'Product Strategy',
      'Product Roadmap',
      'User Stories',
      'Feature Prioritization',
      'A/B Testing',
      'Agile / Scrum',
      'Cross-Functional Leadership',
      'Product Analytics',
      'Go-to-Market (GTM)',
    ],
    recommendedSkills: [
      'Product Strategy',
      'Roadmap Planning',
      'Feature Prioritization',
      'User Research',
      'Agile / Scrum',
      'Data-Driven Decision Making',
      'Stakeholder Management',
    ],
    valuePropositionTemplate:
      'Aligning cross-functional engineering, design, and commercial teams to build products customers love',
    actionVerbs: [
      'Spearheaded',
      'Launched',
      'Prioritized',
      'Aligned',
      'Delivered',
    ],
  },

  // ── FRESHER & ENTRY-LEVEL ─────────────────────────────────────
  'Fresher / Entry-Level': {
    title: 'Fresher / Entry-Level Professional',
    coreKeywords: [
      'Technical Fundamentals',
      'Hands-on Projects',
      'Problem Solving',
      'Quick Learner',
      'Team Collaboration',
      'Git & Version Control',
      'Academic Excellence',
      'Continuous Learning',
    ],
    recommendedSkills: [
      'Problem Solving',
      'Python or JavaScript',
      'SQL Fundamentals',
      'Git & GitHub',
      'Communication & Presentation',
      'Academic Capstone Projects',
      'Fast Learning Agility',
    ],
    valuePropositionTemplate:
      'Bringing fresh technical fundamentals, strong problem-solving skills, and high learning agility to high-impact teams',
    actionVerbs: [
      'Developed',
      'Built',
      'Learned',
      'Contributed',
      'Collaborated',
      'Completed',
    ],
  },

  'Graduate Trainee': {
    title: 'Graduate Trainee',
    coreKeywords: [
      'Analytical Skills',
      'Business Operations',
      'Data Analysis',
      'Excel Proficiency',
      'Professional Communication',
      'Project Coordination',
      'Research & Synthesis',
    ],
    recommendedSkills: [
      'Analytical Thinking',
      'Microsoft Excel',
      'Business Communication',
      'Project Support',
      'Data Presentation',
      'Research & Problem Solving',
    ],
    valuePropositionTemplate:
      'Applying strong analytical discipline, cross-functional collaboration, and rapid learning to corporate initiatives',
    actionVerbs: [
      'Coordinated',
      'Analyzed',
      'Supported',
      'Assisted',
      'Delivered',
    ],
  },

  'Other / Custom Role': {
    title: 'Professional',
    coreKeywords: [
      'Strategic Execution',
      'Problem Solving',
      'Domain Competencies',
      'Cross-Functional Collaboration',
      'Process Improvement',
      'Project Ownership',
    ],
    recommendedSkills: [
      'Problem Solving',
      'Cross-Functional Collaboration',
      'Project Execution',
      'Process Optimization',
      'Strategic Communication',
    ],
    valuePropositionTemplate:
      'Delivering measurable outcomes through domain expertise, disciplined execution, and collaborative ownership',
    actionVerbs: [
      'Executed',
      'Delivered',
      'Managed',
      'Optimized',
      'Led',
    ],
  },
}

// Low-intent buzzwords that should be flagged and avoided
export const LOW_INTENT_BUZZWORDS = [
  'rockstar',
  'ninja',
  'guru',
  'wizard',
  'hardworking',
  'go-getter',
  'team player',
  'detail-oriented',
  'self-motivated',
  'synergy',
  'think outside the box',
  'results-driven',
  'looking for new opportunities',
  'seeking employment',
  'unemployed',
  'available for hire',
]

// Strong action verbs for experience bullets
export const POWER_ACTION_VERBS = [
  'architected',
  'spearheaded',
  'engineered',
  'led',
  'optimized',
  'scaled',
  'automated',
  'pioneered',
  'developed',
  'streamlined',
  'migrated',
  'reduced',
  'increased',
  'mentored',
  'accelerated',
  'refactored',
  'deployed',
  'orchestrated',
  'designed',
  'launched',
  'standardized',
]

/**
 * Intelligent role taxonomy resolver:
 * Matches exact roles, case-insensitive matches, or semantically derives
 * core keywords, recommended skills, and value proposition for ANY listed or custom role.
 */
export function getRoleTaxonomy(roleTitle: string): RoleTaxonomy {
  const trimmed = (roleTitle || '').trim()
  if (!trimmed) {
    return ROLE_TAXONOMY['Other / Custom Role']!
  }

  // 1. Exact match
  if (ROLE_TAXONOMY[trimmed]) {
    return ROLE_TAXONOMY[trimmed]!
  }

  // 2. Case-insensitive lookup
  const lower = trimmed.toLowerCase()
  for (const [key, val] of Object.entries(ROLE_TAXONOMY)) {
    if (key.toLowerCase() === lower) {
      return val
    }
  }

  // 3. Semantic / keyword heuristic mapping for all 80+ roles and custom roles
  if (/data.*analyst|business data|data quality|market research analyst|reporting analyst/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['SQL', 'Data Cleaning', 'Power BI', 'Tableau', 'Excel Dashboards', 'Exploratory Data Analysis', 'Python'],
      recommendedSkills: ['SQL', 'Advanced Excel', 'Power BI', 'Tableau', 'Python', 'Data Visualization', 'Data Cleaning'],
      valuePropositionTemplate: `Transforming complex datasets into actionable ${trimmed} insights and commercial clarity`,
      actionVerbs: ['Analyzed', 'Engineered', 'Automated', 'Visualized', 'Synthesized', 'Modeled'],
    }
  }

  if (/excel|mis|vba|spreadsheet|operations analyst|data entry/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Advanced Excel', 'PivotTables', 'Power Query', 'VLOOKUP', 'XLOOKUP', 'VBA Macros', 'MIS Reporting', 'Dashboards'],
      recommendedSkills: ['Advanced Excel', 'PivotTables', 'Power Query', 'VBA Macros', 'MIS Reporting', 'VLOOKUP / XLOOKUP', 'Process Automation'],
      valuePropositionTemplate: `Automating enterprise reporting, data consolidation, and high-precision ${trimmed} dashboards`,
      actionVerbs: ['Automated', 'Consolidated', 'Reconciled', 'Structured', 'Reported', 'Optimized'],
    }
  }

  if (/power bi/i.test(lower)) {
    return ROLE_TAXONOMY['Power BI Developer']!
  }

  if (/tableau/i.test(lower)) {
    return ROLE_TAXONOMY['Tableau Developer']!
  }

  if (/business analyst/i.test(lower)) {
    return ROLE_TAXONOMY['Business Analyst']!
  }

  if (/python/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Python', 'FastAPI', 'Django', 'REST APIs', 'PostgreSQL', 'OOP', 'Docker', 'Git'],
      recommendedSkills: ['Python', 'FastAPI', 'Django', 'REST APIs', 'PostgreSQL', 'Git', 'Data Structures', 'Docker'],
      valuePropositionTemplate: `Building resilient backend services, APIs, and data automation scripts as a ${trimmed}`,
      actionVerbs: ['Architected', 'Programmed', 'Engineered', 'Optimized', 'Deployed', 'Refactored'],
    }
  }

  if (/front.*end|react|ui developer|web developer|javascript/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['React.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Responsive UI', 'Next.js', 'State Management'],
      recommendedSkills: ['React.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'Responsive Web Design', 'HTML5/CSS3', 'Git'],
      valuePropositionTemplate: `Crafting high-performance, accessible, and responsive web user interfaces as a ${trimmed}`,
      actionVerbs: ['Engineered', 'Built', 'Designed', 'Standardized', 'Optimized'],
    }
  }

  if (/back.*end|api developer|database|sql developer/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['REST APIs', 'Node.js', 'Python', 'PostgreSQL', 'SQL Optimization', 'Microservices', 'Docker', 'Database Design'],
      recommendedSkills: ['SQL', 'REST APIs', 'PostgreSQL', 'Node.js or Python', 'Microservices', 'Database Architecture', 'Docker'],
      valuePropositionTemplate: `Engineering secure, scalable backend services and high-performance databases as a ${trimmed}`,
      actionVerbs: ['Engineered', 'Scaled', 'Architected', 'Optimized', 'Deployed'],
    }
  }

  if (/ai|machine learning|nlp|vision|deep learning/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Machine Learning', 'Python', 'PyTorch', 'LLMs', 'Scikit-learn', 'Predictive Modeling', 'NLP', 'Model Deployment'],
      recommendedSkills: ['Python', 'Machine Learning', 'PyTorch', 'LLMs', 'Scikit-learn', 'Data Modeling', 'FastAPI'],
      valuePropositionTemplate: `Developing and deploying intelligent machine learning systems as an ${trimmed}`,
      actionVerbs: ['Trained', 'Engineered', 'Fine-Tuned', 'Evaluated', 'Deployed'],
    }
  }

  if (/cyber|security|cloud|devops|aws|network|system admin/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Cloud Platforms', 'Network Security', 'Linux', 'Automation', 'Infrastructure', 'CI/CD', 'Security Best Practices'],
      recommendedSkills: ['AWS / Cloud Platforms', 'Linux Administration', 'Network Protocols', 'Security Hardening', 'Docker', 'Automation'],
      valuePropositionTemplate: `Securing and optimizing mission-critical infrastructure and cloud deployments as a ${trimmed}`,
      actionVerbs: ['Secured', 'Automated', 'Configured', 'Monitored', 'Maintained'],
    }
  }

  if (/qa|tester|testing/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Test Automation', 'Manual Testing', 'API Testing', 'Selenium / Playwright', 'Test Cases', 'Jira', 'Bug Tracking'],
      recommendedSkills: ['Test Automation', 'Manual Testing', 'API Testing (Postman)', 'Regression Testing', 'Jira', 'Quality Assurance'],
      valuePropositionTemplate: `Ensuring flawless software reliability through automated test suites and rigorous QA as a ${trimmed}`,
      actionVerbs: ['Automated', 'Tested', 'Validated', 'Verified', 'Reported'],
    }
  }

  if (/finance|account|tax|audit|banking/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Financial Analysis', 'Advanced Excel', 'Accounting Standards', 'Financial Statements', 'Auditing', 'Reporting', 'Taxation'],
      recommendedSkills: ['Financial Statement Analysis', 'Advanced Excel', 'Budgeting & Forecasting', 'Accounting Principles', 'Power BI'],
      valuePropositionTemplate: `Delivering precision financial accounting, variance modeling, and compliance as a ${trimmed}`,
      actionVerbs: ['Modeled', 'Reconciled', 'Audited', 'Forecasted', 'Calculated'],
    }
  }

  if (/marketing|seo|content|social media|writer/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Content Strategy', 'SEO', 'Audience Growth', 'Google Analytics', 'Digital Campaigns', 'Copywriting', 'Brand Engagement'],
      recommendedSkills: ['SEO', 'Content Strategy', 'Google Analytics', 'Copywriting', 'Social Media Marketing', 'Keyword Research'],
      valuePropositionTemplate: `Scaling organic engagement, digital traffic, and conversion storytelling as a ${trimmed}`,
      actionVerbs: ['Authored', 'Scaled', 'Ranked', 'Optimized', 'Published'],
    }
  }

  if (/design|ux|ui|graphic|product/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Figma', 'UI/UX Design', 'User Research', 'Wireframing', 'Prototyping', 'Design Systems', 'Usability Testing'],
      recommendedSkills: ['Figma', 'Wireframing & Prototyping', 'User Research', 'Design Systems', 'Usability Testing', 'Visual Design'],
      valuePropositionTemplate: `Designing delightful, friction-free user interfaces and product workflows as a ${trimmed}`,
      actionVerbs: ['Designed', 'Prototyped', 'Researched', 'Iterated', 'Standardized'],
    }
  }

  if (/intern|fresher|graduate|student|trainee|entry/i.test(lower)) {
    return {
      title: trimmed,
      coreKeywords: ['Core Technical Skills', 'Hands-on Projects', 'Problem Solving', 'Fast Learner', 'Collaboration', 'Git'],
      recommendedSkills: ['Problem Solving', 'Python or JavaScript', 'SQL Basics', 'Git & GitHub', 'Academic Projects', 'Quick Learning'],
      valuePropositionTemplate: `Applying strong foundational technical skills, project experience, and learning agility as an ambitious ${trimmed}`,
      actionVerbs: ['Developed', 'Built', 'Implemented', 'Contributed', 'Collaborated'],
    }
  }

  // 4. Clean fallback for arbitrary custom roles
  return {
    title: trimmed,
    coreKeywords: [
      `${trimmed} Best Practices`,
      'Problem Solving',
      'Execution',
      'Cross-Functional Collaboration',
      'Process Improvement',
      'Project Ownership',
    ],
    recommendedSkills: [
      'Problem Solving',
      'Cross-Functional Collaboration',
      'Project Execution',
      'Process Optimization',
      'Strategic Communication',
    ],
    valuePropositionTemplate: `Driving high-impact results through disciplined execution and deep domain focus as a ${trimmed}`,
    actionVerbs: ['Delivered', 'Executed', 'Optimized', 'Coordinated', 'Led'],
  }
}
