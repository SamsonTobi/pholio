import * as React from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

export interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string | null;
  alt?: string;
  fallback?: string;
}

export function Avatar({ className, src, alt, fallback, ...props }: AvatarProps) {
  const [error, setError] = React.useState(!src);
  const isDataUrl = Boolean(src && (src.startsWith("data:") || src.startsWith("blob:")));

  return (
    <div
      className={cn(
        "relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full border border-neutral-200 bg-neutral-100 dark:border-neutral-800 dark:bg-neutral-800",
        className
      )}
      {...props}
    >
      {src && !error ? (
        isDataUrl ? (
          <img
            src={src}
            alt={alt || "Avatar"}
            loading="lazy"
            decoding="async"
            className="aspect-square h-full w-full object-cover"
            onError={() => setError(true)}
          />
        ) : (
          <Image
            src={src}
            alt={alt || "Avatar"}
            fill
            loading="lazy"
            sizes="56px"
            className="aspect-square h-full w-full object-cover"
            onError={() => setError(true)}
          />
        )
      ) : (
        <span className="flex h-full w-full items-center justify-center font-medium text-xs text-neutral-600 dark:text-neutral-300">
          {fallback || alt?.substring(0, 2).toUpperCase() || "?"}
        </span>
      )}
    </div>
  );
}
