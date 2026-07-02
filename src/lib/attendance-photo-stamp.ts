import { format } from "date-fns";
import { id } from "date-fns/locale";

export type AttendancePhotoStamp = {
  employeeName: string;
  capturedAt: Date;
  latitude?: number;
  longitude?: number;
  officeName?: string | null;
  clientIp?: string | null;
  mode?: "in" | "out";
};

function formatStampDateTime(date: Date): string {
  const weekday = format(date, "EEEE", { locale: id });
  const datePart = format(date, "dd/MM/yyyy");
  const timePart = format(date, "HH:mm:ss");
  return `${weekday}, ${datePart} · ${timePart} WIB`;
}

function formatGps(latitude?: number, longitude?: number): string {
  if (latitude == null || longitude == null) return "GPS: tidak tersedia";
  return `GPS: ${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}

function buildStampLines(stamp: AttendancePhotoStamp): string[] {
  const lines = [
    stamp.employeeName?.trim() || "Karyawan",
    formatStampDateTime(stamp.capturedAt),
    formatGps(stamp.latitude, stamp.longitude),
    `IP: ${stamp.clientIp?.trim() || "—"}`,
  ];

  if (stamp.officeName?.trim()) {
    lines.push(`Lokasi: ${stamp.officeName.trim()}`);
  }

  lines.push(stamp.mode === "out" ? "CLOCK OUT" : "CLOCK IN");
  return lines;
}

function drawStampOverlay(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  stamp: AttendancePhotoStamp,
): void {
  const lines = buildStampLines(stamp);
  const fontSize = Math.max(13, Math.round(width * 0.028));
  const lineHeight = fontSize * 1.38;
  const paddingX = fontSize * 0.85;
  const paddingY = fontSize * 0.7;
  const margin = fontSize * 0.65;

  ctx.font = `600 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
  const textWidths = lines.map((line) => ctx.measureText(line).width);
  const boxWidth = Math.min(width - margin * 2, Math.max(...textWidths) + paddingX * 2);
  const boxHeight = lines.length * lineHeight + paddingY * 2;
  const boxX = margin;
  const boxY = height - boxHeight - margin;

  ctx.fillStyle = "rgba(0, 0, 0, 0.62)";
  roundRect(ctx, boxX, boxY, boxWidth, boxHeight, fontSize * 0.35);
  ctx.fill();

  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "top";
  lines.forEach((line, index) => {
    const y = boxY + paddingY + index * lineHeight;
    if (index === 0) {
      ctx.font = `700 ${Math.round(fontSize * 1.08)}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    } else if (index === lines.length - 1) {
      ctx.font = `700 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    } else {
      ctx.font = `500 ${fontSize}px system-ui, -apple-system, "Segoe UI", sans-serif`;
    }
    ctx.fillText(line, boxX + paddingX, y);
  });
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

import { getVideoCaptureSize } from "@/lib/camera";

/**
 * Capture a mirrored selfie frame and burn verification metadata into the image.
 */
export function captureStampedSelfie(
  video: HTMLVideoElement,
  stamp: AttendancePhotoStamp,
  stream?: MediaStream | null,
): string {
  const size = getVideoCaptureSize(video, stream);
  if (!size) throw new Error("Kamera belum siap");

  const canvas = document.createElement("canvas");
  canvas.width = size.width;
  canvas.height = size.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas tidak didukung");

  // Mirror to match front-camera preview.
  ctx.save();
  ctx.translate(canvas.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.restore();

  drawStampOverlay(ctx, canvas.width, canvas.height, stamp);

  const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
  if (!dataUrl || dataUrl.length < 200) {
    throw new Error("Gagal mengambil foto");
  }
  return dataUrl;
}

export async function fetchClientIp(): Promise<string | null> {
  try {
    const res = await fetch("/api/public/client-ip");
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data?.ip ?? null;
  } catch {
    return null;
  }
}
