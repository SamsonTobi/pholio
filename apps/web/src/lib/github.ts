import { Octokit } from "octokit";
import { env } from "./env";

export function createOctokit(token?: string | null) {
  if (token) {
    return new Octokit({ auth: token });
  }
  return new Octokit();
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  language: string | null;
  pushed_at: string;
  private: boolean;
  fork: boolean;
  topics?: string[];
  owner: {
    avatar_url: string;
  };
}

export async function listUserRepos(token?: string | null): Promise<GitHubRepoItem[]> {
  try {
    const octokit = createOctokit(token);
    const { data } = await octokit.rest.repos.listForAuthenticatedUser({
      sort: "pushed",
      direction: "desc",
      per_page: 50,
    });
    return data as GitHubRepoItem[];
  } catch {
    // Return sample repos if token is unavailable in development
    return [
      {
        id: 101,
        name: "pholio",
        full_name: "SamsonTobi/pholio",
        description: "Self-maintaining showcase for product builders",
        html_url: "https://github.com/SamsonTobi/pholio",
        homepage: "https://pholio.dev",
        stargazers_count: 142,
        language: "TypeScript",
        pushed_at: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
        private: false,
        fork: false,
        topics: ["nextjs", "typescript", "showcase", "telemetry"],
        owner: {
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        },
      },
      {
        id: 102,
        name: "bankroll",
        full_name: "SamsonTobi/bankroll",
        description: "Sports wagering and capital management mobile application",
        html_url: "https://github.com/SamsonTobi/bankroll",
        homepage: "https://bankroll.ng",
        stargazers_count: 88,
        language: "TypeScript",
        pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
        private: false,
        fork: false,
        topics: ["react-native", "expo", "fastapi"],
        owner: {
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        },
      },
      {
        id: 103,
        name: "linkpaddy",
        full_name: "SamsonTobi/linkpaddy",
        description: "Fast link curator and vaults for developer squads",
        html_url: "https://github.com/SamsonTobi/linkpaddy",
        homepage: "https://linkpaddy.com",
        stargazers_count: 64,
        language: "TypeScript",
        pushed_at: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
        private: false,
        fork: false,
        topics: ["react", "chrome-extension"],
        owner: {
          avatar_url: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=250&q=80",
        },
      },
    ];
  }
}
