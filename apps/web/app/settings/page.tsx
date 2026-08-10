"use client";

import { useState } from "react";

export default function SettingsPage() {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function deleteWorkspace() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/workspace", { method: "DELETE" });
      if (!res.ok) throw new Error(String(res.status));
      window.location.href = "/";
    } catch {
      setError("Silinemedi. Yalnızca workspace sahibi silebilir.");
      setBusy(false);
    }
  }

  return (
    <main>
      <p style={{ marginBottom: 4 }}>
        <a href="/releases" style={{ color: "#005a9e" }}>
          ← Releases
        </a>
      </p>
      <h1>Ayarlar</h1>

      <section style={{ border: "1px solid #e03e1a", borderRadius: 8, padding: 16, marginTop: 16 }}>
        <h2 style={{ marginTop: 0, color: "#b91c1c" }}>Tehlikeli bölge</h2>
        <p>
          Workspace&apos;i ve tüm verilerini (release&apos;ler, acknowledgement&apos;lar, bağlantı
          token&apos;ları) kalıcı olarak siler. Bu işlem geri alınamaz.
        </p>
        {!confirming ? (
          <button
            onClick={() => setConfirming(true)}
            style={{ background: "#b91c1c", color: "#fff", border: 0, borderRadius: 6, padding: "8px 14px" }}
          >
            Workspace verilerini sil
          </button>
        ) : (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <span>Emin misin?</span>
            <button
              onClick={deleteWorkspace}
              disabled={busy}
              style={{ background: "#b91c1c", color: "#fff", border: 0, borderRadius: 6, padding: "8px 14px" }}
            >
              {busy ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
            </button>
            <button onClick={() => setConfirming(false)} disabled={busy}>
              Vazgeç
            </button>
          </div>
        )}
        {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      </section>
    </main>
  );
}
