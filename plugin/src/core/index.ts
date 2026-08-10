/**
 * Public surface of the Figma-independent core diff engine.
 * Everything exported here is pure TypeScript and safe to run in a plain node
 * context (used by the plugin main thread, the UI, and unit tests alike).
 */
export { diffSnapshots, type DiffOptions, type PositionNoiseMode } from "./diff";
export {
  loadSnapshotFromFigmaExport,
  type FigmaExportNode,
  type LoadOptions,
} from "./fixture-loader";
export {
  diffStats,
  measureFalsePositives,
  measureMatchAccuracy,
  jitterSnapshot,
  type DiffStats,
  type FalsePositiveResult,
  type MatchAccuracyResult,
} from "./calibration";
export {
  filterChanges,
  sortByImpact,
  allTrackingIds,
  excludeFromChangeSet,
  type ReviewFilter,
} from "./review";
export {
  buildRelease,
  computeMaxImpact,
  suggestReleaseType,
  meaningfulChangeCount,
  type BuildReleaseInput,
} from "./release";
export {
  createTelemetryEmitter,
  scopeHash,
  type TelemetryEmitter,
} from "./telemetry";
export { contrastRatio, relativeLuminance, meetsAA, parseHex } from "./contrast";
export { relativeTime, formatDateTime } from "./relative-time";
export {
  summarizeByScreen,
  screenChangelogLines,
  type ScreenChangelog,
} from "./page-report";
export {
  evaluateScopeSize,
  evaluateSnapshotBytes,
  snapshotByteSize,
  SCOPE_SOFT_LIMIT,
  SCOPE_HARD_LIMIT,
  SNAPSHOT_SIZE_WARN_BYTES,
  SNAPSHOT_SIZE_HARD_BYTES,
  type SizeVerdict,
} from "./limits";
export { matchNodes, type MatchResult, type NodePair } from "./match";
export { hashNode, fnv1a } from "./hash";
export {
  stableStringify,
  stableEquals,
  roundNumber,
  NUMERIC_PRECISION,
} from "./serialize";
export {
  categoryForPath,
  impactForPath,
  impactForNodeChange,
  maxImpact,
  formatValue,
  summarize,
} from "./classify";
