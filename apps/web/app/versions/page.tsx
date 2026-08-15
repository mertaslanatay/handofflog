"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";

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
interface ReportResponse {
  from: { id: string; created_at?: string; label?: string | null };
  to: { id: string; created_at?: string; label?: string | null };
  report: { totals: PageTotals; screens: ScreenReport[] };
}

const STATUS_META: Record<ScreenStatus, { cls: string; lz: string; label: string }> = {
  modified: { cls: "mod", lz: "lz-purple", label: "Değişmiş" },
  added: { cls: "add", lz: "lz-green", label: "Yeni ekran" },
  removed: { cls: "rem", lz: "lz-red", label: "Silinmiş" },
  unchanged: { cls: "same", lz: "lz-neutral", label: "Aynı" },
};

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
  const [showPublish, setShowPublish] = useState(false);
  const [pName, setPName] = useState("");
  const [pType, setPType] = useState("");
  const [pDesc, setPDesc] = useState("");
  const [publishing, setPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [publishResult, setPublishResult] = useState<{ id: string; name: string; version: string; changeCount: number; visualScreens?: number } | null>(null);
  const [pVisual, setPVisual] = useState(false);
  const [pAi, setPAi] = useState(true);

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
      if (vr.status === 429 || pr.status === 429) {
        setError("Figma hız sınırına takıldı — ~1 dakika bekleyip tekrar dene.");
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
      if (res.status === 429) {
        setError("Figma hız sınırına takıldı — ~1 dakika bekleyip tekrar dene.");
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

  async function doPublish() {
    const key = fileKey.trim();
    if (!key || !pageId || !fromV || !toV) return;
    setPublishing(true);
    setPublishError(null);
    setPublishResult(null);
    try {
      const res = await fetch("/api/figma/publish-release", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ fileKey: key, pageId, from: fromV, to: toV, name: pName || undefined, type: pType || undefined, description: pDesc || undefined, visual: pVisual, ai: pAi }),
      });
      if (res.status === 429) {
        setPublishError("Figma hız sınırına takıldı — ~1 dakika bekleyip tekrar dene.");
        return;
      }
      const data = await res.json();
      if (!res.ok) {
        if (data.error === "no_changes") setPublishError("Yayınlanacak değişiklik yok.");
        else setPublishError(data.detail || data.error || "Yayınlanamadı");
        return;
      }
      setPublishResult({ id: data.id, name: data.name, version: data.version, changeCount: data.changeCount, visualScreens: data.visualScreens });
      setShowPublish(false);
    } catch {
      setPublishError("İstek başarısız oldu.");
    } finally {
      setPublishing(false);
    }
  }

  const t = report?.report.totals;

  return (
    <>
      <AppHeader active="versions" />
      <main className="container">
        <h1>Handoff değişiklikleri</h1>
        <p className="subtitle">
          Bir handoff sayfası (Figma page) seç; o sayfadaki her ekranın iki versiyon arasında ne değiştiğini
          otomatik gösterir. Figma&apos;nın kendi version history&apos;sinden okur — dosyayı taramaz, kilitlemez.
        </p>

        {needConnect ? (
          <div className="notice" style={{ marginBottom: 16 }}>
            <p style={{ marginTop: 0 }}>Figma dosya erişimi bağlı değil. Yeni izinlerle yeniden giriş yap.</p>
            <a href="/api/auth/figma" className="btn btn-primary">
              Figma&apos;yı bağla
            </a>
          </div>
        ) : null}

        <div className="card">
          <div className="toolbar">
            <div className="field grow">
              <span className="field-label">Dosya anahtarı</span>
              <input
                value={fileKey}
                onChange={(e) => setFileKey(e.target.value)}
                placeholder="URL'deki /design/<FILE_KEY>/ kısmı"
                className="input mono"
              />
            </div>
            <button onClick={loadFileMeta} disabled={loading} className="btn btn-primary">
              {loading ? "Yükleniyor…" : "Getir"}
            </button>
          </div>

          {pages.length > 0 ? (
            <div className="toolbar" style={{ marginTop: 12 }}>
              <label className="field grow">
                <span className="field-label">Handoff sayfası (Figma page)</span>
                <select
                  value={pageId}
                  onChange={(e) => {
                    setPageId(e.target.value);
                    void runReport(fileKey.trim(), e.target.value, fromV, toV);
                  }}
                  className="select"
                >
                  {pages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <span className="field-label">Baz al (önce)</span>
                <select
                  value={fromV}
                  onChange={(e) => {
                    setFromV(e.target.value);
                    void runReport(fileKey.trim(), pageId, e.target.value, toV);
                  }}
                  className="select"
                >
                  {versions.map((v) => (
                    <option key={v.id} value={v.id}>
                      {versionLabel(v)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field grow">
                <span className="field-label">Karşılaştır (sonra)</span>
                <select
                  value={toV}
                  onChange={(e) => {
                    setToV(e.target.value);
                    void runReport(fileKey.trim(), pageId, fromV, e.target.value);
                  }}
                  className="select"
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
        </div>

        {error ? <p className="error">{error}</p> : null}
        {reporting ? <p className="muted" style={{ marginTop: 16 }}>Rapor oluşturuluyor…</p> : null}

        {t ? (
          <>
            <div className="stat-grid">
              <div className="stat">
                <div className="stat-value">{t.screens}</div>
                <div className="stat-label">Ekran</div>
              </div>
              <div className="stat">
                <div className="stat-value v-purple">{t.modified}</div>
                <div className="stat-label">🟣 Değişmiş</div>
              </div>
              <div className="stat">
                <div className="stat-value v-green">{t.added}</div>
                <div className="stat-label">🆕 Eklenmiş</div>
              </div>
              <div className="stat">
                <div className="stat-value v-red">{t.removed}</div>
                <div className="stat-label">🗑️ Silinmiş</div>
              </div>
              <div className="stat">
                <div className="stat-value">{t.unchanged}</div>
                <div className="stat-label">✅ Aynı</div>
              </div>
              <div className="stat">
                <div className="stat-value v-blue">{t.changes}</div>
                <div className="stat-label">Toplam değişiklik</div>
              </div>
            </div>

            <div className="card" style={{ marginBottom: 16, borderColor: "var(--blue)" }}>
              <div className="row">
                <div>
                  <strong>Release olarak yayınla</strong>
                  <div className="muted small">
                    Bu değişiklikleri ekibe teslim notu (versiyon + onay takibi) olarak /releases&apos;e ekler.
                  </div>
                </div>
                {!showPublish && !publishResult ? (
                  <button className="btn btn-primary" onClick={() => setShowPublish(true)}>
                    Release oluştur
                  </button>
                ) : null}
              </div>
              {showPublish ? (
                <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 10 }}>
                  <label className="field">
                    <span className="field-label">Ad</span>
                    <input className="input" value={pName} onChange={(e) => setPName(e.target.value)} placeholder="ör. Abonelik akışı teslim" />
                  </label>
                  <label className="field">
                    <span className="field-label">Tür</span>
                    <select className="select" value={pType} onChange={(e) => setPType(e.target.value)}>
                      <option value="">Otomatik (etkiden öner)</option>
                      <option value="patch">patch</option>
                      <option value="minor">minor</option>
                      <option value="major">major</option>
                      <option value="hotfix">hotfix</option>
                      <option value="content">content</option>
                      <option value="design-system">design-system</option>
                    </select>
                  </label>
                  <label className="field">
                    <span className="field-label">Açıklama (opsiyonel)</span>
                    <textarea className="input" rows={2} value={pDesc} onChange={(e) => setPDesc(e.target.value)} />
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input type="checkbox" checked={pVisual} onChange={(e) => setPVisual(e.target.checked)} />
                    Görsel diff ekle (değişen ekranların önce/sonra görüntüsü — biraz yavaş olabilir)
                  </label>
                  <label style={{ display: "flex", gap: 8, alignItems: "center", fontSize: 13 }}>
                    <input type="checkbox" checked={pAi} onChange={(e) => setPAi(e.target.checked)} />
                    Değişiklik özeti ekle (okunur maddeler; AI anahtarı varsa AI, yoksa otomatik)
                  </label>
                  <div className="toolbar">
                    <button className="btn btn-primary" onClick={doPublish} disabled={publishing}>
                      {publishing ? "Yayınlanıyor…" : "Yayınla"}
                    </button>
                    <button className="btn btn-subtle" onClick={() => setShowPublish(false)} disabled={publishing}>
                      Vazgeç
                    </button>
                  </div>
                  {publishError ? <p className="error" style={{ margin: 0 }}>{publishError}</p> : null}
                </div>
              ) : null}
              {publishResult ? (
                <div className="notice" style={{ marginTop: 12, borderColor: "var(--green)" }}>
                  ✅ Release yayınlandı: <strong>{publishResult.name}</strong> (v{publishResult.version}, {publishResult.changeCount} değişiklik{publishResult.visualScreens ? `, ${publishResult.visualScreens} ekran görseli` : ""}).{" "}
                  <a href={`/releases/${publishResult.id}`}>Aç →</a>
                </div>
              ) : null}
            </div>

            <ul className="list">
              {report!.report.screens.map((s) => {
                const m = STATUS_META[s.status];
                return (
                  <li key={s.screenId} className={`screen ${m.cls}`}>
                    <div className="screen-head">
                      <span className={`lz ${m.lz}`}>{m.label}</span>
                      <span className="screen-name">{s.name}</span>
                      {s.changeCount > 0 ? <span className="muted small">{s.changeCount} değişiklik</span> : null}
                    </div>
                    {s.status === "modified" && s.changes.length > 0 ? (
                      <ul className="changes">
                        {s.changes.slice(0, 40).map((c, i) => (
                          <li key={i} className="change">
                            <span className={`dot ${c.kind}`} />
                            {c.text}
                          </li>
                        ))}
                        {s.changes.length > 40 ? (
                          <li className="muted small">… +{s.changes.length - 40} daha</li>
                        ) : null}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </>
        ) : null}

        {versions.length > 0 ? (
          <details style={{ marginTop: 20 }}>
            <summary>Ham versiyon geçmişi ({versions.length})</summary>
            <ul className="list" style={{ marginTop: 8 }}>
              {versions.slice(0, 40).map((v) => (
                <li key={v.id} style={{ borderBottom: "1px solid var(--border)", padding: "6px 0", fontSize: 13 }}>
                  <span className="muted">{new Date(v.created_at).toLocaleString()}</span> ·{" "}
                  {v.user?.handle || v.user?.email || "—"}{" "}
                  {v.label ? <strong>★ {v.label}</strong> : <span className="muted">· autosave</span>}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </main>
    </>
  );
}
