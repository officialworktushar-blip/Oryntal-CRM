import type { Metadata } from 'next';
import { Suspense } from 'react';
import { UserRound } from 'lucide-react';
import { BRAND } from '@/lib/constants';
import { BrandLogo, Wordmark } from '@/components/brand/logo';
import { LoginForm } from './login-form';

export const metadata: Metadata = { title: 'Sign in' };

export default function LoginPage() {
  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-brand-darker px-4 py-10">
      {/* ambient glow */}
      <div className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[720px] -translate-x-1/2 rounded-full bg-brand-accent/20 blur-[140px]" />
      <div className="pointer-events-none absolute bottom-0 right-0 h-72 w-72 translate-x-1/3 translate-y-1/3 rounded-full bg-brand/[0.5] blur-[120px]" />

      <div className="relative z-10 grid w-full max-w-4xl overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] shadow-2xl backdrop-blur md:grid-cols-2">
        {/* Brand panel */}
        <div className="hidden flex-col justify-between border-r border-white/5 p-10 md:flex">
          <div className="flex items-center gap-3">
            <BrandLogo size={44} />
            <Wordmark className="text-white/90" />
          </div>
          <div className="space-y-6">
            <p className="font-display text-4xl font-semibold leading-tight text-white">
              Intelligence that{' '}
              <span className="text-gradient-gold italic">scales.</span>
            </p>
            <p className="max-w-xs text-sm leading-relaxed text-white/60">
              Internal lead management for the {BRAND.tagline}. Every prospect,
              every touchpoint, one place.
            </p>
          </div>
          <div className="flex items-center gap-3 text-white/50">
            <UserRound className="h-4 w-4 text-brand-accent" />
            <p className="text-xs">
              Authorized team members only
            </p>
          </div>
        </div>

        {/* Form panel */}
        <div className="p-8 sm:p-10">
          <div className="mb-8 flex items-center gap-3 md:hidden">
            <BrandLogo size={40} />
            <Wordmark className="text-white" />
          </div>
          <h1 className="font-display text-3xl font-semibold text-white">
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-white/50">
            Sign in to continue to {BRAND.product}.
          </p>
          <div className="mt-8">
            <Suspense
              fallback={
                <div className="space-y-4">
                  <div className="h-9 w-full animate-pulse rounded-md bg-white/10" />
                  <div className="h-9 w-full animate-pulse rounded-md bg-white/10" />
                  <div className="h-9 w-full animate-pulse rounded-md bg-white/10" />
                </div>
              }
            >
              <LoginForm />
            </Suspense>
          </div>
        </div>
      </div>
    </main>
  );
}