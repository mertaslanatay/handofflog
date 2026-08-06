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
    </main>
  );
}
