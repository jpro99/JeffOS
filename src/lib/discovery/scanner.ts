import fs from "fs";
import path from "path";
import {
  DEFAULT_PROJECTS_ROOT,
  EXTRA_SCAN_ROOTS,
  PROJECT_CATALOG,
  SKIP_FOLDER_NAMES,
  matchCatalogByFolderName,
  matchCatalogByPath,
  normalizeName,
  normalizePath,
  type CatalogEntry,
} from "@/lib/discovery/catalog";

export interface DiscoveredFolder {
  name: string;
  path: string;
  exists: boolean;
  hasPackageJson: boolean;
  hasGit: boolean;
  hasSln: boolean;
  modifiedAt: string | null;
  catalogId?: string;
}

export interface DiscoveryScanResult {
  scannedAt: string;
  roots: string[];
  folders: DiscoveredFolder[];
  catalogMatches: CatalogEntry[];
  missingCatalogPaths: string[];
  unknownFolders: DiscoveredFolder[];
}

function isProjectLike(dirPath: string, name: string): boolean {
  if (SKIP_FOLDER_NAMES.has(normalizeName(name))) return false;
  try {
    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name.toLowerCase());
    const dirs = entries.filter((e) => e.isDirectory()).map((e) => e.name.toLowerCase());
    return (
      files.includes("package.json") ||
      files.some((f) => f.endsWith(".sln")) ||
      files.includes("pubspec.yaml") ||
      dirs.includes(".git") ||
      dirs.includes("apps") ||
      dirs.includes("src")
    );
  } catch {
    return false;
  }
}

function statDir(dirPath: string): DiscoveredFolder | null {
  try {
    if (!fs.existsSync(dirPath)) return null;
    const stat = fs.statSync(dirPath);
    if (!stat.isDirectory()) return null;

    const name = path.basename(dirPath);
    if (SKIP_FOLDER_NAMES.has(normalizeName(name))) return null;
    if (name.startsWith(".")) return null;

    const entries = fs.readdirSync(dirPath, { withFileTypes: true });
    const files = entries.filter((e) => e.isFile()).map((e) => e.name);
    const catalog = matchCatalogByPath(dirPath) ?? matchCatalogByFolderName(name);

    return {
      name,
      path: dirPath,
      exists: true,
      hasPackageJson: files.includes("package.json"),
      hasGit: entries.some((e) => e.isDirectory() && e.name === ".git"),
      hasSln: files.some((f) => f.endsWith(".sln")),
      modifiedAt: stat.mtime.toISOString(),
      catalogId: catalog?.id,
    };
  } catch {
    return null;
  }
}

function scanNestedRepo(parentPath: string, parentName: string): DiscoveredFolder[] {
  const found: DiscoveredFolder[] = [];
  try {
    const entries = fs.readdirSync(parentPath, { withFileTypes: true });
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const full = path.join(parentPath, entry.name);
      const catalog = matchCatalogByPath(full);
      if (catalog || isProjectLike(full, entry.name)) {
        const folder = statDir(full);
        if (folder) found.push(folder);
      }
    }
  } catch {
    /* ignore */
  }

  const parentFolder = statDir(parentPath);
  if (parentFolder && (parentFolder.hasPackageJson || parentFolder.hasSln)) {
    found.unshift({ ...parentFolder, catalogId: matchCatalogByPath(parentPath)?.id });
  } else if (found.length === 0 && parentFolder) {
    const catalog = matchCatalogByFolderName(parentName);
    if (catalog) found.push({ ...parentFolder, catalogId: catalog.id });
  }

  return found;
}

function scanRoot(root: string): DiscoveredFolder[] {
  const results: DiscoveredFolder[] = [];
  if (!fs.existsSync(root)) return results;

  const rootStat = fs.statSync(root);
  if (!rootStat.isDirectory()) {
    const single = statDir(root);
    return single ? [single] : [];
  }

  const normRoot = normalizePath(root);
  const normDefault = normalizePath(DEFAULT_PROJECTS_ROOT);
  if (isProjectLike(root, path.basename(root)) && normRoot !== normDefault) {
    const direct = statDir(root);
    if (direct) results.push(direct);
    return results;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(root, { withFileTypes: true });
  } catch {
    return results;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (SKIP_FOLDER_NAMES.has(normalizeName(entry.name))) continue;
    if (entry.name.startsWith(".")) continue;
    const full = path.join(root, entry.name);
    const nested = scanNestedRepo(full, entry.name);
    if (nested.length > 0) {
      results.push(...nested);
      continue;
    }
    if (isProjectLike(full, entry.name)) {
      const folder = statDir(full);
      if (folder) results.push(folder);
    }
  }

  return results;
}

export function scanProjectsDisk(roots: string[] = [DEFAULT_PROJECTS_ROOT, ...EXTRA_SCAN_ROOTS]): DiscoveryScanResult {
  const folders: DiscoveredFolder[] = [];
  const seen = new Set<string>();

  for (const root of roots) {
    for (const f of scanRoot(root)) {
      const key = normalizePath(f.path);
      if (seen.has(key)) continue;
      seen.add(key);
      folders.push(f);
    }
  }

  for (const entry of PROJECT_CATALOG) {
    if (!entry.path || entry.skip) continue;
    const key = normalizePath(entry.path);
    if (!seen.has(key) && fs.existsSync(entry.path)) {
      const folder = statDir(entry.path);
      if (folder) {
        seen.add(key);
        folders.push({ ...folder, catalogId: entry.id });
      }
    }
  }

  const catalogMatches = PROJECT_CATALOG.filter((c) => {
    if (!c.path) return false;
    return folders.some((f) => f.catalogId === c.id || normalizePath(f.path) === normalizePath(c.path));
  });

  const missingCatalogPaths = PROJECT_CATALOG.filter(
    (c) => c.path && !c.skip && !fs.existsSync(c.path),
  ).map((c) => c.path);

  const unknownFolders = folders.filter(
    (f) => !f.catalogId && (f.hasPackageJson || f.hasSln) && !f.name.startsWith("."),
  );

  return {
    scannedAt: new Date().toISOString(),
    roots,
    folders,
    catalogMatches,
    missingCatalogPaths,
    unknownFolders,
  };
}
