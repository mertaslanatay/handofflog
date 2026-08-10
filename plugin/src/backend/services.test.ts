import { describe, it, expect } from "vitest";
import { InMemoryRepository } from "./repository";
import {
  publishRelease,
  publishReleaseWithToken,
  mintPluginToken,
  listReleases,
  acknowledgeRelease,
  acknowledgementRate,
  deleteWorkspace,
  NotFoundError,
} from "./services";
import { AuthzError } from "./authz";
import { generatePluginToken } from "./tokens";
import { buildRelease } from "../core/release";
import type { ChangeSet } from "../shared/schema";

function makeRelease() {
  const cs: ChangeSet = {
    baselineSnapshotId: "b",
    currentSnapshotId: "c",
    scopeId: "s",
    scopeName: "Checkout",
    generatedAt: "t",
    added: [],
    modified: [],
    removed: [],
    unchangedCount: 0,
  };
  return buildRelease({ changeSet: cs, excludedTrackingIds: [], name: "v1", version: "1.0.0", id: "rel", now: "t" });
}

async function seed() {
  const repo = new InMemoryRepository();
  await repo.addWorkspace({ id: "w1", name: "Team", ownerId: "owner", createdAt: "t" });
  await repo.addMember({ workspaceId: "w1", userId: "owner", role: "owner" });
  await repo.addMember({ workspaceId: "w1", userId: "dev", role: "member" });
  await repo.addProject({ id: "p1", workspaceId: "w1", name: "App", createdAt: "t" });
  return repo;
}

describe("publishRelease", () => {
  it("publishes for a member and stores the record", async () => {
    const repo = await seed();
    const rec = await publishRelease(repo, { userId: "dev" }, {
      workspaceId: "w1",
      projectId: "p1",
      release: makeRelease(),
      id: "rr1",
      now: "t",
    });
    expect(rec.publishedById).toBe("dev");
    expect((await listReleases(repo, { userId: "owner" }, "w1")).map((r) => r.id)).toEqual(["rr1"]);
  });

  it("denies a non-member (tenant isolation)", async () => {
    const repo = await seed();
    await expect(
      publishRelease(repo, { userId: "intruder" }, { workspaceId: "w1", projectId: "p1", release: makeRelease(), id: "x", now: "t" })
    ).rejects.toBeInstanceOf(AuthzError);
  });

  it("rejects a project from another workspace", async () => {
    const repo = await seed();
    await expect(
      publishRelease(repo, { userId: "dev" }, { workspaceId: "w1", projectId: "nope", release: makeRelease(), id: "x", now: "t" })
    ).rejects.toBeInstanceOf(NotFoundError);
  });
});

describe("listReleases isolation", () => {
  it("never returns another workspace's releases", async () => {
    const repo = await seed();
    await repo.addWorkspace({ id: "w2", name: "Other", ownerId: "o2", createdAt: "t" });
    await repo.addMember({ workspaceId: "w2", userId: "o2", role: "owner" });
    await repo.addProject({ id: "p2", workspaceId: "w2", name: "Other", createdAt: "t" });
    await publishRelease(repo, { userId: "dev" }, { workspaceId: "w1", projectId: "p1", release: makeRelease(), id: "rr1", now: "t" });
    await publishRelease(repo, { userId: "o2" }, { workspaceId: "w2", projectId: "p2", release: makeRelease(), id: "rr2", now: "t" });

    const w1 = await listReleases(repo, { userId: "owner" }, "w1");
    expect(w1.map((r) => r.id)).toEqual(["rr1"]);
  });
});

describe("plugin token publish (I-08 wiring)", () => {
  it("mints a token and publishes with it (no ids from plugin)", async () => {
    const repo = await seed();
    const raw = generatePluginToken();
    await mintPluginToken(repo, { userId: "dev" }, {
      workspaceId: "w1",
      projectId: "p1",
      id: "tok1",
      rawToken: raw,
      now: "t",
    });

    const rec = await publishReleaseWithToken(repo, raw, { release: makeRelease(), id: "rr1", now: "t" });
    expect(rec.workspaceId).toBe("w1");
    expect(rec.publishedById).toBe("dev");
  });

  it("rejects an unknown token", async () => {
    const repo = await seed();
    await expect(
      publishReleaseWithToken(repo, "bogus", { release: makeRelease(), id: "x", now: "t" })
    ).rejects.toBeInstanceOf(AuthzError);
  });
});

describe("deleteWorkspace (I-15)", () => {
  it("owner can delete; data is gone", async () => {
    const repo = await seed();
    await publishRelease(repo, { userId: "dev" }, { workspaceId: "w1", projectId: "p1", release: makeRelease(), id: "rr1", now: "t" });
    await deleteWorkspace(repo, { userId: "owner" }, "w1");
    await expect(listReleases(repo, { userId: "owner" }, "w1")).rejects.toBeInstanceOf(AuthzError); // no longer a member
  });

  it("non-owner member cannot delete", async () => {
    const repo = await seed();
    await expect(deleteWorkspace(repo, { userId: "dev" }, "w1")).rejects.toBeInstanceOf(AuthzError);
  });
});

describe("acknowledgement", () => {
  it("records a review and computes rate over members", async () => {
    const repo = await seed();
    await publishRelease(repo, { userId: "dev" }, { workspaceId: "w1", projectId: "p1", release: makeRelease(), id: "rr1", now: "t" });

    await acknowledgeRelease(repo, { userId: "dev" }, { workspaceId: "w1", releaseId: "rr1", id: "ack1", now: "t" });
    // Idempotent: second ack by same user does not double count.
    await acknowledgeRelease(repo, { userId: "dev" }, { workspaceId: "w1", releaseId: "rr1", id: "ack2", now: "t" });

    const rate = await acknowledgementRate(repo, { userId: "owner" }, "w1", "rr1");
    expect(rate.acknowledged).toBe(1);
    expect(rate.total).toBe(2); // owner + dev
    expect(rate.rate).toBe(0.5);
  });
});
