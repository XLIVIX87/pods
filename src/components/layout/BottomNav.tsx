"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const navItems = [
  { href: "/", label: "Home", icon: "home" },
  { href: "/buy", label: "Buy", icon: "shopping_basket" },
  { href: "/sell", label: "Sell", icon: "sell" },
  { href: "/customers", label: "Customers", icon: "groups" },
  { href: "/money", label: "Money", icon: "payments" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 w-full h-20 flex justify-around items-center px-4 pb-safe bg-surface/80 backdrop-blur-xl border-t border-on-surface/5 shadow-[0_-4px_20px_rgba(0,0,0,0.05)] rounded-t-3xl z-50">
      {navItems.map((item) => {
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname.startsWith(item.href);

        return (
          <Link
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center justify-center px-4 py-1 transition-all duration-200 active:scale-90 ${
              isActive
                ? "bg-tertiary-fixed text-primary rounded-full"
                : "text-on-surface-variant/60 hover:text-secondary"
            }`}
          >
            <span
              className="material-symbols-outlined"
              style={
                isActive
                  ? { fontVariationSettings: "'FILL' 1" }
                  : undefined
              }
            >
              {item.icon}
            </span>
            <span className="font-label text-[11px] font-semibold uppercase tracking-wider">
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
