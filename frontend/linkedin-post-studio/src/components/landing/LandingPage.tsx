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
  Sun,
  Moon,
  LayoutDashboard,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { APP_NAME } from '@/lib/constants';
import { useTheme } from '@/hooks/useTheme';
import { useAuth } from '@/hooks/useAuth';

/* ------------------------------------------------------------------ */
/*  Sub-components (kept in the same file as requested)                */
/* ------------------------------------------------------------------ */

function Navbar() {
  const { resolvedTheme, toggleTheme } = useTheme();
  const { isAuthenticated } = useAuth();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/80 backdrop-blur-md dark:border-slate-700 dark:bg-slate-900/80">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Logo */}
        <Link
          to="/"
          className="flex items-center gap-2 text-lg font-bold text-slate-900 dark:text-white"
          aria-label={`${APP_NAME} home`}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#0a66c2] text-white">
            <Linkedin className="h-5 w-5 fill-current" />
          </div>
          <span className="font-extrabold tracking-tight">LinkOptimize</span>
        </Link>

        {/* Nav links */}
        <nav className="hidden items-center gap-6 md:flex" aria-label="Primary navigation">
          <a
            href="#features"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0a66c2] dark:text-slate-300 dark:hover:text-[#0a66c2]"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0a66c2] dark:text-slate-300 dark:hover:text-[#0a66c2]"
          >
            How It Works
          </a>
          <Link
            to="/dashboard"
            className="text-sm font-medium text-slate-600 transition-colors hover:text-[#0a66c2] dark:text-slate-300 dark:hover:text-[#0a66c2]"
          >
            App Demo
          </Link>
        </nav>

        {/* Action buttons */}
        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            aria-label="Toggle theme"
          >
            {resolvedTheme === 'dark' ? (
              <Sun className="h-5 w-5 text-amber-400" />
            ) : (
              <Moon className="h-5 w-5 text-slate-600" />
            )}
          </button>

          {isAuthenticated ? (
            <Link
              to="/dashboard"
              className="inline-flex items-center gap-2 rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004182]"
            >
              <LayoutDashboard className="h-4 w-4" />
              <span>Dashboard</span>
            </Link>
          ) : (
            <>
              <Link
                to="/login"
                className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Login
              </Link>
              <Link
                to="/dashboard"
                className="rounded-lg bg-[#0a66c2] px-4 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-[#004182]"
              >
                Open Studio
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
}

/* ---------- Hero ---------- */

function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-blue-50 to-white dark:from-slate-900 dark:to-slate-800">
      {/* Decorative blobs */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-40 left-1/2 h-[600px] w-[600px] -translate-x-1/2 rounded-full bg-[#0a66c2]/10 blur-3xl dark:bg-[#0a66c2]/5"
      />

      <div className="relative mx-auto max-w-7xl px-4 pb-20 pt-20 sm:px-6 sm:pb-28 sm:pt-28 lg:px-8 lg:pb-32 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Copy */}
          <div className="max-w-xl text-center lg:text-left">
            <span className="mb-4 inline-flex items-center gap-1.5 rounded-full bg-[#0a66c2]/10 px-3 py-1 text-xs font-semibold text-[#0a66c2] dark:bg-[#0a66c2]/20">
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              AI-Powered LinkedIn Toolkit
            </span>

            <h1 className="mt-4 text-4xl font-extrabold tracking-tight text-slate-900 sm:text-5xl lg:text-6xl dark:text-white">
              Optimize Your LinkedIn Profile.{' '}
              <span className="bg-gradient-to-r from-[#0a66c2] to-cyan-500 bg-clip-text text-transparent">
                Create Posts That Get Noticed.
              </span>
            </h1>

            <p className="mt-6 text-lg leading-relaxed text-slate-600 dark:text-slate-300">
              Leverage AI to analyze your profile, boost your score, and craft engaging posts in seconds —
              all from one powerful studio.
            </p>

            <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row lg:justify-start">
              <Link
                to="/signup"
                className="inline-flex items-center gap-2 rounded-xl bg-[#0a66c2] px-6 py-3 text-base font-semibold text-white shadow-lg shadow-[#0a66c2]/25 transition-all hover:bg-[#004182] hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0a66c2]"
              >
                Get Started Free
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-6 py-3 text-base font-semibold text-slate-700 transition-colors hover:border-[#0a66c2] hover:text-[#0a66c2] dark:border-slate-600 dark:text-slate-200 dark:hover:border-[#0a66c2] dark:hover:text-[#0a66c2]"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Mockup preview */}
          <div className="flex justify-center lg:justify-end" aria-hidden="true">
            <div className="relative w-full max-w-md">
              {/* Card */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl dark:border-slate-700 dark:bg-slate-800">
                {/* Fake profile header */}
                <div className="flex items-center gap-3">
                  <div className="h-12 w-12 rounded-full bg-gradient-to-br from-[#0a66c2] to-cyan-400" />
                  <div className="space-y-1.5">
                    <div className="h-3 w-32 rounded bg-slate-200 dark:bg-slate-600" />
                    <div className="h-2.5 w-48 rounded bg-slate-100 dark:bg-slate-700" />
                  </div>
                </div>

                {/* Score gauge */}
                <div className="mt-6 flex flex-col items-center">
                  <div className="relative flex h-36 w-36 items-center justify-center rounded-full border-8 border-[#0a66c2]/20">
                    <svg className="absolute inset-0" viewBox="0 0 144 144">
                      <circle
                        cx="72"
                        cy="72"
                        r="62"
                        fill="none"
                        stroke="#0a66c2"
                        strokeWidth="8"
                        strokeDasharray="310 390"
                        strokeLinecap="round"
                        className="origin-center -rotate-90 transform"
                      />
                    </svg>
                    <span className="text-3xl font-extrabold text-[#0a66c2]">78</span>
                  </div>
                  <p className="mt-3 text-sm font-medium text-slate-500 dark:text-slate-400">
                    Profile Score
                  </p>
                </div>

                {/* Fake metrics */}
                <div className="mt-6 grid grid-cols-3 gap-3">
                  {['Headline', 'About', 'Skills'].map((label) => (
                    <div
                      key={label}
                      className="rounded-lg bg-slate-50 p-2 text-center dark:bg-slate-700/50"
                    >
                      <CheckCircle className="mx-auto h-4 w-4 text-emerald-500" />
                      <span className="mt-1 block text-xs font-medium text-slate-600 dark:text-slate-300">
                        {label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating accent card */}
              <div className="absolute -bottom-4 -left-4 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg dark:border-slate-700 dark:bg-slate-800">
                <div className="flex items-center gap-2 text-sm font-medium text-emerald-600 dark:text-emerald-400">
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

/* ---------- Features ---------- */

interface FeatureCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
}

function FeatureCard({ icon, title, description }: FeatureCardProps) {
  return (
    <div
      className={cn(
        'group relative rounded-2xl border border-slate-200 bg-white p-8 shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl',
        'dark:border-slate-700 dark:bg-slate-800/60 dark:hover:border-[#0a66c2]/50',
      )}
    >
      <div className="mb-5 inline-flex rounded-xl bg-[#0a66c2]/10 p-3 text-[#0a66c2] transition-colors group-hover:bg-[#0a66c2] group-hover:text-white dark:bg-[#0a66c2]/20">
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 leading-relaxed text-slate-600 dark:text-slate-400">{description}</p>
    </div>
  );
}

function FeaturesSection() {
  const features: FeatureCardProps[] = [
    {
      icon: <UserCheck className="h-6 w-6" aria-hidden="true" />,
      title: 'Profile Optimizer',
      description:
        'AI-powered analysis of your headline, about section, experience, and skills — with a clear score and actionable suggestions.',
    },
    {
      icon: <PenSquare className="h-6 w-6" aria-hidden="true" />,
      title: 'Post Studio',
      description:
        'Upload images, generate professional posts with AI in multiple tones — insightful, casual, storytelling, and more.',
    },
    {
      icon: <FolderOpen className="h-6 w-6" aria-hidden="true" />,
      title: 'Smart Drafts',
      description:
        'Save, edit, preview, and organize your content library. Never lose a great idea and keep your pipeline full.',
    },
  ];

  return (
    <section id="features" className="bg-slate-50 py-20 dark:bg-slate-900 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0a66c2]">
            Features
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            Everything you need to stand&nbsp;out on LinkedIn
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
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

/* ---------- How It Works ---------- */

interface StepProps {
  step: number;
  icon: React.ReactNode;
  title: string;
  description: string;
}

function StepCard({ step, icon, title, description }: StepProps) {
  return (
    <div className="relative flex flex-col items-center text-center">
      {/* Step number badge */}
      <div className="relative mb-6">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-[#0a66c2] text-white shadow-lg shadow-[#0a66c2]/25">
          {icon}
        </div>
        <span className="absolute -right-2 -top-2 flex h-7 w-7 items-center justify-center rounded-full bg-white text-xs font-bold text-[#0a66c2] shadow ring-2 ring-[#0a66c2] dark:bg-slate-800">
          {step}
        </span>
      </div>
      <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
      <p className="mt-2 max-w-xs text-slate-600 dark:text-slate-400">{description}</p>
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
    <section id="how-it-works" className="bg-white py-20 dark:bg-slate-800 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-semibold uppercase tracking-wider text-[#0a66c2]">
            How It Works
          </span>
          <h2 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl dark:text-white">
            Three simple steps to LinkedIn&nbsp;success
          </h2>
          <p className="mt-4 text-lg text-slate-600 dark:text-slate-400">
            No complexity, no learning curve. Start seeing results in minutes.
          </p>
        </div>

        <div className="relative mt-16 grid gap-12 sm:grid-cols-3 sm:gap-8">
          {/* Connector lines (visible on sm+) */}
          <div
            aria-hidden="true"
            className="absolute left-[calc(16.67%+32px)] right-[calc(16.67%+32px)] top-8 hidden h-0.5 bg-gradient-to-r from-[#0a66c2]/40 via-[#0a66c2] to-[#0a66c2]/40 sm:block"
          />

          {steps.map((s) => (
            <StepCard key={s.step} {...s} />
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- CTA ---------- */

function CtaSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-r from-[#0a66c2] to-cyan-600 py-20 sm:py-28">
      {/* Decorative circles */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-20 -top-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-20 -left-20 h-72 w-72 rounded-full bg-white/10 blur-2xl"
      />

      <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
        <Target className="mx-auto h-10 w-10 text-white/80" aria-hidden="true" />
        <h2 className="mt-4 text-3xl font-extrabold text-white sm:text-4xl">
          Start Optimizing Today
        </h2>
        <p className="mt-4 text-lg text-blue-100">
          Join thousands of professionals who are already using {APP_NAME} to accelerate their
          LinkedIn growth. It's free to get started.
        </p>
        <Link
          to="/signup"
          className="mt-8 inline-flex items-center gap-2 rounded-xl bg-white px-8 py-3.5 text-base font-bold text-[#0a66c2] shadow-lg transition-all hover:bg-blue-50 hover:shadow-xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
        >
          Create Your Free Account
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

/* ---------- Footer ---------- */

function Footer() {
  return (
    <footer className="border-t border-slate-200 bg-white py-10 dark:border-slate-700 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col items-center gap-6 px-4 sm:flex-row sm:justify-between sm:px-6 lg:px-8">
        <div className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300">
          <Linkedin className="h-5 w-5 text-[#0a66c2]" aria-hidden="true" />
          {APP_NAME}
        </div>

        <nav className="flex gap-6 text-sm" aria-label="Footer navigation">
          <a
            href="#features"
            className="text-slate-500 transition-colors hover:text-[#0a66c2] dark:text-slate-400"
          >
            Features
          </a>
          <a
            href="#how-it-works"
            className="text-slate-500 transition-colors hover:text-[#0a66c2] dark:text-slate-400"
          >
            How It Works
          </a>
          <Link
            to="/login"
            className="text-slate-500 transition-colors hover:text-[#0a66c2] dark:text-slate-400"
          >
            Login
          </Link>
          <Link
            to="/signup"
            className="text-slate-500 transition-colors hover:text-[#0a66c2] dark:text-slate-400"
          >
            Sign Up
          </Link>
        </nav>

        <p className="text-xs text-slate-400 dark:text-slate-500">
          &copy; {new Date().getFullYear()} {APP_NAME}. All rights reserved.
        </p>
      </div>
    </footer>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Landing Page                                                  */
/* ------------------------------------------------------------------ */

export function LandingPage() {
  return (
    <div className="min-h-screen bg-white dark:bg-slate-900">
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
