"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Feedback = { text: string; tone: "success" | "warning" | "error" } | null;

export default function VerificarPrecoButton({ productId }: { productId: number }) {
  const [loading, setLoading] = useState(false);
  const [feedback, setFeedback] = useState<Feedback>(null);
  const router = useRouter();

  async function verify() {
    if (loading) return;
    setLoading(true);
    setFeedback(null);
    try {
      const response = await fetch("/api/mercadolivre/sync-price", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await response.json();
      if (data.status === "restricted") {
        setFeedback({ text: "API restrita. Preço preservado.", tone: "warning" });
      } else if (data.status === "ok") {
        setFeedback({ text: "Preço atualizado com sucesso.", tone: "success" });
      } else {
        setFeedback({ text: data.error || "Não foi possível verificar. Preço preservado.", tone: "error" });
      }
      router.refresh();
    } catch {
      setFeedback({ text: "Falha na consulta. Preço preservado.", tone: "error" });
    } finally {
      setLoading(false);
    }
  }

  const feedbackStyle = feedback?.tone === "success"
    ? { background: "#e9f8ef", color: "#08783e", border: "1px solid #bfe8ce" }
    : feedback?.tone === "warning"
      ? { background: "#fff7df", color: "#8a5b00", border: "1px solid #f0d995" }
      : { background: "#fff0f0", color: "#a12626", border: "1px solid #efc3c3" };

  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "stretch", gap: "6px" }}>
      <button type="button" className="secondary-button" onClick={verify} disabled={loading}>
        {loading ? "Verificando..." : "Verificar preço"}
      </button>
      {feedback ? (
        <span style={{ ...feedbackStyle, borderRadius: "8px", padding: "5px 8px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
          {feedback.text}
        </span>
      ) : null}
    </div>
  );
}
