export interface DesignReference {
  fileName: string;
  width: number;
  height: number;
  isDark: boolean;
  backgroundHex: string;
  textHex: string;
  accentHex: string;
  palette: string[];
  summary: string;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (c: number) => clamp(Math.round(c), 0, 255).toString(16).padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

function hexLuminance(hex: string): number {
  const n = hex.replace("#", "");
  const r = parseInt(n.slice(0, 2), 16) / 255;
  const g = parseInt(n.slice(2, 4), 16) / 255;
  const b = parseInt(n.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function saturation(r: number, g: number, b: number): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  if (max === 0) return 0;
  return (max - min) / max;
}

/** Bucket RGB to reduce noise — testable without canvas. */
export function extractPaletteFromRgba(
  data: Uint8ClampedArray,
  maxColors = 6,
): { palette: string[]; backgroundHex: string; textHex: string; accentHex: string; isDark: boolean } {
  const counts = new Map<string, number>();
  const bucket = 20;

  for (let i = 0; i < data.length; i += 4) {
    const a = data[i + 3];
    if (a < 40) continue;
    const r = Math.round(data[i] / bucket) * bucket;
    const g = Math.round(data[i + 1] / bucket) * bucket;
    const b = Math.round(data[i + 2] / bucket) * bucket;
    const hex = rgbToHex(r, g, b);
    counts.set(hex, (counts.get(hex) ?? 0) + 1);
  }

  const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]);
  const palette = sorted.slice(0, maxColors).map(([hex]) => hex);
  const backgroundHex = palette[0] ?? "#18181b";
  const isDark = hexLuminance(backgroundHex) < 0.45;

  const accentCandidate =
    sorted.find(([hex]) => {
      if (hex === backgroundHex) return false;
      const n = hex.replace("#", "");
      const r = parseInt(n.slice(0, 2), 16);
      const g = parseInt(n.slice(2, 4), 16);
      const b = parseInt(n.slice(4, 6), 16);
      return saturation(r, g, b) > 0.25;
    })?.[0] ?? palette[1] ?? (isDark ? "#a78bfa" : "#7c3aed");

  const textHex = isDark ? "#f4f4f5" : "#18181b";

  return { palette, backgroundHex, textHex, accentHex: accentCandidate, isDark };
}

export function formatDesignReferenceBlock(ref: DesignReference): string {
  const theme = ref.isDark ? "dark" : "light";
  return [
    "Design reference (match Jeff's screenshot — colors, contrast, spacing, radius, hierarchy):",
    `- Theme: ${theme} UI`,
    `- Background: ${ref.backgroundHex} · Text: ${ref.textHex} · Accent: ${ref.accentHex}`,
    `- Full palette: ${ref.palette.join(", ")}`,
    "- Replicate button styles, card borders, typography weight, and layout feel from the reference",
    "- In Cursor: attach the same screenshot with this prompt — match scheme pixel-close",
  ].join("\n");
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = dataUrl;
  });
}

export async function analyzeDesignDataUrl(
  dataUrl: string,
  fileName = "reference.png",
): Promise<DesignReference> {
  const img = await loadImage(dataUrl);
  const maxSide = 128;
  const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas not available");

  ctx.drawImage(img, 0, 0, w, h);
  const { data } = ctx.getImageData(0, 0, w, h);
  const { palette, backgroundHex, textHex, accentHex, isDark } = extractPaletteFromRgba(data);

  const summary = `${isDark ? "Dark" : "Light"} UI — bg ${backgroundHex}, accent ${accentHex}`;

  return {
    fileName,
    width: img.width,
    height: img.height,
    isDark,
    backgroundHex,
    textHex,
    accentHex,
    palette,
    summary,
  };
}

export async function analyzeDesignFile(file: File): Promise<DesignReference> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
  return analyzeDesignDataUrl(dataUrl, file.name);
}

export function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}
