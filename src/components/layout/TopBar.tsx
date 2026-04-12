"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useSession, signOut } from "next-auth/react";
import { useState } from "react";

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
  const { data: session } = useSession();
  const [showMenu, setShowMenu] = useState(false);

  const handleBack = () => {
    if (backHref) {
      router.push(backHref);
    } else {
      router.back();
    }
  };

  const handleSignOut = async () => {
    await signOut({ callbackUrl: "/login" });
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userRole = (session?.user as any)?.role as string | undefined;

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
          <Link href="/dashboard" className="flex items-center gap-2">
            <Image
              src="/logo.svg"
              alt="CYFoods"
              width={40}
              height={40}
              className="h-10 w-auto"
            />
            <h1 className="text-2xl font-bold text-primary font-headline italic tracking-tight">
              PODS
            </h1>
          </Link>
        ) : (
          <h1 className="font-headline font-bold text-xl text-on-surface">
            {title}
          </h1>
        )}
      </div>
      <div className="flex items-center gap-2">
        {variant === "page" && (
          <Link
            href="/dashboard"
            className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-primary text-lg">
              home
            </span>
          </Link>
        )}

        {/* User Avatar / Menu */}
        <div className="relative">
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="w-10 h-10 rounded-full bg-surface-container-high flex items-center justify-center overflow-hidden border-2 border-primary-container active:scale-95 transition-transform"
          >
            <span className="material-symbols-outlined text-primary text-lg">
              person
            </span>
          </button>

          {showMenu && (
            <>
              {/* Backdrop */}
              <div
                className="fixed inset-0 z-40"
                onClick={() => setShowMenu(false)}
              />
              {/* Dropdown */}
              <div className="absolute right-0 top-12 w-56 bg-surface-container-lowest rounded-xl shadow-xl ring-1 ring-outline/10 z-50 overflow-hidden">
                {session?.user && (
                  <div className="px-4 py-3 border-b border-outline/10">
                    <p className="font-semibold text-on-surface text-sm truncate">
                      {session.user.name}
                    </p>
                    {userRole && (
                      <span className="inline-block mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase bg-primary-fixed text-on-primary-fixed">
                        {userRole}
                      </span>
                    )}
                  </div>
                )}
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-3 text-left text-error hover:bg-error-container/30 transition-colors"
                >
                  <span className="material-symbols-outlined text-lg">
                    logout
                  </span>
                  <span className="font-medium text-sm">Sign Out</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
