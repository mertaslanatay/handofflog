"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";

export default function ConnectPage() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function mint() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/tokens", { method: "POST" });
      if (!res.ok) throw new Error(String(res.status));
      const data = (await res.json()) as { token: string };
      setToken(data.token);
    } catch {
      setError("Token oluşturulamadı. Giriş yaptığından emin ol.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AppHeader />
      <main className="container">
        <h1>Figma plugin&apos;ini bağla</h1>
        <p className="subtitle">
          Bir bağlantı token&apos;ı oluştur ve Figma&apos;daki Handofflog plugin&apos;inde{" "}
          <em>Ekip sunucusu → bağlan</em> alanına yapıştır. Token yalnızca bir kez gösterilir.
        </p>

        <div className="card">
          <button onClick={mint} disabled={loading} className="btn btn-primary">
            {loading ? "Oluşturuluyor…" : "Bağlantı token'ı oluştur"}
          </button>
          {error ? <p className="error">{error}</p> : null}
          {token ? (
            <div style={{ marginTop: 16 }}>
              <div className="field-label" style={{ marginBottom: 6 }}>
                Token (kopyala, güvenli sakla)
              </div>
              <code className="token-box">{token}</code>
            </div>
          ) : null}
        </div>

        <RevokeTokens />
      </main>
    </>
  );
}

function RevokeTokens() {
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function revoke() {
    if (!confirm("Tüm mevcut bağlantı token'ları geçersiz kılınacak. Devam?")) return;
    setBusy(true);
    try {
      const res = await fetch("/api/tokens/revoke", { method: "POST" });
      if (res.ok) setDone(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ marginTop: 24 }}>
      <p className="muted small">
        Bir token sızdıysa mevcut tüm token&apos;ları iptal edip yenisini oluşturabilirsin.
      </p>
      <button onClick={revoke} disabled={busy || done} className="btn btn-danger-subtle">
        {done ? "Token'lar iptal edildi ✓" : busy ? "İptal ediliyor…" : "Mevcut token'ları iptal et"}
      </button>
    </div>
  );
}
