export interface ArchivedProject {
  id: string;
  name: string;
  year?: string;
  role?: string;
  href?: string | null;
}

export function PreviouslySection({
  title = "Previously",
  bioLines = [],
  archivedProjects = [],
}: {
  title?: string;
  bioLines?: string[];
  archivedProjects?: ArchivedProject[];
}) {
  if (bioLines.length === 0 && archivedProjects.length === 0) return null;

  return (
    <div className="py-6 space-y-3">
      <h3 className="text-xs font-mono font-semibold uppercase tracking-wider text-neutral-400">
        {title}
      </h3>

      <div className="space-y-2 text-xs text-neutral-600 dark:text-neutral-400">
        {bioLines.map((line, i) => (
          <p key={i}>{line}</p>
        ))}

        {archivedProjects.map((p) => (
          <div key={p.id} className="flex items-center justify-between text-neutral-500">
            {p.href ? (
              <a href={p.href} className="hover:underline underline-offset-4">
                {p.name} {p.role && `— ${p.role}`}
              </a>
            ) : (
              <span>{p.name} {p.role && `— ${p.role}`}</span>
            )}
            {p.year && <span className="font-mono text-[11px]">{p.year}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}
