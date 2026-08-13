"use client";

import { useState } from "react";

interface FigmaVersion {
  id: string;
  created_at: string;
  label: string | null;
  user?: { handle?: string; email?: string };
}
interface Page {
  id: string;
  name: string;
}
interface ChangeLine {
  kind: "added" | "removed" | "modified";
  node: string;
  nodeType?: string;
  text: string;
}
type ScreenStatus = "added" | "removed" | "modified" | "unchanged";
interface ScreenReport {
  screenId: string;
  name: string;
  status: ScreenStatus;
  changeCount: number;
  changes: ChangeLine[];
}
interface PageTotals {
  screens: number;
  added: number;
  removed: number;
  modified: number;
  unchanged: number;
  changes: number;
}
interface VersionInfo {
  id: string;
  created_at?: string;
  label?: string | null;
}
interface ReportResponse {
  from: VersionInfo;
  to: VersionInfo;
  report: { totals: PageTotals; screens: ScreenReport[] };
}

const accent = "#005a9e";

function versionLabel(v: FigmaVersion): string {
  const d = new Date(v.created_at).toLocaleString();
  return `${d} ${v.label ? "★ " + v.label : "· autosave"}`;
}

export default function VersionsPage() {
  const [fileKey, setFileKey] = useState("");
  const [versions, setVersions] = useState<FigmaVersion[]>([]);
  const [pages, setPages] = useState<Page[]>([]);
  const [pageId, setPageId] = useState("");
  const [fromV, setFromV] = useState("");
  const [toV, setToV] = useState("");
  const [report, setReport] = useState<ReportResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [reporting, setReporting] = useState(false);
  const [needConnect, setNeedConnect] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadFileMeta() {
    const key = fileKey.trim();
    if (!key) return;
    setLoading(true);
    setError(null);
    setNeedConnect(false);
    setReport(null);
    try {
      const [vr, pr] = await Promise.all([
        fetch(`/api/figma/versions?fileKey=${encodeURIComponent(key)}`),
        fetch(`/api/figma/pages?fileKey=${encodeURIComponent(key)}`),
      ]);
      if (vr.status === 401) {
        window.location.href = "/";
        return;
      }
      if (vr.status === 428 || pr.status === 428) {
        setNeedConnect(true);
        return;
      }
      const vd = await vr.json();
      const pd = await pr.json();
      if (!vr.ok) {
        setError(vd.detail || vd.error || "Versiyonlar alınamadı");
        return;
      }
      const vs: FigmaVersion[] = vd.versions ?? [];
      const ps: Page[] = pd.pages ?? [];
      setVersions(vs);
      setPages(ps);

      const to = vs[0]?.id ?? "";
      const named = vs.slice(1).find((v) => v.label);
      const from = named?.id ?? vs[1]?.id ?? "";
      const handoff = ps.find((p) => /handoff/i.test(p.name)) ?? ps[0];
      setToV(to);
      setFromV(from);
      setPageId(handoff?.id ?? "");

      if (handoff && from && to) await runReport(key, handoff.id, from, to);
    } catch {
      setError("İstek başarısız oldu.");
    } finally {
      setLoading(false);
    }
  }

  async function runReport(key: string, page: string, from: string, to: string) {
    if (!page || !from || !to) return;
    setReporting(true);
    setError(null);
    try {
      const res = await fetch("/api/figma/page-report", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileKey: key, pageId: page, from, to }),
      });
      if (res.status === 428) {
        setNeedConnect(true);
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "need_two_versions") setError("Bu dosyada karşılaştırmak için en az 2 versiyon yok.");
        else setError(data.detail || data.error || "Rapor oluşturulamadı");
        return;
      }
      setReport(data as ReportResponse);
    } catch {
      setError("Rapor isteği başarısız oldu.");
    } finally {
      setReporting(false);
    }
  }

  const t = report?.report.totals;

  return (
    <main>
      <p style={{ marginBottom: 4 }}>
        <a href="/releases" style={{ color: accent }}>
          ← Releases
        </a>
      </p>
      <h1>Handoff değişiklikleri</h1>
      <p style={{ color: "#666", maxWidth: 680 }}>
        Bir handoff sayfası (Figma page) seç; o sayfadaki her ekranın iki versiyon arasında ne değiştiğini
        otomatik gösterir. Figma&apos;nın kendi version history&apos;sinden okur — dosyayı taramaz, kilitlemez.
        Dosya anahtarı URL&apos;deki <code>/design/&lt;FILE_KEY&gt;/</code> kısmıdır.
      </p>

      {needConnect ? (
        <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16, margin: "12px 0" }}>
          <p style={{ marginTop: 0 }}>
            Figma dosya erişimi bağlı değil. Yeni izinlerle yeniden giriş yap.
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
          onClick={loadFileMeta}
          disabled={loading}
          style={{ background: accent, color: "#fff", border: 0, borderRadius: 6, padding: "9px 16px" }}
        >
          {loading ? "…" : "Getir"}
        </button>
      </div>

      {error ? <p style={{ color: "#b91c1c" }}>{error}</p> : null}

      {pages.length > 0 ? (
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", alignItems: "flex-end", margin: "8px 0 4px" }}>
          <label style={{ fontSize: 13 }}>
            <div style={{ color: "#666", marginBottom: 2 }}>Handoff sayfası (Figma page)</div>
            <select
              value={pageId}
              onChange={(e) => {
                setPageId(e.target.value);
                void runReport(fileKey.trim(), e.target.value, fromV, toV);
              }}
              style={{ padding: 7, borderRadius: 6, border: "1px solid #ccc", minWidth: 220 }}
            >
              {pages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ color: "#666", marginBottom: 2 }}>Baz al (önce)</div>
            <select
              value={fromV}
              onChange={(e) => {
                setFromV(e.target.value);
                void runReport(fileKey.trim(), pageId, e.target.value, toV);
              }}
              style={{ padding: 7, borderRadius: 6, border: "1px solid #ccc", maxWidth: 320 }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>

          <label style={{ fontSize: 13 }}>
            <div style={{ color: "#666", marginBottom: 2 }}>Karşılaştır (sonra)</div>
            <select
              value={toV}
              onChange={(e) => {
                setToV(e.target.value);
                void runReport(fileKey.trim(), pageId, fromV, e.target.value);
              }}
              style={{ padding: 7, borderRadius: 6, border: "1px solid #ccc", maxWidth: 320 }}
            >
              {versions.map((v) => (
                <option key={v.id} value={v.id}>
                  {versionLabel(v)}
                </option>
              ))}
            </select>
          </label>
        </div>
      ) : null}

      {reporting ? <p style={{ color: "#666" }}>Rapor oluşturuluyor…</p> : null}

      {t ? (
        <>
          <p style={{ margin: "14px 0 8px" }}>
            <strong>{t.screens}</strong> ekran · 🟣 {t.modified} değişmiş · 🆕 {t.added} eklenmiş · 🗑️ {t.removed} silinmiş ·
            ✅ {t.unchanged} aynı · <strong>{t.changes}</strong> toplam değişiklik
          </p>
          <ul style={{ listStyle: "none", padding: 0 }}>
            {report!.report.screens.map((s) => (
              <li
                key={s.screenId}
                style={{
                  border: "1px solid #e5e5e5",
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 8,
                  background: s.status === "unchanged" ? "#fafafa" : "#fff",
                }}
              >
                {s.status === "modified" ? (
                  <>
                    <strong style={{ color: "#7c3aed" }}>🟣 {s.name}</strong>{" "}
                    <span style={{ color: "#666" }}>— {s.changeCount} değişiklik</span>
                    <ul style={{ fontSize: 13, color: "#333", marginTop: 6 }}>
                      {s.changes.slice(0, 30).map((c, i) => (
                        <li key={i}>{c.text}</li>
                      ))}
                      {s.changes.length > 30 ? <li style={{ color: "#999" }}>… +{s.changes.length - 30} daha</li> : null}
                    </ul>
                  </>
                ) : s.status === "added" ? (
                  <span style={{ color: "#16a34a" }}>🆕 {s.name} — yeni ekran</span>
                ) : s.status === "removed" ? (
                  <span style={{ color: "#b91c1c" }}>🗑️ {s.name} — silinmiş ekran</span>
                ) : (
                  <span style={{ color: "#999" }}>✅ {s.name} — değişmemiş</span>
                )}
              </li>
            ))}
          </ul>
        </>
      ) : null}

      {versions.length > 0 ? (
        <details style={{ marginTop: 20 }}>
          <summary style={{ cursor: "pointer", color: "#666" }}>Ham versiyon geçmişi ({versions.length})</summary>
          <ul style={{ listStyle: "none", padding: 0, marginTop: 8 }}>
            {versions.slice(0, 40).map((v) => (
              <li key={v.id} style={{ borderBottom: "1px solid #eee", padding: "5px 0", fontSize: 13 }}>
                <span style={{ color: "#666" }}>{new Date(v.created_at).toLocaleString()}</span> ·{" "}
                {v.user?.handle || v.user?.email || "—"} {v.label ? <strong>★ {v.label}</strong> : <span style={{ color: "#999" }}>· autosave</span>}
              </li>
            ))}
          </ul>
        </details>
      ) : null}
    </main>
  );
}
