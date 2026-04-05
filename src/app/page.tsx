import Image from "next/image";
import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-dvh flex flex-col items-center justify-center px-6 bg-surface">
      {/* Logo & Branding */}
      <div className="flex flex-col items-center mb-12">
        <Image
          src="/logo.svg"
          alt="CYFoods"
          width={120}
          height={120}
          className="h-28 w-auto mb-6"
        />
        <h1 className="text-4xl font-headline font-bold italic text-primary tracking-tight">
          PODS
        </h1>
        <p className="text-on-surface-variant font-body text-lg mt-2 text-center">
          Palm Oil Distribution System
        </p>
      </div>

      {/* Role Selection */}
      <div className="w-full max-w-sm space-y-4">
        <p className="font-label text-xs font-bold text-outline uppercase tracking-widest text-center mb-6">
          How are you using PODS today?
        </p>

        {/* Operator Button */}
        <Link
          href="/dashboard"
          className="w-full flex items-center gap-5 p-6 bg-gradient-to-r from-primary to-primary-container rounded-2xl shadow-lg shadow-primary/20 active:scale-[0.97] transition-all"
        >
          <div className="w-16 h-16 bg-on-primary/20 rounded-xl flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-on-primary text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              storefront
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-on-primary">
              I run the business
            </h2>
            <p className="text-on-primary/70 text-sm mt-1">
              Buy, pack, sell oil and track payments
            </p>
          </div>
          <span className="material-symbols-outlined text-on-primary/60">
            arrow_forward
          </span>
        </Link>

        {/* Investor Button */}
        <Link
          href="/investor"
          className="w-full flex items-center gap-5 p-6 bg-surface-container-lowest rounded-2xl ring-1 ring-outline-variant/20 shadow-sm active:scale-[0.97] transition-all"
        >
          <div className="w-16 h-16 bg-tertiary-fixed rounded-xl flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-on-tertiary-fixed text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              monitoring
            </span>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-on-surface">
              I&apos;m an investor
            </h2>
            <p className="text-on-surface-variant text-sm mt-1">
              View business performance dashboard
            </p>
          </div>
          <span className="material-symbols-outlined text-on-surface-variant/40">
            arrow_forward
          </span>
        </Link>
      </div>

      {/* Footer */}
      <p className="mt-16 text-on-surface-variant/40 text-xs font-label uppercase tracking-widest">
        CYFoods &copy; 2026
      </p>
    </div>
  );
}
