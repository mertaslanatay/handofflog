"use client";

import { useState } from "react";

interface FigmaVersion {
  id: string;
  created_at: string;
  label: string | null;
  user: { handle?: string; email?: string };
}
interface Summary {
  total: number;
  named: number;
  autosave: number;
}
interface ModifiedNode {
  id: string;
  name?: string;
  type?: string;
  fields: string[];
}
interface NodeRef {
  id: string;
  name?: string;
  type?: string;
}
interface AreaResult {
  nodeId: string;
  label?: string;
  changed: boolean;
  nodeCount: number;
  diff: { added: NodeRef[]; removed: NodeRef[]; modified: ModifiedNode[] };
}

const accent = "#005a9e";

export default function VersionsPage() {
  const [fileKey, setFileKey] = useState("");
  const [nodeIds, setNodeIds] = useState("");
  const [summary, setSummary] = useState<Summary | null>(null);
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [areas, setAreas] = useState<AreaResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [needConnect, setNeedConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadVersions() {
    const key = fileKey.trim();
    if (!key) return;
    setLoading(true);
    setError(null);
    setNeedConnect(false);
    setAreas(null);
    try {
      const res = await fetch(`/api/figma/versions?fileKey=${encodeURIComponent(key)}`);
      if (res.status === 401) {
        window.location.href = "/";
        return;
      }
      if (res.status === 428) {
        setNeedConnect(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        setError(data.detail || data.error || "Beklenmeyen hata");
        return;
      }
      setSummary(data.summary as Summary);
      setVersions(data.versions as FigmaVersion[]);
    } catch {
      setError("İstek başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  async function checkAreas() {
    const key = fileKey.trim();
    const ids = nodeIds.split(",").map((s) => s.trim()).filter(Boolean);
    if (!key || ids.length === 0) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/figma/area-diff", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileKey: key, nodeIds: ids }),
      });
      if (res.status === 428) {
        setNeedConnect(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "need_two_versions") setError("Bu dosyada karşılaştırmak için en az 2 versiyon yok.");
        else setError(data.detail || data.error || "Beklenmeyen hata");
        return;
      }
      setAreas(data.results as AreaResult[]);
    } catch {
      setError("İstek başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <p style={{ marginBottom: 4 }}>
        <a href="/releases" style={{ color: accent }}>
          ← Releases
        </a>
      </p>
      <h1>Versiyon geçmişi</h1>
      <p style={{ color: "#666", maxWidth: 640 }}>
        Figma&apos;nın kendi version history&apos;sinden okur — dosyayı taramaz, kilitlemez. Dosya anahtarı
        URL&apos;deki <code>/design/&lt;FILE_KEY&gt;/</code> kısmıdır.
      </p>

      {needConnect ? (
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16, margin: "12px 0" }}>
          <p style={{ marginTop: 0 }}>
            Figma dosya erişimi bağlı değil. Yeni izinlerle (files:read + file_versions:read) yeniden giriş yap.
          </p>
          <a
            href="/api/auth/figma"
            style={{ background: accent, color: "#fff", borderRadius: 6, padding: "8px 14px", textDecoration: "none" }}
          >
            Figma&apos;yı bağla
          </a>
        </div>
      ) : null}

      <div style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0" }}>
        <input
          value={fileKey}
          onChange={(e) => setFileKey(e.target.value)}
          placeholder="FILE_KEY"
          style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 6, fontFamily: "monospace" }}
        />
        <button
          onClick={loadVersions}
          disabled={loading}
          style={{ background: accent, color: "#fff", border: 0, borderRadius: 6, padding: "9px 16px" }}
        >
          {loading ? "…" : "Versiyonları getir"}
        </button>
      </div>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {summary ? (
        <p>
          <strong>{summary.total}</strong> versiyon (isimli: {summary.named}, autosave: {summary.autosave})
        </p>
      ) : null}

      {versions.length > 0 ? (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {versions.slice(0, 30).map((v) => (
            <li key={v.id} style={{ borderBottom: "1px solid #eee", padding: "6px 0", fontSize: 14 }}>
              <span style={{ color: "#666" }}>{new Date(v.created_at).toLocaleString()}</span>{" "}
              · {v.user?.handle || v.user?.email || "—"}{" "}
              {v.label ? <strong>★ {v.label}</strong> : <span style={{ color: "#999" }}>· autosave</span>}
            </li>
          ))}
        </ul>
      ) : null}

      {versions.length >= 2 ? (
        <section style={{ marginTop: 24, borderTop: "1px solid #eee", paddingTop: 16 }}>
          <h2 style={{ fontSize: 18 }}>Alan değişikliği (son 2 versiyon)</h2>
          <p style={{ color: "#666", fontSize: 13 }}>
            Frame&apos;e sağ tık → Copy link → URL&apos;deki <code>node-id=1-23</code> → <code>1:23</code>. Virgülle ayır.
          </p>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              value={nodeIds}
              onChange={(e) => setNodeIds(e.target.value)}
              placeholder="1:23, 4:56"
              style={{ flex: 1, padding: 8, border: "1px solid #ccc", borderRadius: 6, fontFamily: "monospace" }}
            />
            <button
              onClick={checkAreas}
              disabled={loading}
              style={{ border: `1px solid ${accent}`, color: accent, background: "transparent", borderRadius: 6, padding: "9px 16px" }}
            >
              {loading ? "…" : "Değişiklikleri kontrol et"}
            </button>
          </div>

          {areas ? (
            <ul style={{ listStyle: "none", padding: 0, marginTop: 12 }}>
              {areas.map((a) => (
                <li key={a.nodeId} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                  {a.changed ? (
                    <>
                      <strong style={{ color: "#7c3aed" }}>🟣 {a.label || a.nodeId} — DEĞİŞMİŞ</strong>{" "}
                      <span style={{ color: "#666" }}>
                        (+{a.diff.added.length} / -{a.diff.removed.length} / ~{a.diff.modified.length})
                      </span>
                      <ul style={{ fontSize: 13, color: "#444" }}>
                        {a.diff.modified.slice(0, 8).map((m) => (
                          <li key={m.id}>
                            ~ {m.type} “{m.name}”: {m.fields.join(", ")}
                          </li>
                        ))}
                        {a.diff.added.slice(0, 5).map((n) => (
                          <li key={n.id}>+ {n.type} “{n.name}”</li>
                        ))}
                        {a.diff.removed.slice(0, 5).map((n) => (
                          <li key={n.id}>- {n.type} “{n.name}”</li>
                        ))}
                      </ul>
                    </>
                  ) : (
                    <span style={{ color: "#16a34a" }}>✅ {a.label || a.nodeId} — değişmemiş ({a.nodeCount} node)</span>
                  )}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </main>
  );
}
