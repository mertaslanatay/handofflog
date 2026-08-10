import { redirect, notFound } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { listReleases, acknowledgementRate } from "@backend/services";
import { AckPanel } from "@/components/AckPanel";
import { relativeTime, formatDateTime } from "@core/relative-time";
import type { NodeChange } from "@shared/schema";

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
