import { describe, it, expect } from "vitest";
import { ERROR_COPY, pluginError } from "./error-catalog";
import { PluginErrorCodeSchema, PluginErrorSchema } from "./messages";

describe("error catalog (C-02)", () => {
  it("has copy for every error code", () => {
    for (const code of PluginErrorCodeSchema.options) {
      expect(ERROR_COPY[code]?.message.length).toBeGreaterThan(0);
    }
  });

  it("pluginError builds a schema-valid error", () => {
    const err = pluginError("SCOPE_TOO_LARGE");
    expect(PluginErrorSchema.safeParse(err).success).toBe(true);
    expect(err.message).toBe(ERROR_COPY.SCOPE_TOO_LARGE.message);
  });

  it("allows a message override", () => {
    expect(pluginError("UNKNOWN", "custom").message).toBe("custom");
  });
});
