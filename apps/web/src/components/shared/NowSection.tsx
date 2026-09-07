import { StatusPill } from "./StatusPill";

export function NowSection({
  title = "Now",
  body,
  date,
}: {
  title?: string;
  body?: string | null;
  date?: string | null;
}) {
  if (!body) return null;

  return (
    <div className="py-6 border-b border-neutral-100 dark:border-neutral-900 space-y-2">
      <div className="flex items-center gap-2">
        <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
          {title}
        </h3>
        <StatusPill status="Active" className="text-[10px] px-1.5 py-0" />
      </div>

      <p className="text-sm text-neutral-700 dark:text-neutral-300 leading-relaxed max-w-lg">
        {body}
      </p>

      {date && (
        <span className="text-[11px] font-mono text-neutral-400">
          Pinned {new Date(date).toLocaleDateString()}
        </span>
      )}
    </div>
  );
}
