export const THEME_MODES = ["system", "light", "dark"] as const;
export type ThemeMode = (typeof THEME_MODES)[number];

export type Theme = {
  mode: ThemeMode;
  // Preset id or a custom "#rrggbb".
  background: string;
  accent: string;
};

export const DEFAULT_THEME: Theme = {
  mode: "system",
  background: "default",
  accent: "default",
};

type Scheme = "light" | "dark";

type BackgroundPreset = {
  id: string;
  label: string;
  light: { background: string; surface: string };
  dark: { background: string; surface: string };
};

type AccentPreset = {
  id: string;
  label: string;
  light: { accent: string; done: string };
  dark: { accent: string; done: string };
};

export const BACKGROUND_PRESETS: BackgroundPreset[] = [
  {
    id: "default",
    label: "Default",
    light: { background: "#f7f6f3", surface: "#ffffff" },
    dark: { background: "#191919", surface: "#202020" },
  },
  {
    id: "paper",
    label: "Paper",
    light: { background: "#ffffff", surface: "#fbfbfa" },
    dark: { background: "#121212", surface: "#1b1b1b" },
  },
  {
    id: "slate",
    label: "Slate",
    light: { background: "#f1f4f8", surface: "#ffffff" },
    dark: { background: "#14181f", surface: "#1b212b" },
  },
  {
    id: "sage",
    label: "Sage",
    light: { background: "#f0f4ef", surface: "#ffffff" },
    dark: { background: "#141a16", surface: "#1b231d" },
  },
  {
    id: "sand",
    label: "Sand",
    light: { background: "#f6efe3", surface: "#fffaf2" },
    dark: { background: "#1b1712", surface: "#241f18" },
  },
  {
    id: "rose",
    label: "Rose",
    light: { background: "#faf0f1", surface: "#ffffff" },
    dark: { background: "#1c1516", surface: "#251c1d" },
  },
  {
    id: "lavender",
    label: "Lavender",
    light: { background: "#f3f1fa", surface: "#ffffff" },
    dark: { background: "#17151d", surface: "#1f1c27" },
  },
];

function single(light: string, dark: string) {
  return {
    light: { accent: light, done: light },
    dark: { accent: dark, done: dark },
  };
}

export const ACCENT_PRESETS: AccentPreset[] = [
  {
    id: "default",
    label: "Default",
    light: { accent: "#2383e2", done: "#0f7b6c" },
    dark: { accent: "#529cca", done: "#4dab9a" },
  },
  { id: "blue", label: "Blue", ...single("#2383e2", "#529cca") },
  { id: "purple", label: "Purple", ...single("#9065b0", "#9a6dd7") },
  { id: "pink", label: "Pink", ...single("#c14c8a", "#d15796") },
  { id: "orange", label: "Orange", ...single("#d9730d", "#e08a2c") },
  { id: "red", label: "Red", ...single("#e03e3e", "#df5452") },
  { id: "graphite", label: "Graphite", ...single("#37352f", "#d4d4d2") },
];

const NEUTRALS: Record<
  Scheme,
  { foreground: string; muted: string; border: string; hover: string; danger: string }
> = {
  light: {
    foreground: "#37352f",
    muted: "#787774",
    border: "#e9e9e7",
    hover: "#37352f0a",
    danger: "#b91c1c",
  },
  dark: {
    foreground: "#ffffffcf",
    muted: "#9b9b97",
    border: "#ffffff17",
    hover: "#ffffff0a",
    danger: "#f87171",
  },
};

const HEX = /^#[0-9a-f]{6}$/;

export function isHexColor(value: unknown): value is string {
  return typeof value === "string" && HEX.test(value);
}

function isBackgroundPreset(id: string) {
  return BACKGROUND_PRESETS.some((preset) => preset.id === id);
}

function isAccentPreset(id: string) {
  return ACCENT_PRESETS.some((preset) => preset.id === id);
}

export function parseTheme(input: unknown): Theme {
  const value =
    typeof input === "string" ? safeJson(input) : (input as unknown);
  if (!value || typeof value !== "object") return { ...DEFAULT_THEME };
  const record = value as Record<string, unknown>;

  const mode = THEME_MODES.includes(record.mode as ThemeMode)
    ? (record.mode as ThemeMode)
    : DEFAULT_THEME.mode;
  const background = normalizeChoice(record.background, isBackgroundPreset);
  const accent = normalizeChoice(record.accent, isAccentPreset);

  return {
    mode,
    background: background ?? DEFAULT_THEME.background,
    accent: accent ?? DEFAULT_THEME.accent,
  };
}

function normalizeChoice(
  value: unknown,
  isPreset: (id: string) => boolean,
): string | null {
  if (typeof value !== "string") return null;
  const lower = value.trim().toLowerCase();
  if (isPreset(lower) || HEX.test(lower)) return lower;
  return null;
}

function safeJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export function isDefaultTheme(theme: Theme) {
  return (
    theme.mode === DEFAULT_THEME.mode &&
    theme.background === DEFAULT_THEME.background &&
    theme.accent === DEFAULT_THEME.accent
  );
}

function luminance(hex: string): number {
  const channel = (offset: number) => {
    const c = parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(1) + 0.7152 * channel(3) + 0.0722 * channel(5);
}

export function isDarkColor(hex: string) {
  return luminance(hex) < 0.18;
}

// Text color that stays readable on top of the given fill.
export function readableOn(hex: string) {
  const l = luminance(hex);
  const whiteContrast = 1.05 / (l + 0.05);
  const blackContrast = (l + 0.05) / 0.05;
  return whiteContrast >= blackContrast ? "#ffffff" : "#191919";
}

function mixHex(hex: string, toward: string, amount: number) {
  const mix = (offset: number) => {
    const a = parseInt(hex.slice(offset, offset + 2), 16);
    const b = parseInt(toward.slice(offset, offset + 2), 16);
    return Math.round(a + (b - a) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(1)}${mix(3)}${mix(5)}`;
}

export type Palette = {
  scheme: Scheme;
  background: string;
  surface: string;
  foreground: string;
  muted: string;
  border: string;
  hover: string;
  danger: string;
  accent: string;
  done: string;
  doneForeground: string;
};

export function paletteFor(theme: Theme, scheme: Scheme): Palette {
  let background: string;
  let surface: string;
  let effective = scheme;

  if (isHexColor(theme.background)) {
    // A single custom color decides light vs dark on its own.
    effective = isDarkColor(theme.background) ? "dark" : "light";
    background = theme.background;
    surface =
      effective === "dark"
        ? mixHex(theme.background, "#ffffff", 0.05)
        : mixHex(theme.background, "#ffffff", 0.6);
  } else {
    const preset =
      BACKGROUND_PRESETS.find((p) => p.id === theme.background) ??
      BACKGROUND_PRESETS[0];
    ({ background, surface } = preset[effective]);
  }

  let accent: string;
  let done: string;
  if (isHexColor(theme.accent)) {
    accent = theme.accent;
    done = theme.accent;
  } else {
    const preset =
      ACCENT_PRESETS.find((p) => p.id === theme.accent) ?? ACCENT_PRESETS[0];
    ({ accent, done } = preset[effective]);
  }

  return {
    scheme: effective,
    background,
    surface,
    ...NEUTRALS[effective],
    accent,
    done,
    doneForeground: readableOn(done),
  };
}

function declarations(p: Palette) {
  return [
    `color-scheme:${p.scheme}`,
    `--background:${p.background}`,
    `--foreground:${p.foreground}`,
    `--muted:${p.muted}`,
    `--border:${p.border}`,
    `--surface:${p.surface}`,
    `--page:${p.surface}`,
    `--hover:${p.hover}`,
    `--accent:${p.accent}`,
    `--done:${p.done}`,
    `--done-foreground:${p.doneForeground}`,
    `--danger:${p.danger}`,
  ].join(";");
}

// The doubled :root beats the defaults in globals.css, including their
// prefers-color-scheme block, so a forced mode wins on any device.
export function themeCss(theme: Theme): string {
  const follow = theme.mode === "system" && !isHexColor(theme.background);
  if (!follow) {
    const scheme = theme.mode === "dark" ? "dark" : "light";
    return `:root:root{${declarations(paletteFor(theme, scheme))}}`;
  }
  return (
    `:root:root{${declarations(paletteFor(theme, "light"))}}` +
    `@media (prefers-color-scheme: dark){:root:root{${declarations(paletteFor(theme, "dark"))}}}`
  );
}

export function themeColors(theme: Theme): { light: string; dark: string } {
  return {
    light: paletteFor(theme, theme.mode === "dark" ? "dark" : "light").background,
    dark: paletteFor(theme, theme.mode === "light" ? "light" : "dark").background,
  };
}
