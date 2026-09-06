# Pholio

Pholio is an automated portfolio and project showcase for builders. It connects to your GitHub, pulls project context from your repositories, displays live visitor and user counts, and lets your coding agents update your page directly from your codebase.

---

## The problem

Builders build. They write code, push to GitHub, deploy to production, and move immediately to the next idea.

Most builders never show their work. Setting up a personal portfolio, writing marketing copy, taking screenshots, and keeping links updated takes hours of manual work. Even when builders set up a static portfolio, it goes stale within weeks. Projects sit in GitHub repositories with zero visibility.

Pholio removes that friction. You connect GitHub once, select your repositories, and get a unified, living showcase page with zero manual maintenance.

---

## How it works

```
  +------------------+      +------------------+      +------------------+
  |  GitHub Account  | ---> |  Pholio Engine   | ---> | Living Portfolio |
  |  (Repos, README) |      | (Parser & Media) |      | (pholio.dev/you) |
  +------------------+      +------------------+      +------------------+
                                     ^                         ^
                                     |                         |
                           +-------------------+     +-------------------+
                           | Coding Agent / MCP|     | Telemetry Snippet |
                           | (Local Codebase)  |     | (Active Visitors) |
                           +-------------------+     +-------------------+
                                                               ^
                                                               |
                                                     +-------------------+
                                                     |   Hacker Groups   |
                                                     |  & Leaderboards   |
                                                     +-------------------+
```

### 1. GitHub connection
Sign in with GitHub. Pholio reads your public repositories and any private repositories you grant access to.

### 2. Automated metadata extraction
You pick which repositories to include. For each project, Pholio automatically extracts:
- **Project description and context.** The engine reads your `README.md` file to identify what the product does, what problems it solves, and what tech stack it uses.
- **Logos and icons.** The parser checks the repository assets, web manifests, favicons, and mobile app icons to find an avatar or logo for the project.
- **Repository details.** Stars, primary language, recent release tags, and license.

### 3. Visual mockups
Add mockups and screenshots to highlight your UI. Pholio wraps screenshots in clean device frames (browser window, phone, or tablet) so visitors see a finished product rather than raw code.

### 4. Live visitor and user telemetry
Pholio gives you a lightweight, privacy-friendly tracking snippet to add to your web app or landing page. The snippet measures:
- Real-time active visitors.
- Daily and weekly active users.
- Total visit trends across all your products combined or per project.

Your portfolio displays a live pulse for each project, showing visitors that your apps are online, active, and used by real people.

### 5. Last updated status and daily showcases
Pholio tracks activity across your codebases and deployed apps:
- **Recency indicator.** Every project displays when it was last updated (e.g. "Updated 2 hours ago", "Last push 4 days ago"), making it easy to separate active builds from stable archived ones.
- **Daily showcases.** When you release updates, merge pull requests, or push significant milestones, Pholio generates daily showcase entries that highlight what you built today.

---

## Hacker groups and leaderboards

Building alone can feel isolating. Hacker groups let you create private or public circles with friends, hackathon teammates, or fellow indie makers to keep each other motivated.

### Group features
- **Member invitations.** Invite friends using a direct invite link or by their GitHub username.
- **Activity leaderboard.** Ranks group members using a composite score based on shipping cadence, recent updates, active visitors, and user growth.
- **Peer activity notifications.** Receive real-time alerts whenever a friend in your group updates their project, pushes code, or publishes a new showcase.

### Scheduled cron notifications and growth alerts
Automated cron jobs run in the background to send scheduled digests and milestone alerts:
- **Leaderboard standing.** Periodic summaries (weekly or daily) that report your current position on the group leaderboard, how many positions you moved, and who is currently leading.
- **Growth spike alerts.** Notifications triggered whenever any friend in your group experiences a significant percentage increase in users (for example, a 40% jump in active users over 48 hours), alerting you when a peer's project begins gaining traction.

---

## Agent integration and MCP

Pholio connects directly to modern AI coding assistants (Claude Desktop, Cursor, Antigravity, Windsurf, and custom agent loops) using the Model Context Protocol (MCP).

Instead of opening a browser dashboard to edit your portfolio, your agent updates your project showcase right from your local editor.

### Available MCP tools

| Tool | Purpose |
|---|---|
| `pholio_update_project` | Update project summary, tags, live URL, or status from the current workspace |
| `pholio_publish_showcase` | Post a daily update, changelog entry, or milestone showcase |
| `pholio_sync_readme` | Re-parse local or remote README to refresh project highlights |
| `pholio_upload_mockup` | Attach screenshots or UI assets from the local repository |
| `pholio_get_stats` | Retrieve live visitor and user counts for the current project |
| `pholio_get_leaderboard` | Fetch current leaderboard standing and peer updates in your hacker groups |

### MCP configuration

Add Pholio to your agent's MCP settings:

```json
{
  "mcpServers": {
    "pholio": {
      "command": "npx",
      "args": ["-y", "@pholio/mcp-server"],
      "env": {
        "PHOLIO_API_KEY": "your_pholio_api_key_here"
      }
    }
  }
}
```

---

## Master prompt for coding agents

Drop this prompt into your repository instructions (`AGENTS.md`, `.cursorrules`, or agent instructions) so your assistant keeps your Pholio page updated whenever you work:

```markdown
### Pholio Showcase Integration

You have access to the Pholio MCP server tools. When working in this codebase:

1. **Keep metadata current.** If you make major architectural changes, update dependencies, or adjust core features, check if the project description on Pholio needs updating using `pholio_update_project`.
2. **Post daily showcases.** When finalizing a user-facing feature, significant bug fix, or release milestone, ask or propose publishing a concise showcase update using `pholio_publish_showcase`.
3. **Format updates cleanly.** Updates should be 1 to 3 sentences describing what was built, why it matters, and a list of key improvements. Avoid hype words or promotional filler. State what changed plainly.
4. **Sync on demand.** If requested by the user to "update my portfolio" or "showcase this", inspect the local README, current git diff, and run `pholio_update_project` or `pholio_publish_showcase`.
```

---

## Live telemetry snippet

To display active visitors and active users on your Pholio cards, include this snippet in the `<head>` of your project:

```html
<script
  defer
  src="https://cdn.pholio.dev/tracker.js"
  data-project="your-project-slug"
></script>
```

For React / Next.js:

```tsx
import Script from "next/script";

export function PholioTracker() {
  return (
    <Script
      src="https://cdn.pholio.dev/tracker.js"
      data-project="your-project-slug"
      strategy="afterInteractive"
    />
  );
}
```

The script is under 1KB, does not set tracking cookies, and batches heartbeat pings to minimize network overhead.

---

## Development principles

This repository follows the core principles laid out in [AGENTS.md](file:///Users/USER/dev/pholio/AGENTS.md):
- **Simplest implementation.** Choose the most direct path that satisfies requirements without speculative layers.
- **Layered growth.** Start with a working end-to-end version and add capabilities progressively.
- **Modular components.** Keep services, parsers, and presentation separate.
- **Agent first.** Ensure all core actions are scriptable and accessible via MCP.
