import { cn } from "@/lib/utils";

export interface DeviceFrameProps {
  device?: "browser" | "phone" | "tablet";
  src: string;
  alt?: string;
  className?: string;
}

export function DeviceFrame({
  device = "browser",
  src,
  alt = "Project Preview",
  className,
}: DeviceFrameProps) {
  if (device === "phone") {
    return (
      <div
        className={cn(
          "mx-auto w-[280px] sm:w-[320px] rounded-[36px] border-[8px] border-neutral-900 bg-neutral-900 shadow-xl overflow-hidden aspect-[9/19] relative dark:border-neutral-800",
          className
        )}
      >
        {/* Phone Notch */}
        <div className="absolute top-2 left-1/2 -translate-x-1/2 h-4 w-24 bg-neutral-900 rounded-full z-20 flex items-center justify-center">
          <div className="h-2 w-2 rounded-full bg-neutral-800 mr-2" />
          <div className="h-1.5 w-1.5 rounded-full bg-neutral-800" />
        </div>
        {/* Screen */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-[28px]"
        />
      </div>
    );
  }

  if (device === "tablet") {
    return (
      <div
        className={cn(
          "mx-auto w-full max-w-[640px] rounded-[28px] border-[10px] border-neutral-900 bg-neutral-900 shadow-xl overflow-hidden aspect-[4/3] relative dark:border-neutral-800",
          className
        )}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="w-full h-full object-cover rounded-[18px]"
        />
      </div>
    );
  }

  // Browser frame (default)
  return (
    <div
      className={cn(
        "w-full rounded-2xl border border-neutral-200 bg-white shadow-md overflow-hidden dark:border-neutral-800 dark:bg-neutral-950",
        className
      )}
    >
      {/* Browser Chrome */}
      <div className="h-9 px-4 border-b border-neutral-100 bg-neutral-50 flex items-center gap-3 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
          <div className="h-2.5 w-2.5 rounded-full bg-neutral-300 dark:bg-neutral-700" />
        </div>
        <div className="flex-1 max-w-sm mx-auto h-5 rounded-md bg-white border border-neutral-200/80 px-2 flex items-center text-[10px] text-neutral-400 font-mono truncate dark:border-neutral-800 dark:bg-neutral-950">
          https://preview.pholio.dev
        </div>
      </div>
      {/* Screen */}
      <div className="aspect-[16/9] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-900">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={alt} className="w-full h-full object-cover" />
      </div>
    </div>
  );
}
