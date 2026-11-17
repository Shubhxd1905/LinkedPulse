import { Link } from 'react-router-dom';
import {
  UserCheck,
  PenSquare,
  FolderOpen,
  Sparkles,
  ArrowRight,
  CheckCircle,
  Zap,
  Target,
  Upload,
  Wand2,
  Send,
  Linkedin,
  LayoutDashboard,
  Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { useAuth } from '@/hooks/useAuth';
import { FeatureOverviewButton } from '@/components/auth/FeatureOverviewButton';

/* ------------------------------------------------------------------ */
/*  Navbar                                                              */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 glass">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-white"
          aria-label={`${APP_NAME} home`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-500/80 text-white shadow-lg shadow-indigo-500/30 border border-indigo-400/30">
            <Linkedin className="h-5 w-5 fill-current" />
          </div>
          <span className="font-extrabold tracking-tight">LinkedPulse</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
          <a href="#features" className="text-sm font-medium text-slate-200 transition-colors hover:text-white">
            Features
          </a>
          <a href="#how-it-works" className="text-sm font-medium text-slate-200 transition-colors hover:text-white">
            How It Works
          </a>
          <FeatureOverviewButton featureId="profile-audit" />
          <FeatureOverviewButton featureId="post-generator" />
          <Link
            to="/guest"
            className="inline-flex items-center gap-1.5 rounded-full border border-cyan-400/35 bg-cyan-500/15 px-3 py-1 text-xs font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/25 hover:text-white"
          >
            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
            Guest Account
          </Link>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-indigo-500/80 px-4 py-2 text-sm font-semibold text-white shadow-sm border border-indigo-400/30 transition-all hover:bg-indigo-500"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-200 transition-colors hover:bg-white/10 hover:text-white"
              >
                Login
              </Link>
              <Link
                to="/signup"
                className="rounded-lg bg-indigo-500/80 px-4 py-2 text-sm font-semibold text-white shadow-sm border border-indigo-400/30 transition-all hover:bg-indigo-500"
              >
                Get Started Free
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/*  Hero Section                                                        */
/* ------------------------------------------------------------------ */

function HeroSection() {
  return (
    <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
      {/* Glow blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-indigo-500/20 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 right-0 h-[400px] w-[400px] rounded-full bg-cyan-500/15 blur-3xl"
      />

      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="max-w-xl text-center lg:text-left">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 px-3 py-1 text-xs font-semibold text-indigo-300">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI-Powered LinkedIn Toolkit
            </span>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Optimize Your LinkedIn Profile.{' '}
              <span className="bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
                Create Posts That Get Noticed.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-200">
              Leverage AI to analyze your profile, boost your score, and craft engaging posts in
              seconds — all from one powerful studio.
            </p>

            <div className="mt-8 flex flex-wrap items-center justify-center gap-3 sm:gap-4 lg:justify-start">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-500/80 border border-indigo-400/30 px-6 py-3 text-base font-semibold text-white shadow-lg shadow-indigo-500/25 transition-all hover:bg-indigo-500 hover:shadow-xl glow-indigo"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <Link
                to="/guest"
                className="inline-flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-cyan-500/10 px-5 py-3 text-base font-semibold text-cyan-100 transition-colors hover:bg-cyan-500/20 hover:text-white glass-sm"
              >
                <Eye className="h-4 w-4" aria-hidden="true" />
                Guest Account
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-white/25 px-5 py-3 text-base font-semibold text-slate-100 transition-colors hover:border-white/40 hover:text-white glass-sm"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Mockup preview card */}
          <div className="flex justify-center lg:justify-end" aria-hidden="true">
            <div className="relative w-full max-w-md">
              {/* Main card */}
              <div className="rounded-2xl glass-lg p-6 shadow-2xl">
                {/* Fake profile header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-indigo-500 to-cyan-400 shadow-lg shadow-indigo-500/30" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 rounded bg-white/20" />
                    <div className="h-2.5 w-48 rounded bg-white/10" />
                  </div>
                </div>

                {/* Score gauge */}
                <div className="mt-6 flex flex-col items-center">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-indigo-500/20">
                    <svg className="absolute inset-0" viewBox="0 0 144 144">
                      <circle
                        cx="72"
                        cy="72"
                        r="62"
                        fill="none"
                        stroke="url(#scoreGrad)"
                        strokeWidth="8"
                        strokeDasharray="310 390"
                        strokeLinecap="round"
                        className="origin-center -rotate-90 transform"
                      />
                      <defs>
                        <linearGradient id="scoreGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                          <stop offset="0%" stopColor="#6366f1" />
                          <stop offset="100%" stopColor="#22d3ee" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="text-3xl font-extrabold text-white">78</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-300">Profile Score</p>
                </div>

                {/* Fake metrics */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {['Headline', 'About', 'Skills'].map((label) => (
                    <div key={label} className="rounded-lg bg-white/10 border border-white/15 p-2 text-center">
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-400" />
                      <span className="mt-1 block text-xs font-medium text-slate-200">{label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating accent card */}
              <div className="absolute -bottom-4 -left-4 rounded-xl glass border border-white/10 px-4 py-3 shadow-xl">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-400">
                  <Zap className="h-4 w-4" aria-hidden="true" />
                  +12 pts this week
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Features Section                                                    */
/* ------------------------------------------------------------------ */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  to: string;
  ctaLabel: string;
  isProfileAuditTrigger?: boolean;
}

function FeatureCard({ icon, title, description, to, ctaLabel, isProfileAuditTrigger }: FeatureCardProps) {
  return (
    <Link
      to={to}
      data-profile-audit-trigger={isProfileAuditTrigger ? 'true' : undefined}
      data-audit-label={isProfileAuditTrigger ? 'Loading Profile Audit...' : undefined}
      data-audit-step={isProfileAuditTrigger ? 'Opening Profile Audit analyzer...' : undefined}
      className={cn(
        'group relative flex flex-col rounded-2xl glass border border-white/10 p-8 shadow-sm',
        'transition-all duration-300 hover:-translate-y-1 hover:border-indigo-400/40 hover:shadow-indigo-500/20 hover:shadow-xl',
      )}
    >
      {/* Hover glow */}
      <div className="pointer-events-none absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-300 bg-gradient-to-br from-indigo-500/5 to-cyan-500/5" />

      <div className="mb-5 inline-flex w-fit rounded-xl bg-indigo-500/20 border border-indigo-400/20 p-3 text-indigo-300 transition-all duration-200 group-hover:bg-indigo-500/80 group-hover:text-white">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-white">{title}</h3>
      <p className="mt-2 flex-1 leading-relaxed text-slate-200">{description}</p>
      <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-300 transition-colors group-hover:text-indigo-200">
        {ctaLabel}
        <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" aria-hidden="true" />
      </span>
    </Link>
  );
}

function FeaturesSection() {
  const { isAuthenticated } = useAuth();
  const features: FeatureCardProps[] = [
    {
      icon: <UserCheck className="h-6 w-6" aria-hidden="true" />,
      title: 'Profile Optimizer',
      description:
        'AI-powered analysis of your headline, about section, experience, and skills — with a clear score and actionable suggestions.',
      to: isAuthenticated ? '/optimize' : '/guest?tab=optimize',
      ctaLabel: isAuthenticated ? 'Open Profile Audit' : 'View Profile Audit Demo',
      isProfileAuditTrigger: true,
    },
    {
      icon: <PenSquare className="h-6 w-6" aria-hidden="true" />,
      title: 'Post Studio',
      description:
        'Upload images, generate professional posts with AI in multiple tones — insightful, casual, storytelling, and more.',
      to: isAuthenticated ? '/post-studio' : '/guest?tab=post-studio',
      ctaLabel: isAuthenticated ? 'Open Post Generator' : 'View Post Generator Demo',
    },
    {
      icon: <FolderOpen className="h-6 w-6" aria-hidden="true" />,
      title: 'Smart Drafts',
      description:
        'Save, edit, preview, and organize your content library. Never lose a great idea and keep your pipeline full.',
      to: isAuthenticated ? '/drafts' : '/guest?tab=drafts',
      ctaLabel: isAuthenticated ? 'View Saved Drafts' : 'View Smart Drafts Demo',
    },
  ];

  return (
    <section id="features" className="relative py-20 sm:py-28">
      {/* Subtle section divider glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            Everything you need to stand&nbsp;out on LinkedIn
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            A complete toolkit designed for professionals who want to grow their presence.
          </p>
        </div>

        <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => (
            <FeatureCard key={f.title} {...f} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  How It Works Section                                                */
/* ------------------------------------------------------------------ */

interface StepProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StepCard({ step, icon, title, description }: StepProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step icon */}
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-500/80 border border-indigo-400/30 text-white shadow-lg shadow-indigo-500/30">
          {icon}
        </div>
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full glass-lg text-xs font-bold text-indigo-300 shadow ring-2 ring-indigo-500/50">
          {step}
        </span>
      </div>
      <h3 className="text-lg font-bold text-white">{title}</h3>
      <p className="mt-2 max-w-xs text-slate-200">{description}</p>
    </div>
  );
}

function HowItWorksSection() {
  const steps: StepProps[] = [
    {
      step: 1,
      icon: <Upload className="h-7 w-7" aria-hidden="true" />,
      title: 'Paste or Upload Your Profile',
      description:
        'Simply paste your LinkedIn profile URL or upload a PDF resume to get started instantly.',
    },
    {
      step: 2,
      icon: <Wand2 className="h-7 w-7" aria-hidden="true" />,
      title: 'Get AI Optimization Suggestions',
      description:
        'Our AI engine analyzes every section and provides a detailed score with improvement tips.',
    },
    {
      step: 3,
      icon: <Send className="h-7 w-7" aria-hidden="true" />,
      title: 'Generate & Publish Posts',
      description:
        'Craft engaging posts in your preferred tone, preview them, and share directly to LinkedIn.',
    },
  ];

  return (
    <section id="how-it-works" className="relative py-20 sm:py-28">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"
      />
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-indigo-400">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-white sm:text-4xl">
            Three simple steps to LinkedIn&nbsp;success
          </h2>
          <p className="mt-4 text-lg text-slate-300">
            No complexity, no learning curve. Start seeing results in minutes.
          </p>
        </div>

        <div className="relative mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {/* Connector line */}
          <div
            aria-hidden="true"
            className="absolute left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] top-8 hidden h-0.5 bg-gradient-to-r from-indigo-500/20 via-indigo-400/60 to-indigo-500/20 sm:block"
          />
          {steps.map((s) => (
            <StepCard key={s.step} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  CTA Section                                                         */
/* ------------------------------------------------------------------ */

function CtaSection() {
  return (
    <section className="relative overflow-hidden py-20 sm:py-28">
      {/* Glass CTA card */}
      <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl glass-lg border border-indigo-400/20 p-12 text-center shadow-2xl glow-indigo overflow-hidden">
          {/* Decorative orbs inside the card */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-16 -top-16 h-56 w-56 rounded-full bg-indigo-500/20 blur-2xl"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-16 -left-16 h-56 w-56 rounded-full bg-cyan-500/15 blur-2xl"
          />

          <div className="relative">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-500/80 border border-indigo-400/30 shadow-lg shadow-indigo-500/30">
              <Target className="h-7 w-7 text-white" aria-hidden="true" />
            </div>
            <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
              Start Optimizing Today
            </h2>
            <p className="mt-4 text-lg text-slate-200 max-w-xl mx-auto">
              Join thousands of professionals who are already using {APP_NAME} to accelerate their
              LinkedIn growth. It's free to get started.
            </p>
            <Link
              to="/signup"
              className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/20 px-8 py-3.5 text-base font-bold text-white shadow-lg backdrop-blur-sm transition-all hover:bg-white/20 hover:shadow-xl"
            >
              Create Your Free Account
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Footer                                                              */
/* ------------------------------------------------------------------ */

function Footer() {
  return (
    <footer className="border-t border-white/10 py-10">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-200">
          <Linkedin className="h-5 w-5 text-indigo-400" aria-hidden="true" />
          {APP_NAME}
        </div>

        <nav className="flex gap-6 text-sm" aria-label="Footer navigation">
          {[
            { href: '#features', label: 'Features' },
            { href: '#how-it-works', label: 'How It Works' },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="text-slate-300 transition-colors hover:text-white"
            >
              {item.label}
            </a>
          ))}
          <Link to="/guest" className="text-slate-300 transition-colors hover:text-white">
            Guest Account
          </Link>
          <Link to="/login" className="text-slate-300 transition-colors hover:text-white">
            Login
          </Link>
          <Link to="/signup" className="text-slate-300 transition-colors hover:text-white">
            Sign Up
          </Link>
        </nav>

        <p className="text-xs text-slate-300">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                   */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="min-h-screen">
      <Navbar />
      <main>
        <HeroSection />
        <FeaturesSection />
        <HowItWorksSection />
        <CtaSection />
      </main>
      <Footer />
    </div>
  );
}
