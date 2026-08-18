// GitHub ingestion: fetch repo tree + the files that matter for agent readiness.
// No cloning — everything comes from the REST API.

const API = "https://api.github.com";

const KEY_FILES = [
  // Orientation & instructions
  "README.md",
  "AGENTS.md",
  "CLAUDE.md",
  "CONTRIBUTING.md",
  "SECURITY.md",
  "CODEOWNERS",
  ".github/CODEOWNERS",
  // Manifests & workspaces
  "package.json",
  "pnpm-workspace.yaml",
  "lerna.json",
  "turbo.json",
  "nx.json",
  "pyproject.toml",
  "requirements.txt",
  "setup.py",
  "setup.cfg",
  "go.mod",
  "Cargo.toml",
  "Gemfile",
  "composer.json",
  "mix.exs",
  "pom.xml",
  "build.gradle",
  // Task runners & environments
  "Makefile",
  "justfile",
  "Taskfile.yml",
  "Dockerfile",
  "docker-compose.yml",
  ".env.example",
  ".nvmrc",
  ".tool-versions",
  ".devcontainer/devcontainer.json",
  // Editor-agent rule files
  ".cursorrules",
  ".github/copilot-instructions.md",
  // Validation config (lint / format / types / tests / hooks)
  "tsconfig.json",
  "eslint.config.js",
  "eslint.config.mjs",
  ".eslintrc.json",
  ".eslintrc.js",
  ".eslintrc",
  ".prettierrc",
  "biome.json",
  "ruff.toml",
  "tox.ini",
  "pytest.ini",
  "jest.config.js",
  "jest.config.ts",
  "vitest.config.ts",
  ".pre-commit-config.yaml",
];

// Directories whose presence (and file names) we report even if we don't read contents.
const SIGNAL_DIRS = ["docs", "test", "tests", ".github", "scripts", "e2e"];

const MAX_FILE_CHARS = 8000;
const MAX_TOTAL_CHARS = 150000;
const MAX_WORKFLOW_FILES = 8;
const MAX_DOC_FILES = 5;
const MAX_NESTED_MANIFESTS = 8;

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

// A caller-supplied token (private repos) takes precedence over the server's
// GITHUB_TOKEN. Caller tokens are used for the one analysis and never stored.
function headers(token?: string): Record<string, string> {
  const h: Record<string, string> = {
    Accept: "application/vnd.github+json",
    "User-Agent": "agentready",
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const auth = token || process.env.GITHUB_TOKEN;
  if (auth) {
    h.Authorization = `Bearer ${auth}`;
  }
  return h;
}

async function gh(path: string, token?: string): Promise<any> {
  const res = await fetch(`${API}${path}`, { headers: headers(token) });
  if (res.status === 404) return null;
  if (res.status === 401) {
    throw new PublicError(
      "GitHub rejected the token. Check it has read access to this repository."
    );
  }
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
  path: string,
  token?: string
): Promise<{ content: string; truncated: boolean } | null> {
  const data = await gh(
    `/repos/${owner}/${repo}/contents/${encodeURIComponent(path).replace(/%2F/g, "/")}`,
    token
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

export async function fetchRepoData(
  input: string,
  token?: string
): Promise<RepoData> {
  const { owner, repo } = parseRepoInput(input);

  const meta = await gh(`/repos/${owner}/${repo}`, token);
  if (!meta) {
    throw new PublicError(
      `Repository ${owner}/${repo} not found. If it's private, paste a read-only token.`
    );
  }
  const defaultBranch: string = meta.default_branch;

  const treeData = await gh(
    `/repos/${owner}/${repo}/git/trees/${encodeURIComponent(defaultBranch)}?recursive=1`,
    token
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

  // Case-insensitive lookup of root-level files; exact match for the few
  // KEY_FILES that live in subdirectories (contain a slash).
  const rootLower = new Map<string, string>();
  const exactPaths = new Set<string>();
  for (const p of allPaths) {
    if (p.type !== "blob") continue;
    exactPaths.add(p.path);
    if (!p.path.includes("/")) {
      rootLower.set(p.path.toLowerCase(), p.path);
    }
  }
  const wanted: string[] = [];
  const missing: string[] = [];
  for (const f of KEY_FILES) {
    const hit = f.includes("/")
      ? exactPaths.has(f)
        ? f
        : undefined
      : rootLower.get(f.toLowerCase());
    if (hit) wanted.push(hit);
    else missing.push(f);
  }

  // CI workflows — read them all (up to the cap); they encode the real
  // definition of done.
  const workflowFiles = allPaths
    .filter((p) => p.path.startsWith(".github/workflows/") && p.type === "blob")
    .slice(0, MAX_WORKFLOW_FILES)
    .map((p) => p.path);
  const agentDocs = allPaths
    .filter(
      (p) =>
        p.type === "blob" &&
        /^docs?\/([\w-]*\/)?(contributing|development|architecture|setup|getting[-_]?started|testing|conventions|style|workflow)/i.test(
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
    .slice(0, 6)
    .map((p) => p.path);
  // Monorepo manifests: per-package package.json / pyproject.toml two or
  // three levels deep tell the evaluator where commands really live.
  const nestedManifests = allPaths
    .filter((p) => {
      if (p.type !== "blob") return false;
      const parts = p.path.split("/");
      if (parts.length < 2 || parts.length > 3) return false;
      const name = parts[parts.length - 1];
      return name === "package.json" || name === "pyproject.toml";
    })
    .slice(0, MAX_NESTED_MANIFESTS)
    .map((p) => p.path);

  const toFetch = [
    ...new Set([
      ...wanted,
      ...workflowFiles,
      ...agentDocs,
      ...nestedAgentFiles,
      ...nestedManifests,
    ]),
  ];

  const files: RepoFile[] = [];
  let totalChars = 0;
  const results = await Promise.all(
    toFetch.map(async (path) => ({
      path,
      result: await fetchFileContent(owner, repo, path, token).catch(
        () => null
      ),
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
