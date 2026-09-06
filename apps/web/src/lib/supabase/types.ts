export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          slug: string;
          github_username: string | null;
          github_id: number | null;
          avatar_url: string | null;
          display_name: string | null;
          headline: string | null;
          site_url: string | null;
          template: "story" | "index";
          slug_history: string[];
          created_at: string;
        };
        Insert: {
          id: string;
          slug: string;
          github_username?: string | null;
          github_id?: number | null;
          avatar_url?: string | null;
          display_name?: string | null;
          headline?: string | null;
          site_url?: string | null;
          template?: "story" | "index";
          slug_history?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          github_username?: string | null;
          github_id?: number | null;
          avatar_url?: string | null;
          display_name?: string | null;
          headline?: string | null;
          site_url?: string | null;
          template?: "story" | "index";
          slug_history?: string[];
          created_at?: string;
        };
      };
      projects: {
        Row: {
          id: string;
          owner_id: string;
          github_repo_id: number | null;
          github_full_name: string | null;
          name: string;
          showcase_slug: string;
          description: string | null;
          readme_summary: string | null;
          icon_url: string | null;
          tags: string[];
          language: string | null;
          stars: number;
          live_url: string | null;
          status: "active" | "archived";
          last_push_at: string | null;
          telemetry_slug: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          owner_id: string;
          github_repo_id?: number | null;
          github_full_name?: string | null;
          name: string;
          showcase_slug: string;
          description?: string | null;
          readme_summary?: string | null;
          icon_url?: string | null;
          tags?: string[];
          language?: string | null;
          stars?: number;
          live_url?: string | null;
          status?: "active" | "archived";
          last_push_at?: string | null;
          telemetry_slug: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          owner_id?: string;
          github_repo_id?: number | null;
          github_full_name?: string | null;
          name?: string;
          showcase_slug?: string;
          description?: string | null;
          readme_summary?: string | null;
          icon_url?: string | null;
          tags?: string[];
          language?: string | null;
          stars?: number;
          live_url?: string | null;
          status?: "active" | "archived";
          last_push_at?: string | null;
          telemetry_slug?: string;
          created_at?: string;
        };
      };
      showcases: {
        Row: {
          id: string;
          project_id: string;
          owner_id: string;
          body: string;
          meta: Json;
          published_at: string;
          source: "github" | "agent" | "manual";
        };
        Insert: {
          id?: string;
          project_id: string;
          owner_id: string;
          body: string;
          meta?: Json;
          published_at?: string;
          source?: "github" | "agent" | "manual";
        };
        Update: {
          id?: string;
          project_id?: string;
          owner_id?: string;
          body?: string;
          meta?: Json;
          published_at?: string;
          source?: "github" | "agent" | "manual";
        };
      };
      mockups: {
        Row: {
          id: string;
          project_id: string;
          storage_path: string;
          device: "browser" | "phone" | "tablet";
          sort: number;
        };
        Insert: {
          id?: string;
          project_id: string;
          storage_path: string;
          device: "browser" | "phone" | "tablet";
          sort?: number;
        };
        Update: {
          id?: string;
          project_id?: string;
          storage_path?: string;
          device?: "browser" | "phone" | "tablet";
          sort?: number;
        };
      };
      raw_events: {
        Row: {
          id: number;
          telemetry_slug: string;
          session_hash: string;
          path: string | null;
          ts: string;
        };
        Insert: {
          id?: number;
          telemetry_slug: string;
          session_hash: string;
          path?: string | null;
          ts?: string;
        };
        Update: {
          id?: number;
          telemetry_slug?: string;
          session_hash?: string;
          path?: string | null;
          ts?: string;
        };
      };
      daily_stats: {
        Row: {
          project_id: string;
          day: string;
          visitors: number;
          actives_7d: number;
          total: number;
        };
        Insert: {
          project_id: string;
          day: string;
          visitors?: number;
          actives_7d?: number;
          total?: number;
        };
        Update: {
          project_id?: string;
          day?: string;
          visitors?: number;
          actives_7d?: number;
          total?: number;
        };
      };
      hacker_groups: {
        Row: {
          id: string;
          slug: string;
          name: string;
          visibility: "public" | "private";
          created_by: string | null;
          slug_history: string[];
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          visibility?: "public" | "private";
          created_by?: string | null;
          slug_history?: string[];
          created_at?: string;
        };
        Update: {
          id?: string;
          slug?: string;
          name?: string;
          visibility?: "public" | "private";
          created_by?: string | null;
          slug_history?: string[];
          created_at?: string;
        };
      };
      hacker_group_members: {
        Row: {
          group_id: string;
          user_id: string;
          role: "owner" | "member";
          joined_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
        Update: {
          group_id?: string;
          user_id?: string;
          role?: "owner" | "member";
          joined_at?: string;
        };
      };
      hacker_group_invites: {
        Row: {
          id: string;
          group_id: string;
          token: string;
          github_username: string | null;
          created_by: string | null;
          used_at: string | null;
          multi_use: boolean;
          created_at: string;
        };
        Insert: {
          id?: string;
          group_id: string;
          token: string;
          github_username?: string | null;
          created_by?: string | null;
          used_at?: string | null;
          multi_use?: boolean;
          created_at?: string;
        };
        Update: {
          id?: string;
          group_id?: string;
          token?: string;
          github_username?: string | null;
          created_by?: string | null;
          used_at?: string | null;
          multi_use?: boolean;
          created_at?: string;
        };
      };
      leaderboard_snapshots: {
        Row: {
          group_id: string;
          day: string;
          rankings: Json;
        };
        Insert: {
          group_id: string;
          day: string;
          rankings: Json;
        };
        Update: {
          group_id?: string;
          day?: string;
          rankings?: Json;
        };
      };
      notifications: {
        Row: {
          id: string;
          user_id: string;
          type: "digest" | "spike" | "peer_push" | "invite";
          payload: Json;
          read_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          type: "digest" | "spike" | "peer_push" | "invite";
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          type?: "digest" | "spike" | "peer_push" | "invite";
          payload?: Json;
          read_at?: string | null;
          created_at?: string;
        };
      };
      api_keys: {
        Row: {
          id: string;
          user_id: string;
          name: string | null;
          prefix: string;
          key_hash: string;
          scopes: string[];
          revoked_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          name?: string | null;
          prefix: string;
          key_hash: string;
          scopes?: string[];
          revoked_at?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          name?: string | null;
          prefix?: string;
          key_hash?: string;
          scopes?: string[];
          revoked_at?: string | null;
          created_at?: string;
        };
      };
    };
  };
};
