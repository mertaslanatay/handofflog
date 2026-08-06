# Plugin Main ↔ UI Message Contract

```ts
export type PluginToUIMessage =
  | { type: "INIT"; payload: InitPayload }
  | { type: "SELECTION_CHANGED"; payload: SelectionSummary }
  | { type: "SNAPSHOT_CREATED"; payload: SnapshotSummary }
  | { type: "SCAN_COMPLETED"; payload: ChangeSet }
  | { type: "ERROR"; payload: PluginError };

export type UIToPluginMessage =
  | { type: "GET_INIT" }
  | { type: "CREATE_BASELINE"; payload: CreateBaselineInput }
  | { type: "SCAN_CHANGES"; payload: ScanInput }
  | { type: "EXPORT_JSON"; payload: ExportInput }
  | { type: "CLOSE_PLUGIN" };

export interface PluginError {
  code:
    | "NO_SELECTION"
    | "UNSUPPORTED_SELECTION"
    | "BASELINE_NOT_FOUND"
    | "STORAGE_ERROR"
    | "SNAPSHOT_ERROR"
    | "UNKNOWN";
  message: string;
  recoverable: boolean;
}
```

Tüm mesajlar runtime validation'dan geçirilmelidir.
