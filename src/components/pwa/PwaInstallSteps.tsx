import { Share } from "lucide-react";

export function IosInstallSteps() {
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          1
        </span>
        <span>
          Buka <strong className="text-foreground">Safari</strong> (bukan Chrome) di halaman TARA ini.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          2
        </span>
        <span className="flex items-start gap-1.5">
          Tap ikon <Share className="h-4 w-4 text-gold shrink-0 mt-0.5" />{" "}
          <strong className="text-foreground">Bagikan</strong> di bawah layar.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          3
        </span>
        <span>
          Pilih <strong className="text-foreground">Add to Home Screen</strong> /{" "}
          <strong className="text-foreground">Tambahkan ke Layar Utama</strong>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          4
        </span>
        <span>
          Tap <strong className="text-foreground">Add</strong> — ikon TARA akan muncul di home screen HP Anda.
        </span>
      </li>
    </ol>
  );
}

export function AndroidInstallSteps() {
  return (
    <ol className="space-y-3 text-sm text-muted-foreground">
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          1
        </span>
        <span>
          Tap tombol <strong className="text-foreground">Install Aplikasi</strong> jika tersedia.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          2
        </span>
        <span>
          Atau buka menu <strong className="text-foreground">⋮</strong> di Chrome →{" "}
          <strong className="text-foreground">Install app</strong> /{" "}
          <strong className="text-foreground">Tambahkan ke Layar Utama</strong>.
        </span>
      </li>
      <li className="flex gap-3">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-semibold text-gold">
          3
        </span>
        <span>
          Buka TARA dari ikon di home screen untuk absensi GPS & kamera yang lebih stabil.
        </span>
      </li>
    </ol>
  );
}
