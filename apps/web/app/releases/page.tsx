import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { listReleases } from "@backend/services";
import { relativeTime } from "@core/relative-time";
import { AppHeader } from "@/components/AppHeader";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) {
    return (
      <>
        <AppHeader active="releases" />
        <main className="container">
          <h1>Releases</h1>
          <p className="muted">Henüz bir workspace bulunamadı.</p>
        </main>
      </>
    );
  }

  const repo = new PrismaRepository();
  const releases = await listReleases(repo, { userId }, workspaceId);

  return (
    <>
      <AppHeader active="releases" />
      <main className="container">
        <div className="row" style={{ marginBottom: 18 }}>
          <h1 style={{ margin: 0 }}>Releases</h1>
          <a href="/versions" className="btn btn-subtle">
            Handoff değişiklikleri →
          </a>
        </div>
        {releases.length === 0 ? (
          <div className="notice muted">
            Henüz release yok. Figma plugin&apos;inden bir tarama yayınla (Publish).
          </div>
        ) : (
          <ul className="list">
            {releases.map((r) => (
              <li key={r.id}>
                <a href={`/releases/${r.id}`} className="link-card">
                  <div className="row">
                    <strong>{r.release.name}</strong>
                    <span className="lz lz-blue">v{r.release.version}</span>
                  </div>
                  <div className="muted small" style={{ marginTop: 6 }}>
                    {r.release.type} · impact {r.release.impact} · {r.release.changes.length} değişiklik ·{" "}
                    {relativeTime(r.createdAt, Date.now())}
                  </div>
                </a>
              </li>
            ))}
          </ul>
        )}
      </main>
    </>
  );
}
