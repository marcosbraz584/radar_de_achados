"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function VerificarPrecoButton({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function verify() {
    if (loading) return;
    setLoading(true);
    try {
      const response = await fetch("/api/mercadolivre/sync-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();
      if (data.status === "restricted") {
        window.alert("O Mercado Livre restringiu a consulta deste anúncio. O preço atual foi preservado.");
      } else if (data.status === "ok") {
        window.alert("Preço verificado e atualizado com sucesso.");
      } else {
        window.alert(data.error || "Não foi possível verificar o preço. O valor atual foi preservado.");
      }
      router.refresh();
    } catch {
      window.alert("Falha ao verificar o preço. O valor atual foi preservado.");
    } finally {
      setLoading(false);
    }
  }

  return <button type="button" className="secondary-button" onClick={verify} disabled={loading}>{loading ? "Verificando..." : "Verificar preço"}</button>;
}
