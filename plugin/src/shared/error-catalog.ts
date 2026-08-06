/**
 * Single source of user-facing error copy (C-02), keyed by PluginErrorCode.
 * Mirrors 03_TECHNICAL/ERROR_CATALOG.md. Both the plugin main thread and the UI
 * read from here so a code always maps to the same message and recovery flag.
 */
import type { PluginError, PluginErrorCode } from "./messages";

export const ERROR_COPY: Readonly<Record<PluginErrorCode, { message: string; recoverable: boolean }>> = {
  NO_SELECTION: {
    message: "Takip etmek istediğin frame veya section'ı seç.",
    recoverable: true,
  },
  UNSUPPORTED_SELECTION: {
    message: "Tek bir frame veya section seç.",
    recoverable: true,
  },
  SCOPE_TOO_LARGE: {
    message: "Bu scope çok büyük. Daha küçük bir frame veya section seç.",
    recoverable: true,
  },
  BASELINE_NOT_FOUND: {
    message: "Bu seçim için henüz baseline oluşturulmadı.",
    recoverable: true,
  },
  BASELINE_CORRUPT: {
    message: "Kayıtlı baseline okunamadı. Veri korundu; yeni baseline oluşturabilirsin.",
    recoverable: true,
  },
  SCHEMA_VERSION_UNSUPPORTED: {
    message: "Bu baseline daha yeni bir sürümle oluşturulmuş. Plugin'i güncelle.",
    recoverable: true,
  },
  STORAGE_ERROR: {
    message: "Kayıt işlemi başarısız. Mevcut baseline korundu.",
    recoverable: true,
  },
  SNAPSHOT_ERROR: {
    message: "Snapshot oluşturulamadı. Tasarım verisi değiştirilmedi.",
    recoverable: true,
  },
  FONT_ACCESS_ERROR: {
    message: "Bir metin katmanı okunamadı; o property atlandı.",
    recoverable: true,
  },
  EXPORT_EMPTY: {
    message: "Export edilecek veri yok. Önce baseline oluştur veya tarama yap.",
    recoverable: true,
  },
  UNKNOWN: {
    message: "Beklenmeyen bir hata oluştu. Tasarım verisi değiştirilmedi.",
    recoverable: true,
  },
};

/** Build a PluginError from a code, optionally overriding the default message. */
export function pluginError(code: PluginErrorCode, overrideMessage?: string): PluginError {
  const base = ERROR_COPY[code];
  return {
    code,
    message: overrideMessage ?? base.message,
    recoverable: base.recoverable,
  };
}
