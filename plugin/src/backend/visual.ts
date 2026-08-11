/**
 * Pure assembly of persisted visual-diff screens (Feature 1 / VD-2).
 *
 * The web route does the impure work (decode base64, upload to object storage),
 * then calls this to turn upload results into the `ReleaseVisualScreen[]` stored
 * on a Release. Kept Figma- and storage-independent so it is unit-testable.
 */
import type {
  PersistedScreenshot,
  ReleaseVisualScreen,
  VisualUpload,
} from "../shared/release";

/** Result of uploading one screen's "before"/"after" images. */
export interface UploadedScreenshot {
  screen: string;
  before?: PersistedScreenshot;
  after?: PersistedScreenshot;
}

/**
 * Merge the highlight regions from `uploads` with the storage refs from
 * `uploaded` (matched by screen name). A screen with no successful upload still
 * yields an entry (regions preserved, image omitted) so the changelog stays
 * complete. Deterministic order: by screen name.
 */
export function assembleVisualScreens(
  uploads: VisualUpload[],
  uploaded: UploadedScreenshot[]
): ReleaseVisualScreen[] {
  const byScreen = new Map<string, UploadedScreenshot>();
  for (const u of uploaded) byScreen.set(u.screen, u);
  return uploads
    .map((u) => {
      const screen: ReleaseVisualScreen = { screen: u.screen, regions: u.regions };
      const refs = byScreen.get(u.screen);
      if (refs?.before) screen.before = refs.before;
      if (refs?.after) screen.after = refs.after;
      return screen;
    })
    .sort((a, b) => a.screen.localeCompare(b.screen));
}
