import { redirect } from "next/navigation";
import { getSessionUserId } from "@/server/session";
import { primaryWorkspaceId } from "@/server/onboarding";
import { listInvites } from "@/server/invites";
import { prisma } from "@/server/db";
import { AppHeader } from "@/components/AppHeader";
import { CreateInvite } from "@/components/CreateInvite";

export const dynamic = "force-dynamic";

export default async function TeamPage() {
  const userId = await getSessionUserId();
  if (!userId) redirect("/");
  const workspaceId = await primaryWorkspaceId(userId);
  if (!workspaceId) {
    return (
      <>
        <AppHeader active="team" />
        <main className="container">
          <h1>Ekip</h1>
          <p className="muted">Henüz bir workspace yok.</p>
        </main>
      </>
    );
  }

  const members = await prisma.workspaceMember.findMany({ where: { workspaceId }, include: { user: true } });
  const me = members.find((m) => m.userId === userId);
  const isOwner = me?.role === "OWNER";
  const pending = (await listInvites(workspaceId)).filter((i) => !i.acceptedAt);

  return (
    <>
      <AppHeader active="team" />
      <main className="container">
        <h1>Ekip</h1>
        <p className="subtitle">
          Projeyi inceleyecek paydaşları davet et; kim katıldı ve release&apos;lerde kim onayladı burada görünür.
        </p>

        {isOwner ? <CreateInvite /> : null}

        <h2>Üyeler ({members.length})</h2>
        <ul className="list">
          {members.map((m) => (
            <li key={m.userId} className="screen">
              <div className="screen-head">
                <span className="screen-name">{m.user.displayName || m.user.email}</span>
                <span className="muted small">{m.user.email}</span>
                <span className={`lz ${m.role === "OWNER" ? "lz-blue" : "lz-neutral"}`}>
                  {m.role === "OWNER" ? "Sahip" : "Üye"}
                </span>
              </div>
            </li>
          ))}
        </ul>

        {pending.length > 0 ? (
          <>
            <h2>Bekleyen davetler ({pending.length})</h2>
            <ul className="list">
              {pending.map((i) => (
                <li key={i.id} className="screen same">
                  <div className="screen-head">
                    <span className="screen-name">{i.email || "Link daveti"}</span>
                    <span className="lz lz-neutral">Bekliyor</span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : null}
      </main>
    </>
  );
}
