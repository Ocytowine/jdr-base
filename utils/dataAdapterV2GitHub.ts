import fs from 'fs/promises';
import path from 'path';
import Ajv from 'ajv';

type ID = string;

interface Options {
  branch?: string;
  token?: string;
  cacheDir?: string;
  useRawFallback?: boolean;
  scanFolders?: string[];
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
  ajv: Ajv;
  effectSchema: any;
  scanFolders: string[];

  constructor(owner: string, repo: string, options: Options = {}) {
    this.owner = owner;
    this.repo = repo;
    this.branch = options.branch || 'main';
    this.token = options.token;
    this.cacheDir = options.cacheDir;
    this.indexCache = new Map();
    this.fileCache = new Map();
    this.useRawFallback = options.useRawFallback ?? true;
    this.ajv = new Ajv({ allErrors: true, strict: false });
    this.effectSchema = null;
    this.scanFolders = options.scanFolders || ['classes','features','spells','races','items'];
  }

  apiContentsUrl(repoPath: string) {
    return `https://api.github.com/repos/${this.owner}/${this.repo}/contents/${encodeURIComponent(repoPath)}?ref=${encodeURIComponent(this.branch)}`;
  }
  rawUrl(repoPath: string) {
    return `https://raw.githubusercontent.com/${this.owner}/${this.repo}/${this.branch}/${repoPath}`;
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
    const url = this.apiContentsUrl(repoPath);
    const res = await this.fetchUrl(url);
    const json = await res.json();
    return json;
  }

  async fetchJsonFromRepoPath(repoPath: string) {
    if (this.fileCache.has(repoPath)) return this.fileCache.get(repoPath);
    const apiUrl = this.apiContentsUrl(repoPath);
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
      // fallback to raw if allowed
      if (this.useRawFallback) {
        const raw = this.rawUrl(repoPath);
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

  async initIndex() {
    for (const folder of this.scanFolders) {
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
    const tryPaths = [...this.scanFolders, 'data', 'content'];
    for (const p of tryPaths) {
      const rp = `${p}/${id}.json`;
      try {
        await this.fetchJsonFromRepoPath(rp);
        this.indexCache.set(id, rp);
        return rp;
      } catch (e) {
        // ignore
      }
    }
    return null;
  }

  async loadRaw(id: ID) {
    const rp = await this.findPathForId(id);
    if (!rp) return null;
    return await this.fetchJsonFromRepoPath(rp);
  }

  // load feature & normalize to {id,effects,links,raw}
  async loadFeatureById(id: ID) {
    const raw = await this.loadRaw(id);
    if (!raw) return null;
    const effects = raw.effects || raw.features || raw.mecanique?.effects || [];
    const feature = { id: raw.id || id, effects, links: raw.links || raw.mecanique?.links || raw.grants || null, raw };
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

  // validation of effects against schema if provided
  loadEffectSchema(schemaObj: any) {
    this.effectSchema = schemaObj;
    try {
      this.ajv.addSchema(schemaObj, 'effectSchema');
    } catch (e) {}
  }

  validateEffect(effect: any) {
    if (!this.effectSchema) return { valid: true };
    const validate = this.ajv.getSchema('effectSchema') || this.ajv.compile(this.effectSchema);
    const ok = validate(effect);
    return { valid: !!ok, errors: validate.errors };
  }

  // convenience listing
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