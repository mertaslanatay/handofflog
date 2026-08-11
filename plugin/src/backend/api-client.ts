/**
 * Plugin → backend API client (I-08). Typed wrapper the Figma plugin uses to
 * publish a Release to the team backend. `fetch` is injected so it is unit-
 * testable and framework-agnostic; the response is validated with Zod so a
 * malformed server reply fails loudly rather than corrupting UI state.
 */
import { z } from "zod";
import { ReleaseSchema, type Release, type VisualUpload } from "../shared/release";

export type FetchLike = (
  input: string,
  init?: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
  }
) => Promise<{ ok: boolean; status: number; json: () => Promise<unknown> }>;

export interface ReleaseApiClientConfig {
  baseUrl: string;
  /** Connection token; sent over TLS only, never logged (SECURITY_AND_PRIVACY).
   *  The backend resolves workspace/project/user from it. */
  token: string;
  fetch: FetchLike;
}

export class ApiError extends Error {
  public readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const PublishResponseSchema = z.object({ release: ReleaseSchema });

export interface ReleaseApiClient {
  publishRelease(release: Release, visualUploads?: VisualUpload[]): Promise<Release>;
}

export function createReleaseApiClient(config: ReleaseApiClientConfig): ReleaseApiClient {
  const url = `${config.baseUrl.replace(/\/$/, "")}/api/releases`;
  return {
    async publishRelease(release: Release, visualUploads?: VisualUpload[]): Promise<Release> {
      const body =
        visualUploads && visualUploads.length > 0
          ? { release, visualUploads }
          : { release };
      const res = await config.fetch(url, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          authorization: `Bearer ${config.token}`,
        },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        throw new ApiError(res.status, `Publish failed with status ${res.status}.`);
      }
      const parsed = PublishResponseSchema.safeParse(await res.json());
      if (!parsed.success) {
        throw new ApiError(res.status, "Malformed publish response from server.");
      }
      return parsed.data.release;
    },
  };
}
