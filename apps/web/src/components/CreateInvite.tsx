"use client";

import { useState } from "react";

export function CreateInvite() {
  const [email, setEmail] = useState("");
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setBusy(true);
    setErr(null);
    setLink(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: email.trim() || undefined }),
      });
      if (!res.ok) {
        setErr(res.status === 403 ? "Yalnızca workspace sahibi davet edebilir." : "Davet oluşturulamadı.");
        return;
      }
      const data = (await res.json()) as { token: string };
      setLink(`${window.location.origin}/join?token=${data.token}`);
    } catch {
      setErr("İstek başarısız oldu.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card" style={{ marginBottom: 16 }}>
      <strong>Paydaş davet et</strong>
      <div className="toolbar" style={{ marginTop: 10 }}>
        <div className="field grow">
          <span className="field-label">E-posta (opsiyonel)</span>
          <input className="input" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ornek@sirket.com" />
        </div>
        <button className="btn btn-primary" onClick={create} disabled={busy}>
          {busy ? "Oluşturuluyor…" : "Davet linki oluştur"}
        </button>
      </div>
      {err ? <p className="error" style={{ margin: "10px 0 0" }}>{err}</p> : null}
      {link ? (
        <div style={{ marginTop: 12 }}>
          <div className="field-label" style={{ marginBottom: 6 }}>Davet linki (kopyala ve gönder)</div>
          <code className="token-box">{link}</code>
          <p className="muted small" style={{ marginTop: 6 }}>
            Bu linke tıklayıp Figma ile giriş yapan kişi ekibe katılır. (E-posta otomatik gönderimi yakında.)
          </p>
        </div>
      ) : null}
    </div>
  );
}
