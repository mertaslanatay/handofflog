import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { listReleases, acknowledgementRate } from "@backend/services";
import { AckPanel } from "@/components/AckPanel";
import { relativeTime, formatDateTime } from "@core/relative-time";
import type { NodeChange } from "@shared/schema";
import type { PersistedScreenshot, ReleaseVisualScreen } from "@shared/release";
import type { HighlightRegion } from "@shared/schema";

const KIND_COLOR: Record<string, string> = {
  added: "#16a34a",
  removed: "#dc2626",
  modified: "#7c3aed",
};

function ScreenImage({
  img,
  regions,
  label,
}: {
  img: PersistedScreenshot;
  regions: HighlightRegion[];
  label: string;
}) {
  const w = img.width;
  const h = img.height;
  return (
    <figure style={{ flex: "1 1 260px", minWidth: 220, margin: 0 }}>
      <figcaption style={{ fontSize: 12, color: "#666", marginBottom: 4 }}>{label}</figcaption>
      <div style={{ position: "relative", width: "100%", border: "1px solid #eee", borderRadius: 4 }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={`/api/screenshots?pathname=${encodeURIComponent(img.pathname)}`}
          alt={label}
          style={{ display: "block", width: "100%", height: "auto", borderRadius: 4 }}
        />
        {w > 0 && h > 0
          ? regions.map((r) => {
              const color = KIND_COLOR[r.kind] ?? "#7c3aed";
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
                  <span
                    style={{
                      position: "absolute",
                      top: -15,
                      left: 0,
                      fontSize: 10,
                      padding: "0 3px",
                      background: color,
                      color: "#fff",
                      borderRadius: 2,
                      whiteSpace: "nowrap",
                    }}
                  >
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
    <section style={{ marginTop: 20 }}>
      <h2>Visual Diff</h2>
      {screens.map((screen) => {
        // Before shows what was removed/changed; after shows what was added/changed.
        const beforeRegions = screen.regions.filter((r) => r.kind !== "added");
        const afterRegions = screen.regions.filter((r) => r.kind !== "removed");
        return (
          <div key={screen.screen} style={{ marginBottom: 16 }}>
            <p style={{ margin: "0 0 4px" }}>
              <strong>{screen.screen}</strong>{" "}
              <span style={{ color: "#666" }}>· {screen.regions.length} değişiklik</span>
            </p>
            {screen.before || screen.after ? (
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
                {screen.before ? (
                  <ScreenImage img={screen.before} regions={beforeRegions} label="Önce (baseline)" />
                ) : null}
                {screen.after ? (
                  <ScreenImage img={screen.after} regions={afterRegions} label="Sonra (güncel)" />
                ) : null}
              </div>
            ) : (
              <p style={{ color: "#666", margin: 0 }}>Görüntü yok.</p>
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
    <li style={{ borderLeft: "3px solid #ccc", padding: "6px 10px", marginBottom: 6, listStyle: "none" }}>
      <div>
        <strong>{change.kind}</strong> · {change.nodeName}{" "}
        <span style={{ color: "#666" }}>({change.nodeType})</span> ·{" "}
        <span style={{ color: "#b45309" }}>{change.impact}</span>
      </div>
      {change.propertyChanges.map((pc, i) => (
        <div key={`${pc.path}-${i}`} style={{ fontFamily: "monospace", fontSize: 12, color: "#444" }}>
          {pc.summary}
        </div>
      ))}
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
  const rel = record.release;
  const changes = rel.changes;

  return (
    <main>
      <p style={{ marginBottom: 4 }}>
        <a href="/releases" style={{ color: "#005a9e" }}>
          ← Releases
        </a>
      </p>
      <h1 style={{ marginBottom: 4 }}>{rel.name}</h1>
      <p style={{ color: "#666", marginTop: 0 }}>
        v{rel.version} · {rel.type} · impact: {rel.impact} · {changes.length} değişiklik
        <br />
        {formatDateTime(record.createdAt).date} {formatDateTime(record.createdAt).time} ·{" "}
        {relativeTime(record.createdAt, Date.now())}
      </p>
      {rel.description ? <p>{rel.description}</p> : null}

      <AckPanel releaseId={record.id} workspaceId={workspaceId} initialRate={rate} />

      {rel.visualDiff && rel.visualDiff.length > 0 ? (
        <VisualDiffView screens={rel.visualDiff} />
      ) : null}

      <h2 style={{ marginTop: 20 }}>Değişiklikler</h2>
      {changes.length === 0 ? (
        <p style={{ color: "#666" }}>Bu release'e dahil edilmiş değişiklik yok.</p>
      ) : (
        <ul style={{ padding: 0 }}>
          {changes.map((c) => (
            <ChangeRow key={c.trackingId} change={c} />
          ))}
        </ul>
      )}
    </main>
  );
}
