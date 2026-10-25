import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

interface ShareQrProps {
  /** The share link, or null while it is still being prepared. */
  value: string | null;
  size?: number;
  caption?: string;
  className?: string;
}

interface QrModules {
  path: string;
  modules: number;
}

/** Quiet zone around the code, in modules, so scanners can lock on. */
const MARGIN = 4;

function buildPath(createQr: typeof import("qrcode-generator"), value: string): QrModules | null {
  try {
    const code = createQr(0, "M");
    code.addData(value);
    code.make();

    const modules = code.getModuleCount();
    let path = "";

    for (let row = 0; row < modules; row++) {
      for (let col = 0; col < modules; col++) {
        if (code.isDark(row, col)) path += `M${col} ${row}h1v1h-1z`;
      }
    }

    return { path, modules };
  } catch {
    return null;
  }
}

export function ShareQr({ value, size = 128, caption = "Scan to open this record on a phone", className }: ShareQrProps) {
  const [resolved, setResolved] = useState<{ value: string; code: QrModules | null } | null>(null);

  // The QR encoder is ~30 kB that only record screens need, so it loads on demand.
  useEffect(() => {
    if (!value) return;

    let active = true;

    import("qrcode-generator")
      .then(({ default: createQr }) => {
        if (active) setResolved({ value, code: buildPath(createQr, value) });
      })
      .catch(() => {
        if (active) setResolved({ value, code: null });
      });

    return () => {
      active = false;
    };
  }, [value]);

  // A new link gets a new code; the previous one is never shown against it.
  const code = value && resolved?.value === value ? resolved.code : null;

  // Long records need more dots in the same square, so the code grows with the payload
  // instead of shrinking below what a phone camera can resolve.
  const dimension = code ? Math.min(288, Math.max(size, Math.round(code.modules * 3.2))) : size;

  return (
    <figure className={cn("flex shrink-0 flex-col items-center gap-1.5", className)}>
      {code ? (
        <svg viewBox={`${-MARGIN} ${-MARGIN} ${code.modules + MARGIN * 2} ${code.modules + MARGIN * 2}`} width={dimension} height={dimension} role="img" aria-label="QR code for the share link" shapeRendering="crispEdges" className="rounded-md bg-white">
          <rect x={-MARGIN} y={-MARGIN} width={code.modules + MARGIN * 2} height={code.modules + MARGIN * 2} fill="#ffffff" />
          <path d={code.path} fill="#0b1f14" />
        </svg>
      ) : (
        <div style={{ width: size, height: size }} className="grid place-items-center rounded-md border border-dashed border-line text-[10px] text-ink-3" aria-hidden="true">
          QR code
        </div>
      )}

      <figcaption className="max-w-40 text-center text-[11px] leading-snug text-ink-3">{value ? caption : "Preparing the QR code…"}</figcaption>
    </figure>
  );
}
