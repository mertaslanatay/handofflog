/**
 * Tenant isolation & authorization (I-06). Pure functions — the single place
 * that decides who may see/do what. Every backend query must be scoped through
 * `assertWorkspaceAccess` + `filterByWorkspace` so one workspace can never read
 * another's data (SECURITY_AND_PRIVACY §3, §6).
 */
import type { WorkspaceMember, WorkspaceRole, WorkspaceScoped } from "./domain";

export class AuthzError extends Error {
  public readonly code: "NOT_A_MEMBER" | "INSUFFICIENT_ROLE";
  constructor(code: "NOT_A_MEMBER" | "INSUFFICIENT_ROLE", message: string) {
    super(message);
    this.name = "AuthzError";
    this.code = code;
  }
}

/** The caller's membership in a workspace, or undefined if not a member. */
export function membershipOf(
  members: readonly WorkspaceMember[],
  userId: string,
  workspaceId: string
): WorkspaceMember | undefined {
  return members.find((m) => m.userId === userId && m.workspaceId === workspaceId);
}

export function isMember(
  members: readonly WorkspaceMember[],
  userId: string,
  workspaceId: string
): boolean {
  return membershipOf(members, userId, workspaceId) !== undefined;
}

/** Throw unless the user belongs to the workspace. Returns their role. */
export function assertWorkspaceAccess(
  members: readonly WorkspaceMember[],
  userId: string,
  workspaceId: string
): WorkspaceRole {
  const m = membershipOf(members, userId, workspaceId);
  if (!m) {
    throw new AuthzError("NOT_A_MEMBER", "User is not a member of this workspace.");
  }
  return m.role;
}

export function canPublish(role: WorkspaceRole): boolean {
  return role === "owner" || role === "member";
}

export function canManageMembers(role: WorkspaceRole): boolean {
  return role === "owner";
}

export function assertRole(role: WorkspaceRole, allowed: (r: WorkspaceRole) => boolean): void {
  if (!allowed(role)) {
    throw new AuthzError("INSUFFICIENT_ROLE", "Role is not permitted to perform this action.");
  }
}

/**
 * Defense-in-depth row filter: even after an access check, results are filtered
 * to the workspace so a query bug can't leak cross-tenant rows.
 */
export function filterByWorkspace<T extends WorkspaceScoped>(
  items: readonly T[],
  workspaceId: string
): T[] {
  return items.filter((item) => item.workspaceId === workspaceId);
}
