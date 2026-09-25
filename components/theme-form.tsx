"use client";

import { useState, useTransition } from "react";
import { resetThemeAction, saveThemeAction } from "@/lib/actions";
import {
  ACCENT_PRESETS,
  BACKGROUND_PRESETS,
  DEFAULT_THEME,
  isDefaultTheme,
  isHexColor,
  themeCss,
  type Theme,
  type ThemeMode,
} from "@/lib/theme";

const MODES: { id: ThemeMode; label: string }[] = [
  { id: "system", label: "System" },
  { id: "light", label: "Light" },
  { id: "dark", label: "Dark" },
];

function sameTheme(a: Theme, b: Theme) {
  return a.mode === b.mode && a.background === b.background && a.accent === b.accent;
}

// What a preset looks like under the chosen mode; split when following the system.
function swatch(mode: ThemeMode, light: string, dark: string) {
  if (mode === "light") return light;
  if (mode === "dark") return dark;
  return `linear-gradient(135deg, ${light} 50%, ${dark} 50%)`;
}

export function ThemeForm({ saved }: { saved: Theme }) {
  const [draft, setDraft] = useState(saved);
  const [customBackground, setCustomBackground] = useState(
    isHexColor(saved.background) ? saved.background : "#e9e4da",
  );
  const [customAccent, setCustomAccent] = useState(
    isHexColor(saved.accent) ? saved.accent : "#0f7b6c",
  );
  const [pending, start] = useTransition();
  const dirty = !sameTheme(draft, saved);
  const customBackgroundActive = isHexColor(draft.background);

  const update = (patch: Partial<Theme>) => setDraft({ ...draft, ...patch });

  return (
    <form
      action={(formData) => start(() => saveThemeAction(formData))}
      className="flex flex-col gap-6"
    >
      {/* Live preview. Comes after the saved theme in the document, so it wins. */}
      {dirty && <style>{themeCss(draft)}</style>}
      <input type="hidden" name="mode" value={draft.mode} />
      <input type="hidden" name="background" value={draft.background} />
      <input type="hidden" name="accent" value={draft.accent} />

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Mode</legend>
        <div className="inline-flex rounded-[4px] border border-border p-0.5">
          {MODES.map((mode) => (
            <button
              key={mode.id}
              type="button"
              aria-pressed={draft.mode === mode.id}
              onClick={() => update({ mode: mode.id })}
              className={`h-8 rounded-[3px] px-3 text-sm ${
                draft.mode === mode.id
                  ? "bg-hover font-medium"
                  : "text-foreground/70 hover:text-foreground"
              }`}
            >
              {mode.label}
            </button>
          ))}
        </div>
        {customBackgroundActive && (
          <p className="mt-2 text-xs text-muted">
            A custom background picks light or dark text from its own color.
          </p>
        )}
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Background</legend>
        <div className="flex flex-wrap gap-2">
          {BACKGROUND_PRESETS.map((preset) => (
            <Swatch
              key={preset.id}
              label={preset.label}
              fill={swatch(draft.mode, preset.light.background, preset.dark.background)}
              selected={draft.background === preset.id}
              onSelect={() => update({ background: preset.id })}
            />
          ))}
          <CustomSwatch
            label="Custom background"
            value={customBackground}
            selected={customBackgroundActive}
            onChange={(value) => {
              setCustomBackground(value);
              update({ background: value });
            }}
          />
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-sm text-muted">Accent</legend>
        <div className="flex flex-wrap gap-2">
          {ACCENT_PRESETS.map((preset) => (
            <Swatch
              key={preset.id}
              label={preset.label}
              fill={swatch(draft.mode, preset.light.done, preset.dark.done)}
              selected={draft.accent === preset.id}
              onSelect={() => update({ accent: preset.id })}
            />
          ))}
          <CustomSwatch
            label="Custom accent"
            value={customAccent}
            selected={isHexColor(draft.accent)}
            onChange={(value) => {
              setCustomAccent(value);
              update({ accent: value });
            }}
          />
        </div>
        <p className="mt-2 text-xs text-muted">
          Used for check marks, the heatmap, and focus rings.
        </p>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <button
          type="submit"
          disabled={!dirty || pending}
          className="h-10 rounded-[4px] bg-foreground px-4 text-sm font-medium text-background hover:opacity-90 disabled:opacity-40"
        >
          Save
        </button>
        {dirty && (
          <button
            type="button"
            onClick={() => setDraft(saved)}
            className="h-10 rounded-[4px] border border-border px-4 text-sm hover:bg-hover"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          disabled={pending || (isDefaultTheme(saved) && isDefaultTheme(draft))}
          onClick={() =>
            start(async () => {
              setDraft(DEFAULT_THEME);
              await resetThemeAction();
            })
          }
          className="h-10 rounded-[4px] px-2 text-sm text-muted hover:text-foreground hover:underline disabled:opacity-40 disabled:hover:no-underline"
        >
          Reset to default
        </button>
      </div>
    </form>
  );
}

function Swatch({
  label,
  fill,
  selected,
  onSelect,
}: {
  label: string;
  fill: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      aria-pressed={selected}
      onClick={onSelect}
      className={`h-9 w-9 rounded-full p-0.5 ${
        selected ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-foreground/40"
      }`}
    >
      <span
        className="block h-full w-full rounded-full border border-foreground/10"
        style={{ background: fill }}
      />
    </button>
  );
}

function CustomSwatch({
  label,
  value,
  selected,
  onChange,
}: {
  label: string;
  value: string;
  selected: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <label
      title={label}
      className={`relative flex h-9 cursor-pointer items-center gap-2 rounded-full py-0.5 pl-0.5 pr-3 text-sm ${
        selected ? "ring-2 ring-foreground" : "ring-1 ring-border hover:ring-foreground/40"
      }`}
    >
      <span
        className="block h-8 w-8 rounded-full border border-foreground/10"
        style={{ background: value }}
      />
      Custom
      <input
        type="color"
        aria-label={label}
        value={value}
        onClick={() => onChange(value)}
        onChange={(event) => onChange(event.target.value.toLowerCase())}
        className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
      />
    </label>
  );
}
