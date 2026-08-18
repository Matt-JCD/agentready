// GitHub ingestion: fetch repo tree + the files that matter for agent readiness.
// No cloning — everything comes from the REST API.

const API = "https://api.github.com";

const KEY_FILES = [
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "package.json",
  "pnpm-workspace.yaml",
  "pyproject.toml",
  "requirements.txt",
  "Makefile",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
  "go.mod",
  "Cargo.toml",
  "justfile",
  "Taskfile.yml",
];

// Directories whose presence (and file names) we report even if we don't read contents.
const SIGNAL_DIRS = ["docs", "test", "tests", ".github"];

const MAX_FILE_CHARS = 6000;
const MAX_TOTAL_CHARS = 60000;
const MAX_WORKFLOW_FILES = 3;
const MAX_DOC_FILES = 2;

export interface RepoFile {
  path: string;
  content: string;
  truncated: boolean;
}

export interface RepoData {
  owner: string;
  repo: string;
  description: string | null;
  defaultBranch: string;
  tree: string; // two-level rendered tree
  files: RepoFile[];
  found: string[];
  missing: string[];
  dirListings: Record<string, string[]>;
  treeTruncated: boolean;
}

export function parseRepoInput(input: string): { owner: string; repo: string } {
  const trimmed = input.trim().replace(/\.git$/, "").replace(/\/+$/, "");
  const urlMatch = trimmed.match(
    /github\.com[/:]([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)/
  );
  if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
  const bareMatch = trimmed.match(/^([A-Za-z0-9_.-]+)\/([A-Za-z0-9_.-]+)$/);
  if (bareMatch) return { owner: bareMatch[1], repo: bareMatch[2] };
  throw new PublicError(
    "That doesn't look like a GitHub repository. Paste a URL like https://github.com/owner/repo"
  );
}

export class PublicError extends Error {}

function headers(): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agentready",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  if (process.env.GITHUB_TOKEN) {
    h.Authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return h;
}

async function gh(path: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: headers() });
  if (res.status === 404) return null;
  if (res.status === 403 || res.status === 429) {
    throw new PublicError(
      "GitHub API rate limit hit. Try again in a few minutes."
    );
  }
  if (!res.ok) {
    throw new Error(`GitHub API ${res.status} for ${path}`);
  }
  return res.json();
}

async function fetchFileContent(
  owner: string,
  repo: string,
  path: string
): Promise<{ content: string; truncated: boolean } | null> {
  const data = await gh(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`
  );
  if (!data || Array.isArray(data) || data.type !== "file") return null;
  if (data.size > 200_000) {
    return { content: `[file present but too large to include: ${data.size} bytes]`, truncated: true };
  }
  const raw = Buffer.from(data.content ?? "", "base64").toString("utf-8");
  if (raw.length > MAX_FILE_CHARS) {
    return { content: raw.slice(0, MAX_FILE_CHARS) + "\n…[truncated]", truncated: true };
  }
  return { content: raw, truncated: false };
}

function renderTree(paths: { path: string; type: string }[]): {
  rendered: string;
  truncated: boolean;
} {
  // Keep only depth <= 2 entries, skip noise.
  const noise = /^(node_modules|\.git|vendor|dist|build|\.next|__pycache__)(\/|$)/;
  const depth2 = paths.filter(
    (p) => !noise.test(p.path) && p.path.split("/").length <= 2
  );
  const limited = depth2.slice(0, 300);
  const lines = limited.map((p) => {
    const parts = p.path.split("/");
    const indent = "  ".repeat(parts.length - 1);
    const name = parts[parts.length - 1];
    return `${indent}${name}${p.type === "tree" ? "/" : ""}`;
  });
  return {
    rendered: lines.join("\n"),
    truncated: depth2.length > limited.length,
  };
}

export async function fetchRepoData(input: string): Promise<RepoData> {
  const { owner, repo } = parseRepoInput(input);

  const meta = await gh(`/repos/${owner}/${repo}`);
  if (!meta) {
    throw new PublicError(
      `Repository ${owner}/${repo} not found. Is it public?`
    );
  }
  const defaultBranch: string = meta.default_branch;

  const treeData = await gh(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`
  );
  if (!treeData || !Array.isArray(treeData.tree)) {
    throw new PublicError(
      `Could not read the file tree of ${owner}/${repo}. The repository may be empty.`
    );
  }
  const allPaths: { path: string; type: string }[] = treeData.tree.map(
    (t: any) => ({ path: t.path, type: t.type })
  );
  const { rendered: tree, truncated: treeTruncated } = renderTree(allPaths);

  // Case-insensitive lookup of root-level files.
  const rootLower = new Map<string, string>();
  for (const p of allPaths) {
    if (p.type === "blob" && !p.path.includes("/")) {
      rootLower.set(p.path.toLowerCase(), p.path);
    }
  }
  const wanted: string[] = [];
  const missing: string[] = [];
  for (const f of KEY_FILES) {
    const hit = rootLower.get(f.toLowerCase());
    if (hit) wanted.push(hit);
    else missing.push(f);
  }

  // Workflow files and docs — grab a few.
  const workflowFiles = allPaths
    .filter((p) => p.path.startsWith(".github/workflows/") && p.type === "blob")
    .slice(0, MAX_WORKFLOW_FILES)
    .map((p) => p.path);
  const agentDocs = allPaths
    .filter(
      (p) =>
        p.type === "blob" &&
        /^docs\/(contributing|development|architecture|setup|getting[-_]?started|testing)/i.test(
          p.path
        )
    )
    .slice(0, MAX_DOC_FILES)
    .map((p) => p.path);
  // Nested agent instruction files (monorepos often have per-package CLAUDE.md/AGENTS.md)
  const nestedAgentFiles = allPaths
    .filter(
      (p) =>
        p.type === "blob" &&
        /\/(AGENTS|CLAUDE)\.md$/i.test(p.path) &&
        p.path.split("/").length <= 3
    )
    .slice(0, 3)
    .map((p) => p.path);

  const toFetch = [...wanted, ...workflowFiles, ...agentDocs, ...nestedAgentFiles];

  const files: RepoFile[] = [];
  let totalChars = 0;
  const results = await Promise.all(
    toFetch.map(async (path) => ({
      path,
      result: await fetchFileContent(owner, repo, path).catch(() => null),
    }))
  );
  for (const { path, result } of results) {
    if (!result) continue;
    if (totalChars + result.content.length > MAX_TOTAL_CHARS) continue;
    totalChars += result.content.length;
    files.push({ path, content: result.content, truncated: result.truncated });
  }

  // Directory listings for signal dirs (names only, first 30).
  const dirListings: Record<string, string[]> = {};
  for (const dir of SIGNAL_DIRS) {
    const entries = allPaths
      .filter((p) => p.path.startsWith(`${dir}/`))
      .slice(0, 30)
      .map((p) => p.path);
    if (entries.length) dirListings[dir] = entries;
  }

  return {
    owner,
    repo,
    description: meta.description ?? null,
    defaultBranch,
    tree,
    files,
    found: files.map((f) => f.path),
    missing,
    dirListings,
    treeTruncated,
  };
}
