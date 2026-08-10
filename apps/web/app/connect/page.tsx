"use client";

import { useState } from "react";

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
    <main>
      <h1>Figma plugin'ini bağla</h1>
      <p>
        Bir bağlantı token'ı oluştur ve Figma'daki Handofflog plugin'inde{" "}
        <em>Ekip sunucusu → bağlan</em> alanına yapıştır. Token yalnızca bir kez gösterilir.
      </p>
      <button
        onClick={mint}
        disabled={loading}
        style={{ background: "#005a9e", color: "#fff", border: 0, borderRadius: 6, padding: "10px 16px" }}
      >
        {loading ? "Oluşturuluyor…" : "Bağlantı token'ı oluştur"}
      </button>
      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}
      {token ? (
        <div style={{ marginTop: 16 }}>
          <p>Token (kopyala, güvenli sakla):</p>
          <code style={{ display: "block", padding: 12, background: "#f5f5f5", borderRadius: 6, wordBreak: "break-all" }}>
            {token}
          </code>
        </div>
      ) : null}

      <RevokeTokens />
    </main>
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
    <div style={{ marginTop: 28, paddingTop: 16, borderTop: "1px solid #eee" }}>
      <p style={{ color: "#666", fontSize: 13 }}>
        Bir token sızdıysa mevcut tüm token&apos;ları iptal edip yenisini oluşturabilirsin.
      </p>
      <button onClick={revoke} disabled={busy || done} style={{ border: "1px solid #b91c1c", color: "#b91c1c", background: "transparent", borderRadius: 6, padding: "6px 12px" }}>
        {done ? "Token'lar iptal edildi ✓" : busy ? "İptal ediliyor…" : "Mevcut token'ları iptal et"}
      </button>
    </div>
  );
}
