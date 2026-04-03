"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface TopBarProps {
  title?: string;
  showBack?: boolean;
  backHref?: string;
  variant?: "brand" | "page";
}

export default function TopBar({
  title,
  showBack = false,
  backHref,
  variant = "brand",
}: TopBarProps) {
  const router = useRouter();

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-surface/90 backdrop-blur-xl flex items-center justify-between px-6 py-4 w-full">
      <div className="flex items-center gap-3">
        {showBack && (
          <button
            onClick={handleBack}
            className="active:scale-95 transition-transform hover:opacity-80"
          >
            <span className="material-symbols-outlined text-primary">
              arrow_back
            </span>
          </button>
        )}
        {variant === "brand" ? (
          <Link href="/" className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary">
              agriculture
            </span>
            <h1 className="text-3xl font-bold text-primary font-headline italic tracking-tight">
              PODS
            </h1>
          </Link>
        ) : (
          <h1 className="font-headline font-bold text-xl text-on-surface">
            {title}
          </h1>
        )}
      </div>
      <div className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary-container">
        <span className="material-symbols-outlined text-primary text-lg">
          person
        </span>
      </div>
    </header>
  );
}
