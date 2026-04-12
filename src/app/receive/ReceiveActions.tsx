"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Props {
  purchaseId: string;
}

export default function ReceiveActions({ purchaseId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleMarkReceived = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/purchases/${purchaseId}/receive`, {
        method: "PATCH",
      });
      if (res.ok) {
        router.push(`/check/${purchaseId}`);
      } else {
        const data = await res.json();
        alert(data.error || "Failed to mark as received");
      }
    } catch {
      alert("Network error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleMarkReceived}
      disabled={loading}
      className="w-full h-12 bg-primary text-on-primary font-bold rounded-xl active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
    >
      {loading ? (
        "Marking..."
      ) : (
        <>
          <span className="material-symbols-outlined text-[20px]">check_circle</span>
          Goods Received — Run Check
        </>
      )}
    </button>
  );
}
