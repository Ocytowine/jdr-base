import fs from 'fs/promises';
import path from 'path';

type ID = string;

interface Options {
  branch?: string;
  token?: string;
  cacheDir?: string;
  useRawFallback?: boolean;
}

function apiContentsUrl(owner: string, repo: string, repoPath: string, branch = 'main') {
  return `https://api.github.com/repos/${owner}/${repo}/contents/${encodeURIComponent(repoPath)}?ref=${encodeURIComponent(branch)}`;
}
function rawUrl(owner: string, repo: string, branch: string, repoPath: string) {
  return `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${repoPath}`;
}

export class DataAdapterV2GitHub {
  owner: string;
  repo: string;
  branch: string;
  token?: string;
  cacheDir?: string;
  indexCache: Map<ID, string>;
  fileCache: Map<string, any>;
  useRawFallback: boolean;

  constructor(owner: string, repo: string, options: Options = {}) {
    this.owner = owner;
    this.repo = repo;
    this.branch = options.branch || 'main';
    this.token = options.token;
    this.cacheDir = options.cacheDir;
    this.indexCache = new Map();
    this.fileCache = new Map();
    this.useRawFallback = options.useRawFallback ?? true;
  }

  async fetchUrl(url: string) {
    const headers: any = { 'Accept': 'application/vnd.github.v3+json' };
    if (this.token) headers['Authorization'] = `token ${this.token}`;
    const res = await fetch(url, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`HTTP ${res.status} ${res.statusText} ${url} : ${text.slice(0,200)}`);
    }
    return res;
  }

  async listFilesInPath(repoPath: string) {
    const url = apiContentsUrl(this.owner, this.repo, repoPath, this.branch);
    const res = await this.fetchUrl(url);
    const json = await res.json();
    return json;
  }

  async fetchJsonFromRepoPath(repoPath: string) {
    if (this.fileCache.has(repoPath)) return this.fileCache.get(repoPath);
    const apiUrl = apiContentsUrl(this.owner, this.repo, repoPath, this.branch);
    try {
      const res = await this.fetchUrl(apiUrl);
      const j = await res.json();
      if (j && j.content) {
        const content = Buffer.from(j.content, 'base64').toString('utf8');
        const parsed = JSON.parse(content);
        this.fileCache.set(repoPath, parsed);
        if (this.cacheDir) {
          const onDisk = path.join(this.cacheDir, repoPath);
          await fs.mkdir(path.dirname(onDisk), { recursive: true });
          await fs.writeFile(onDisk, JSON.stringify(parsed, null, 2), 'utf8').catch(()=>{});
        }
        return parsed;
      }
    } catch (err) {
      if (this.useRawFallback) {
        const raw = rawUrl(this.owner, this.repo, this.branch, repoPath);
        try {
          const res2 = await fetch(raw);
          if (!res2.ok) throw new Error(`raw fetch failed ${res2.status}`);
          const parsed2 = await res2.json();
          this.fileCache.set(repoPath, parsed2);
          if (this.cacheDir) {
            const onDisk = path.join(this.cacheDir, repoPath);
            await fs.mkdir(path.dirname(onDisk), { recursive: true });
            await fs.writeFile(onDisk, JSON.stringify(parsed2, null, 2), 'utf8').catch(()=>{});
          }
          return parsed2;
        } catch (err2) {
          if (this.cacheDir) {
            try {
              const onDisk = path.join(this.cacheDir, repoPath);
              const data = await fs.readFile(onDisk, 'utf8');
              const parsed = JSON.parse(data);
              this.fileCache.set(repoPath, parsed);
              return parsed;
            } catch (e) {}
          }
          throw err;
        }
      } else {
        if (this.cacheDir) {
          try {
            const onDisk = path.join(this.cacheDir, repoPath);
            const data = await fs.readFile(onDisk, 'utf8');
            const parsed = JSON.parse(data);
            this.fileCache.set(repoPath, parsed);
            return parsed;
          } catch (e) {}
        }
        throw err;
      }
    }
  }

  async initIndex(scanFolders: string[] = ['classes','features','spells','races','items']) {
    for (const folder of scanFolders) {
      try {
        const entries = await this.listFilesInPath(folder);
        for (const e of entries) {
          if (e.type !== 'file') continue;
          if (!e.name.endsWith('.json')) continue;
          const id = e.name.replace(/\.json$/i,'');
          const repoPath = e.path;
          this.indexCache.set(id, repoPath);
        }
      } catch (err) {
        // ignore missing folders
      }
    }
  }

  async findPathForId(id: ID) {
    if (!this.indexCache.size) {
      await this.initIndex();
    }
    if (this.indexCache.has(id)) return this.indexCache.get(id)!;
    const tryPaths = ['classes','features','spells','races','items','data','content'];
    for (const p of tryPaths) {
      const rp = `${p}/${id}.json`;
      try {
        await this.fetchJsonFromRepoPath(rp);
        this.indexCache.set(id, rp);
        return rp;
      } catch (e) {}
    }
    return null;
  }

  async loadFeatureById(id: ID) {
    const repoPath = await this.findPathForId(id);
    if (!repoPath) return null;
    const raw = await this.fetchJsonFromRepoPath(repoPath);
    const effects = raw.effects || raw.features || raw.mecanique?.effects || [];
    const feature = {
      id: raw.id || id,
      effects,
      links: raw.links || raw.mecanique?.links || raw.grants || null,
      raw
    };
    return feature;
  }

  async resolveFeatureTree(seedIds: ID[], maxDepth = 8) {
    const out: any[] = [];
    const visited = new Set<ID>();
    const queue = [...seedIds];
    let depth = 0;
    while (queue.length && depth < maxDepth) {
      const id = queue.shift()!;
      if (visited.has(id)) { depth++; continue; }
      const feat = await this.loadFeatureById(id);
      visited.add(id);
      if (!feat) { depth++; continue; }
      out.push(feat);
      const grants = (feat.links && (feat.links.grants || feat.links.grant_feature_ids || feat.links.features || [])) || [];
      for (const g of grants) {
        if (!visited.has(g)) queue.push(g);
      }
      depth++;
    }
    return out;
  }

  async listRaces() {
    try {
      const entries = await this.listFilesInPath('races');
      return entries.filter((e:any)=>e.type==='file' && e.name.endsWith('.json')).map((e:any)=>({ id: e.name.replace('.json',''), path: e.path }));
    } catch (e) { return []; }
  }
  async listClasses() {
    try {
      const entries = await this.listFilesInPath('classes');
      return entries.filter((e:any)=>e.type==='file' && e.name.endsWith('.json')).map((e:any)=>({ id: e.name.replace('.json',''), path: e.path }));
    } catch (e) { return []; }
  }
}