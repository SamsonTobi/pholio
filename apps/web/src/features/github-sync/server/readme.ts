export interface ParsedReadme {
  summary: string;
  liveUrl?: string;
  tags: string[];
}

export function parseReadmeContent(markdown: string): ParsedReadme {
  if (!markdown || !markdown.trim()) {
    return { summary: "", tags: [] };
  }

  // Extract live URL from badge, markdown link, or explicit Live/Homepage line
  let liveUrl: string | undefined;
  const urlMatches = markdown.match(/(?:live|homepage|preview|demo|website):\s*(https?:\/\/[^\s\)\"'>]+)/i) ||
    markdown.match(/\[(?:live|demo|website|preview|visit)\]\((https?:\/\/[^\s\)]+)\)/i);
  if (urlMatches && urlMatches[1]) {
    liveUrl = urlMatches[1];
  }

  // Remove badges, HTML comments, image tags, code fences
  let clean = markdown
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/\[!\[.*?\]\(.*?\)\]\(.*?\)/g, "")
    .replace(/<[^>]+>/g, "");

  // Remove Markdown headings
  clean = clean.replace(/^#+\s+.*$/gm, "");

  // Extract first 2-3 sentences from main text
  const paragraphs = clean
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter((p) => p.length > 20 && !p.startsWith("-") && !p.startsWith("*"));

  const firstParagraph = paragraphs[0] || "";
  const sentences = firstParagraph.match(/[^\.!\?]+[\.!\?]+/g) || [firstParagraph];
  const summarySentences = sentences.slice(0, 3).join(" ").trim();

  // Extract bulleted tech stack if available
  const stackLines = clean
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => (l.startsWith("-") || l.startsWith("*")) && l.length > 2 && l.length < 80)
    .slice(0, 4);

  const finalSummary = stackLines.length > 0
    ? `${summarySentences}\n\n${stackLines.join("\n")}`
    : summarySentences;

  // Extract tech stack tags heuristic
  const knownTags = [
    "TypeScript", "JavaScript", "React", "Next.js", "Vue", "Svelte", "Node.js", "Python",
    "FastAPI", "Go", "Rust", "Swift", "Kotlin", "React Native", "Expo", "Flutter",
    "Tailwind CSS", "PostgreSQL", "Supabase", "Firebase", "Docker", "AWS"
  ];

  const matchedTags: string[] = [];
  for (const tag of knownTags) {
    const regex = new RegExp(`\\b${tag.replace(".", "\\.")}\\b`, "i");
    if (regex.test(markdown)) {
      matchedTags.push(tag);
    }
  }

  return {
    summary: finalSummary.substring(0, 500),
    liveUrl,
    tags: matchedTags.slice(0, 6),
  };
}
