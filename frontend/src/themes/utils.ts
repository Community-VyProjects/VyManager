export function deriveThemeFromPrimary(hue: number): Record<string, string> {
  const h = hue;
  const h2 = (hue + 40) % 360;
  const h3 = (hue + 80) % 360;
  const h4 = (hue + 120) % 360;
  const h5 = (hue + 160) % 360;
  return {
    "background":                  `oklch(0.14 0.02 ${h})`,
    "foreground":                  `oklch(0.93 0.01 ${h})`,
    "card":                        `oklch(0.17 0.03 ${h})`,
    "card-foreground":             `oklch(0.93 0.01 ${h})`,
    "popover":                     `oklch(0.17 0.03 ${h})`,
    "popover-foreground":          `oklch(0.93 0.01 ${h})`,
    "primary":                     `oklch(0.63 0.23 ${h})`,
    "primary-foreground":          `oklch(0.98 0.01 ${h})`,
    "secondary":                   `oklch(0.22 0.04 ${h})`,
    "secondary-foreground":        `oklch(0.93 0.01 ${h})`,
    "muted":                       `oklch(0.20 0.03 ${h})`,
    "muted-foreground":            `oklch(0.62 0.02 ${h})`,
    "accent":                      `oklch(0.26 0.05 ${h})`,
    "accent-foreground":           `oklch(0.93 0.01 ${h})`,
    "destructive":                 `oklch(0.58 0.22 25)`,
    "border":                      `oklch(0.40 0.05 ${h} / 30%)`,
    "input":                       `oklch(0.40 0.05 ${h} / 20%)`,
    "ring":                        `oklch(0.63 0.23 ${h})`,
    "chart-1":                     `oklch(0.63 0.23 ${h})`,
    "chart-2":                     `oklch(0.67 0.18 ${h2})`,
    "chart-3":                     `oklch(0.72 0.14 ${h3})`,
    "chart-4":                     `oklch(0.60 0.20 ${h4})`,
    "chart-5":                     `oklch(0.65 0.16 ${h5})`,
    "sidebar":                     `oklch(0.12 0.02 ${h})`,
    "sidebar-foreground":          `oklch(0.88 0.01 ${h})`,
    "sidebar-primary":             `oklch(0.63 0.23 ${h})`,
    "sidebar-primary-foreground":  `oklch(0.98 0.01 ${h})`,
    "sidebar-accent":              `oklch(0.22 0.04 ${h})`,
    "sidebar-accent-foreground":   `oklch(0.93 0.01 ${h})`,
    "sidebar-border":              `oklch(0.40 0.05 ${h} / 30%)`,
    "sidebar-ring":                `oklch(0.63 0.23 ${h})`,
    "scrollbar-track":             `oklch(0.12 0.02 ${h} / 60%)`,
    "scrollbar-thumb":             `oklch(0.45 0.10 ${h} / 70%)`,
    "radius":                      "0.625rem",
  };
}
