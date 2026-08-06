import { describe, it, expect } from "vitest";
import {
  assertWorkspaceAccess,
  assertRole,
  canManageMembers,
  canPublish,
  filterByWorkspace,
  isMember,
  AuthzError,
} from "./authz";
import type { WorkspaceMember } from "./domain";

const members: WorkspaceMember[] = [
  { workspaceId: "w1", userId: "u1", role: "owner" },
  { workspaceId: "w1", userId: "u2", role: "member" },
  { workspaceId: "w2", userId: "u3", role: "owner" },
];

describe("tenant access", () => {
  it("recognizes members and non-members", () => {
    expect(isMember(members, "u2", "w1")).toBe(true);
    expect(isMember(members, "u3", "w1")).toBe(false);
  });

  it("assertWorkspaceAccess returns role for members, throws for outsiders", () => {
    expect(assertWorkspaceAccess(members, "u1", "w1")).toBe("owner");
    try {
      assertWorkspaceAccess(members, "u3", "w1");
      throw new Error("should throw");
    } catch (err) {
      expect(err).toBeInstanceOf(AuthzError);
      expect((err as AuthzError).code).toBe("NOT_A_MEMBER");
    }
  });
});

describe("roles", () => {
  it("owners manage members; members can publish but not manage", () => {
    expect(canManageMembers("owner")).toBe(true);
    expect(canManageMembers("member")).toBe(false);
    expect(canPublish("member")).toBe(true);
  });

  it("assertRole throws INSUFFICIENT_ROLE", () => {
    expect(() => assertRole("member", canManageMembers)).toThrow(AuthzError);
    expect(() => assertRole("owner", canManageMembers)).not.toThrow();
  });
});

describe("filterByWorkspace (defense in depth)", () => {
  it("never returns cross-tenant rows", () => {
    const rows = [
      { workspaceId: "w1", id: "a" },
      { workspaceId: "w2", id: "b" },
      { workspaceId: "w1", id: "c" },
    ];
    expect(filterByWorkspace(rows, "w1").map((r) => r.id)).toEqual(["a", "c"]);
    expect(filterByWorkspace(rows, "w2").map((r) => r.id)).toEqual(["b"]);
  });
});
