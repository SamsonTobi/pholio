import {
  COMPANY_GITHUB,
  COMPANY_NAME,
  IN_PROGRESS,
  PRINCIPLES,
  PRODUCTS,
} from "@/lib/company";

function Arrow({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" aria-hidden>
      <path d="M7 17 17 7M8 7h9v9" strokeLinecap="square" />
    </svg>
  );
}

export default function CompanyPage() {
  return (
    <div className="min-h-screen bg-[#E8EBF3] text-[#0A0D18] font-[family-name:var(--font-geist-sans)] selection:bg-[#1E00FF] selection:text-white">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-5 py-5 sm:px-8">
        <a href="#top" className="font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight">
          {COMPANY_NAME}
        </a>
        <nav className="flex items-center gap-6 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-wider">
          <a className="hover:text-[#1E00FF] focus-visible:outline-2 focus-visible:outline-[#1E00FF]" href="#products">Products</a>
          <a className="hover:text-[#1E00FF] focus-visible:outline-2 focus-visible:outline-[#1E00FF]" href="#approach">Approach</a>
          <a className="hover:text-[#1E00FF] focus-visible:outline-2 focus-visible:outline-[#1E00FF]" href={COMPANY_GITHUB}>GitHub</a>
        </nav>
      </header>

      <main id="top">
        <section className="mx-auto max-w-6xl px-5 pb-14 pt-14 sm:px-8 sm:pb-20 sm:pt-24">
          <p className="mb-6 font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest text-[#1E00FF]">
            Independent software, built by one person
          </p>
          <h1 className="max-w-4xl font-[family-name:var(--font-display)] text-5xl font-semibold leading-[0.98] tracking-tight sm:text-7xl lg:text-[5.5rem]">
            Small software for specific problems.
          </h1>
          <p className="mt-8 max-w-xl text-lg leading-relaxed text-[#2A3040]">
            Reading apps, browser extensions, agents and payment tools. I design, build and ship each one myself, and keep it working after launch.
          </p>
        </section>

        <section id="products" aria-labelledby="products-h" className="border-t border-[#0A0D18]">
          <h2 id="products-h" className="sr-only">Products</h2>
          <ul>
            {PRODUCTS.map((p) => (
              <li key={p.name} className="border-b border-[#0A0D18]">
                <a
                  href={p.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group block transition-colors duration-200 hover:bg-[#1E00FF] hover:text-white focus-visible:bg-[#1E00FF] focus-visible:text-white focus-visible:outline-none"
                >
                  <div className="mx-auto grid max-w-6xl gap-x-8 gap-y-3 px-5 py-7 sm:px-8 sm:py-9 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto] md:items-center">
                    <div>
                      <p className="mb-2 font-[family-name:var(--font-geist-mono)] text-[11px] uppercase tracking-widest opacity-60">
                        {p.kind} · {p.platform}
                      </p>
                      <h3 className="font-[family-name:var(--font-display)] text-5xl font-semibold leading-none tracking-tight sm:text-7xl">
                        {p.name}
                      </h3>
                    </div>
                    <p className="max-w-md text-base leading-relaxed text-[#2A3040] transition-colors group-hover:text-white/90 group-focus-visible:text-white/90">
                      {p.summary}
                    </p>
                    <div className="flex items-center gap-3 font-[family-name:var(--font-geist-mono)] text-xs md:justify-end">
                      <span className="opacity-70">{p.host}</span>
                      <Arrow className="h-7 w-7 transition-transform duration-200 group-hover:translate-x-1 group-hover:-translate-y-1" />
                    </div>
                  </div>
                </a>
              </li>
            ))}
          </ul>
        </section>

        <section id="approach" aria-labelledby="approach-h" className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-24">
          <h2 id="approach-h" className="max-w-2xl font-[family-name:var(--font-display)] text-3xl font-semibold leading-tight tracking-tight sm:text-5xl">
            How I build.
          </h2>
          <dl className="mt-12 grid gap-x-12 gap-y-10 sm:grid-cols-2">
            {PRINCIPLES.map((x) => (
              <div key={x.title} className="border-t border-[#0A0D18] pt-4">
                <dt className="font-[family-name:var(--font-display)] text-xl font-semibold">{x.title}</dt>
                <dd className="mt-2 max-w-md leading-relaxed text-[#2A3040]">{x.body}</dd>
              </div>
            ))}
          </dl>
        </section>

        <section aria-labelledby="next-h" className="border-t border-[#0A0D18] bg-[#0A0D18] text-[#E8EBF3]">
          <div className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
            <h2 id="next-h" className="font-[family-name:var(--font-geist-mono)] text-xs uppercase tracking-widest text-[#8E80FF]">
              In progress
            </h2>
            <ul className="mt-8 grid gap-10 sm:grid-cols-2">
              {IN_PROGRESS.map((x) => (
                <li key={x.name}>
                  <p className="font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight">{x.name}</p>
                  <p className="mt-2 max-w-md leading-relaxed text-[#B9BED0]">{x.summary}</p>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>

      <footer className="mx-auto flex max-w-6xl flex-col gap-3 px-5 py-8 font-[family-name:var(--font-geist-mono)] text-xs text-[#2A3040] sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <span>&copy; {new Date().getFullYear()} {COMPANY_NAME}</span>
        <a className="underline underline-offset-4 hover:text-[#1E00FF]" href={COMPANY_GITHUB}>
          github.com/SamsonTobi
        </a>
      </footer>
    </div>
  );
}
