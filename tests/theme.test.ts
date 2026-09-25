import { describe, expect, it } from "vitest";
import { openDatabase } from "@/lib/db";
import { clearTheme, readTheme, writeTheme } from "@/lib/settings";
import {
  DEFAULT_THEME,
  paletteFor,
  parseTheme,
  readableOn,
  themeCss,
} from "@/lib/theme";

describe("parseTheme", () => {
  it("keeps presets and custom hex colors", () => {
    expect(parseTheme({ mode: "dark", background: "sage", accent: "#AA3355" })).toEqual({
      mode: "dark",
      background: "sage",
      accent: "#aa3355",
    });
  });

  it("falls back to defaults for anything unknown", () => {
    expect(parseTheme({ mode: "neon", background: "nope", accent: 4 })).toEqual(
      DEFAULT_THEME,
    );
    expect(parseTheme("not json")).toEqual(DEFAULT_THEME);
    expect(parseTheme(null)).toEqual(DEFAULT_THEME);
  });

  it("refuses values that could break out of the style tag", () => {
    const theme = parseTheme({
      background: "#fff;}</style><script>",
      accent: "red;background:url(x)",
    });
    expect(theme).toEqual(DEFAULT_THEME);
  });
});

describe("themeCss", () => {
  it("follows the system for the default theme", () => {
    const css = themeCss(DEFAULT_THEME);
    expect(css).toContain("--background:#f7f6f3");
    expect(css).toContain("@media (prefers-color-scheme: dark)");
    expect(css).toContain("--background:#191919");
  });

  it("forces a single scheme when the mode is set", () => {
    const css = themeCss({ ...DEFAULT_THEME, mode: "dark" });
    expect(css).not.toContain("@media");
    expect(css).toContain("color-scheme:dark");
    expect(css).toContain("--background:#191919");
  });

  it("derives text color from a custom background", () => {
    expect(paletteFor({ ...DEFAULT_THEME, background: "#101820" }, "light").scheme).toBe(
      "dark",
    );
    expect(paletteFor({ ...DEFAULT_THEME, background: "#fdf6e3" }, "dark").scheme).toBe(
      "light",
    );
  });

  it("uses a custom accent for check marks", () => {
    const palette = paletteFor({ ...DEFAULT_THEME, accent: "#ffd400" }, "light");
    expect(palette.done).toBe("#ffd400");
    expect(palette.doneForeground).toBe("#191919");
  });
});

describe("readableOn", () => {
  it("picks white on dark fills and near-black on light ones", () => {
    expect(readableOn("#0f7b6c")).toBe("#ffffff");
    expect(readableOn("#ffffff")).toBe("#191919");
  });
});

describe("theme storage", () => {
  it("round-trips and resets", () => {
    const db = openDatabase(":memory:");
    expect(readTheme(db)).toEqual(DEFAULT_THEME);
    writeTheme(db, { mode: "light", background: "rose", accent: "purple" });
    writeTheme(db, { mode: "dark", background: "rose", accent: "purple" });
    expect(readTheme(db)).toEqual({ mode: "dark", background: "rose", accent: "purple" });
    clearTheme(db);
    expect(readTheme(db)).toEqual(DEFAULT_THEME);
  });
});
