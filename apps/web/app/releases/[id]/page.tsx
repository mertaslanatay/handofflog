import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { listReleases, acknowledgementRate } from "@backend/services";
import { AckPanel } from "@/components/AckPanel";
import { AppHeader } from "@/components/AppHeader";
import { prisma } from "@/server/db";
import { relativeTime, formatDateTime } from "@core/relative-time";
import type { NodeChange } from "@shared/schema";
import type { PersistedScreenshot, ReleaseVisualScreen } from "@shared/release";
import type { HighlightRegion } from "@shared/schema";

const KIND_COLOR: Record<string, string> = {
  added: "#22a06b",
  removed: "#c9372c",
  modified: "#8250df",
};
const KIND_LZ: Record<string, string> = {
  added: "lz-green",
  removed: "lz-red",
  modified: "lz-purple",
};

function ScreenImage({ img, regions, label }: { img: PersistedScreenshot; regions: HighlightRegion[]; label: string }) {
  const w = img.width;
  const h = img.height;
  return (
    <figure style={{ flex: "1 1 260px", minWidth: 220, margin: 0 }}>
      <figcaption className="field-label" style={{ marginBottom: 6 }}>{label}</figcaption>
      <div style={{ position: "relative", width: "100%", border: "1px solid var(--border)", borderRadius: 8, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/screenshots?pathname=${encodeURIComponent(img.pathname)}`}
          alt={label}
          style={{ display: "block", width: "100%", height: "auto" }}
        />
        {w > 0 && h > 0
          ? regions.map((r) => {
              const color = KIND_COLOR[r.kind] ?? "#8250df";
              return (
                <div
                  key={r.trackingId}
                  title={`${r.label} (${r.kind})`}
                  style={{
                    position: "absolute",
                    left: `${(r.x / w) * 100}%`,
                    top: `${(r.y / h) * 100}%`,
                    width: `${(r.width / w) * 100}%`,
                    height: `${(r.height / h) * 100}%`,
                    border: `2px dashed ${color}`,
                    boxSizing: "border-box",
                  }}
                >
                  <span style={{ position: "absolute", top: -15, left: 0, fontSize: 10, padding: "0 3px", background: color, color: "#fff", borderRadius: 2, whiteSpace: "nowrap" }}>
                    {r.kind}
                  </span>
                </div>
              );
            })
          : null}
      </div>
    </figure>
  );
}

function VisualDiffView({ screens }: { screens: ReleaseVisualScreen[] }) {
  const withImages = screens.filter((s) => s.before || s.after);
  if (withImages.length === 0) return null;
  return (
    <section>
      <h2>Görsel diff</h2>
      {screens.map((screen) => {
        const beforeRegions = screen.regions.filter((r) => r.kind !== "added");
        const afterRegions = screen.regions.filter((r) => r.kind !== "removed");
        return (
          <div key={screen.screen} className="card" style={{ marginBottom: 12 }}>
            <div className="row" style={{ marginBottom: 10 }}>
              <strong>{screen.screen}</strong>
              <span className="muted small">{screen.regions.length} değişiklik</span>
            </div>
            {screen.before || screen.after ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                {screen.before ? <ScreenImage img={screen.before} regions={beforeRegions} label="Önce (baseline)" /> : null}
                {screen.after ? <ScreenImage img={screen.after} regions={afterRegions} label="Sonra (güncel)" /> : null}
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>Görüntü yok.</p>
            )}
          </div>
        );
      })}
    </section>
  );
}

export const dynamic = "force-dynamic";

function ChangeRow({ change }: { change: NodeChange }) {
  return (
    <li className="screen" style={{ marginBottom: 8 }}>
      <div className="screen-head">
        <span className={`lz ${KIND_LZ[change.kind] ?? "lz-neutral"}`}>{change.kind}</span>
        <span className="screen-name">{change.nodeName}</span>
        <span className="muted small">{change.nodeType} · impact {change.impact}</span>
      </div>
      {change.propertyChanges.length ? (
        <ul className="changes">
          {change.propertyChanges.map((pc, i) => (
            <li key={`${pc.path}-${i}`} className="change mono" style={{ fontSize: 12 }}>
              {pc.summary}
            </li>
          ))}
        </ul>
      ) : null}
    </li>
  );
}

export default async function ReleaseDetailPage({ params }: { params: { id: string } }) {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) redirect("/releases");

  const repo = new PrismaRepository();
  const records = await listReleases(repo, { userId }, workspaceId);
  const record = records.find((r) => r.id === params.id);
  if (!record) notFound();

  const rate = await acknowledgementRate(repo, { userId }, workspaceId, record.id);
  const members = await prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: true } });
  const acks = await repo.listAcknowledgements(workspaceId, record.id);
  const reviewed = new Set(acks.map((a) => a.userId));
  const rel = record.release;
  const changes = rel.changes;
  const dt = formatDateTime(record.createdAt);

  return (
    <>
      <AppHeader active="releases" />
      <main className="container">
        <p style={{ marginBottom: 8 }}>
          <a href="/releases" className="muted">← Releases</a>
        </p>
        <div className="screen-head" style={{ marginBottom: 6 }}>
          <h1 style={{ margin: 0 }}>{rel.name}</h1>
          <span className="lz lz-blue">v{rel.version}</span>
          <span className="lz lz-neutral">{rel.type}</span>
          <span className="lz lz-purple">impact {rel.impact}</span>
        </div>
        <p className="muted small">
          {dt.date} {dt.time} · {relativeTime(record.createdAt, Date.now())} · {changes.length} değişiklik
        </p>
        {rel.description ? <p>{rel.description}</p> : null}

        {rel.aiSummary && rel.aiSummary.length > 0 ? (
          <section>
            <div className="screen-head" style={{ marginBottom: 8 }}>
              <h2 style={{ margin: 0 }}>AI özeti</h2>
              <span className="lz lz-purple">AI</span>
            </div>
            {rel.aiSummary.map((sm, i) => (
              <div key={i} className="card" style={{ marginBottom: 8 }}>
                <strong>{sm.screen}</strong>
                <ul style={{ margin: "8px 0 0", paddingLeft: 18 }}>
                  {sm.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: 2 }}>{b}</li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        ) : null}

        <AckPanel releaseId={record.id} workspaceId={workspaceId} initialRate={rate} />

        <h2>İnceleme durumu</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.userId} className="screen">
              <div className="screen-head">
                <span className="screen-name">{m.user.displayName || m.user.email}</span>
                {reviewed.has(m.userId) ? (
                  <span className="lz lz-green">İncelendi</span>
                ) : (
                  <span className="lz lz-neutral">Bekliyor</span>
                )}
              </div>
            </li>
          ))}
        </ul>

        {rel.visualDiff && rel.visualDiff.length > 0 ? <VisualDiffView screens={rel.visualDiff} /> : null}

        <h2>Değişiklikler</h2>
        {changes.length === 0 ? (
          <p className="muted">Bu release&apos;e dahil edilmiş değişiklik yok.</p>
        ) : (
          <ul className="list">
            {changes.map((c) => (
              <ChangeRow key={c.trackingId} change={c} />
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
