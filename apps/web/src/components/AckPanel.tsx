"use client";

import { useState } from "react";

interface Rate {
  acknowledged: number;
  total: number;
  rate: number;
}

export function AckPanel(props: {
  releaseId: string;
  workspaceId: string;
  initialRate: Rate;
}): JSX.Element {
  const [rate, setRate] = useState<Rate>(props.initialRate);
  const [reviewed, setReviewed] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function refreshRate() {
    const res = await fetch(
      `/api/releases/${props.releaseId}/ack?workspaceId=${encodeURIComponent(props.workspaceId)}`
    );
    if (res.ok) setRate((await res.json()) as Rate);
  }

  async function markReviewed() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/releases/${props.releaseId}/ack`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ workspaceId: props.workspaceId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setReviewed(true);
      await refreshRate();
    } catch {
      setError("İşaretlenemedi, tekrar dene.");
    } finally {
      setBusy(false);
    }
  }

  const pct = Math.round(rate.rate * 100);

  return (
    <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginTop: 16 }}>
      <p style={{ margin: "0 0 8px" }}>
        <strong>Acknowledgement:</strong> {rate.acknowledged}/{rate.total} üye inceledi (%{pct})
      </p>
      <div style={{ height: 6, background: "#eee", borderRadius: 3, overflow: "hidden", marginBottom: 12 }}>
        <div style={{ width: `${pct}%`, height: "100%", background: "#005a9e" }} />
      </div>
      <button
        onClick={markReviewed}
        disabled={busy || reviewed}
        style={{
          background: reviewed ? "#14ae5c" : "#005a9e",
          color: "#fff",
          border: 0,
          borderRadius: 6,
          padding: "8px 14px",
          cursor: reviewed ? "default" : "pointer",
        }}
      >
        {reviewed ? "İncelendi ✓" : busy ? "Kaydediliyor…" : "İncelendi olarak işaretle"}
      </button>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
    </div>
  );
}
