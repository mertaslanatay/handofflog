/**
 * UI-side bridge over the typed message contract. Every inbound message is
 * runtime-validated before it reaches React state.
 */
import {
  PluginToUIMessageSchema,
  type PluginToUIMessage,
  type UIToPluginMessage,
} from "../shared/messages";

export function sendToPlugin(message: UIToPluginMessage): void {
  parent.postMessage({ pluginMessage: message }, "*");
}

export function onPluginMessage(
  handler: (message: PluginToUIMessage) => void
): () => void {
  const listener = (event: MessageEvent): void => {
    const data = event.data as { pluginMessage?: unknown } | undefined;
    if (!data || data.pluginMessage === undefined) return;
    const parsed = PluginToUIMessageSchema.safeParse(data.pluginMessage);
    if (parsed.success) handler(parsed.data);
  };
  window.addEventListener("message", listener);
  return () => window.removeEventListener("message", listener);
}
