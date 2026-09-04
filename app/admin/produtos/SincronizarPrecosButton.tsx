"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type SyncProduct = { id: number; name: string };

export default function SincronizarPrecosButton({ products }: { products: SyncProduct[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const router = useRouter();

  async function syncAll() {
    if (loading || products.length === 0) return;
    setLoading(true);
    setMessage("");
    let ok = 0;
    let restricted = 0;
    let errors = 0;
    for (const product of products) {
      try {
        const response = await fetch("/api/mercadolivre/sync-price", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ productId: product.id }),
        });
        const data = await response.json();
        if (data.status === "ok") ok += 1;
        else if (data.status === "restricted") restricted += 1;
        else errors += 1;
      } catch { errors += 1; }
    }
    setMessage(`${ok} atualizado(s)${restricted ? ` • ${restricted} restrito(s)` : ""}${errors ? ` • ${errors} erro(s)` : ""}`);
    setLoading(false);
    router.refresh();
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "5px" }}>
      <button type="button" className="secondary-button" onClick={syncAll} disabled={loading || products.length === 0}>
        {loading ? `Sincronizando...` : "↻ Sincronizar preços agora"}
      </button>
      {message ? <small style={{ fontWeight: 700, color: errorsColor(message) }}>{message}</small> : null}
    </div>
  );
}

function errorsColor(message: string) {
  return message.includes("erro") || message.includes("restrito") ? "#8a5b00" : "#08783e";
}
