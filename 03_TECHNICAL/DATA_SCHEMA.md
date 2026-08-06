# Data Schema

```ts
export type SnapshotSchemaVersion = 1;

export interface Snapshot {
  schemaVersion: SnapshotSchemaVersion;
  id: string;
  fileKey?: string;
  scopeId: string;
  scopeName: string;
  createdAt: string;
  nodes: Record<string, NodeSnapshot>;
}

export interface NodeSnapshot {
  trackingId: string;
  nodeId: string;
  parentTrackingId?: string;
  name: string;
  type: string;
  componentKey?: string; // eşleştirme metadata'sı; hash'e dahil DEĞİL (DEC-019)
  childTrackingIds: string[];
  properties: NodeProperties;
  hash: string;
}

export interface NodeProperties {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  visible?: boolean;
  opacity?: number;

  fills?: NormalizedPaint[];
  strokes?: NormalizedPaint[];
  cornerRadius?: number | number[];

  layoutMode?: string;
  itemSpacing?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;

  characters?: string;
  fontSize?: number | "mixed";
  fontName?: NormalizedFont | "mixed";
  lineHeight?: unknown;
  letterSpacing?: unknown;

  componentProperties?: Record<string, unknown>;
  variantProperties?: Record<string, string>;
}

export interface ChangeSet {
  baselineSnapshotId: string;
  currentSnapshotId: string;
  added: NodeChange[];
  removed: NodeChange[];
  modified: NodeChange[];
  unchangedCount: number;
}

export interface NodeChange {
  trackingId: string;
  nodeId?: string;
  nodeName: string;
  nodeType: string;
  kind: "added" | "removed" | "modified";
  propertyChanges: PropertyChange[];
  impact: "low" | "medium" | "high" | "breaking";
}

export interface PropertyChange {
  path: string;
  category:
    | "layout"
    | "visual"
    | "typography"
    | "content"
    | "component"
    | "structural";
  previousValue: unknown;
  currentValue: unknown;
}
```

## Storage keys

```text
handofflog:snapshot:<scopeId>
handofflog:releases:<scopeId>
handofflog:settings
```

## Stable tracking ID

Öncelik:
1. Plugin data tracking ID
2. Node ID
3. Deterministik fallback signature

MVP'de node üzerinde küçük tracking ID saklanabilir; büyük snapshot plugin data içine yazılmamalıdır.
