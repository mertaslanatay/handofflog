"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";

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
    <>
      <AppHeader active="settings" />
      <main className="container">
        <h1>Ayarlar</h1>
        <p className="muted" style={{ marginBottom: 20 }}>
          Workspace yönetimi ve bağlantılar.
        </p>

        <div className="danger-zone">
          <h2 style={{ marginTop: 0, color: "var(--red-text)" }}>Tehlikeli bölge</h2>
          <p className="muted">
            Workspace&apos;i ve tüm verilerini (release&apos;ler, acknowledgement&apos;lar, bağlantı
            token&apos;ları) kalıcı olarak siler. Bu işlem geri alınamaz.
          </p>
          {!confirming ? (
            <button onClick={() => setConfirming(true)} className="btn btn-danger">
              Workspace verilerini sil
            </button>
          ) : (
            <div className="toolbar" style={{ alignItems: "center" }}>
              <span>Emin misin?</span>
              <button onClick={deleteWorkspace} disabled={busy} className="btn btn-danger">
                {busy ? "Siliniyor…" : "Evet, kalıcı olarak sil"}
              </button>
              <button onClick={() => setConfirming(false)} disabled={busy} className="btn btn-subtle">
                Vazgeç
              </button>
            </div>
          )}
          {error ? <p className="error" style={{ marginBottom: 0 }}>{error}</p> : null}
        </div>
      </main>
    </>
  );
}
