import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { PrismaRepository } from "@/server/repository.prisma";
import { listReleases } from "@backend/services";

export const dynamic = "force-dynamic";

export default async function ReleasesPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");

  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) {
    return (
      <main>
        <h1>Releases</h1>
        <p>Henüz bir workspace bulunamadı.</p>
      </main>
    );
  }

  const repo = new PrismaRepository();
  const releases = await listReleases(repo, { userId }, workspaceId);

  return (
    <main>
      <h1>Releases</h1>
      {releases.length === 0 ? (
        <p>Henüz release yok. Figma plugin&apos;inden bir tarama yayınla (Publish).</p>
      ) : (
        <ul style={{ listStyle: "none", padding: 0 }}>
          {releases.map((r) => (
            <li key={r.id} style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 12, marginBottom: 8 }}>
              <a href={`/releases/${r.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <strong>{r.release.name}</strong>{" "}
                <span style={{ color: "#666" }}>
                  v{r.release.version} · {r.release.type} · {r.release.impact} · {r.release.changes.length} değişiklik
                </span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
