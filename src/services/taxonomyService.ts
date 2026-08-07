import { TaxonomyNode } from '../types';
import { apiService } from './api';

const STORAGE_KEY = 'crm_taxonomy_nodes';

type TaxonomyScope = TaxonomyNode['scope'];

const normalizeNode = (node: TaxonomyNode): TaxonomyNode => ({
  ...node,
  parentId: node.parentId || null,
  createdAt: new Date(node.createdAt),
});

class TaxonomyService {
  private nodes: TaxonomyNode[] = [];
  private refreshPromise: Promise<TaxonomyNode[]> | null = null;

  constructor() {
    this.loadCache();
  }

  private loadCache() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      this.nodes = saved ? JSON.parse(saved).map(normalizeNode) : [];
    } catch {
      this.nodes = [];
    }
  }

  private saveCache() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(this.nodes));
  }

  clearSession() {
    this.nodes = [];
    this.refreshPromise = null;
    localStorage.removeItem(STORAGE_KEY);
  }

  private syncNodes(nodes: TaxonomyNode[]) {
    this.nodes = nodes.map(normalizeNode);
    this.saveCache();
  }

  async refreshFromApi(): Promise<TaxonomyNode[]> {
    if (!this.refreshPromise) {
      this.refreshPromise = (async () => {
        try {
          const remoteNodes = (await apiService.get<TaxonomyNode[]>('/taxonomy/nodes')).map(normalizeNode);
          this.syncNodes(remoteNodes);
        } catch {
          // Keep cached nodes when offline; do not inject demo defaults.
        } finally {
          this.refreshPromise = null;
        }

        return this.nodes;
      })();
    }

    return this.refreshPromise;
  }

  getNodes(scope?: TaxonomyScope): TaxonomyNode[] {
    return scope ? this.nodes.filter((node) => node.scope === scope) : [...this.nodes];
  }

  getRoots(scope: TaxonomyScope): TaxonomyNode[] {
    return this.nodes.filter((node) => node.scope === scope && !node.parentId);
  }

  getChildren(parentId: string): TaxonomyNode[] {
    return this.nodes.filter((node) => node.parentId === parentId);
  }

  async addNode(scope: TaxonomyScope, name: string, parentId?: string | null): Promise<TaxonomyNode> {
    const created = normalizeNode(
      await apiService.post<TaxonomyNode>('/taxonomy/nodes', {
        scope,
        name,
        parentId: parentId || null,
      })
    );

    this.nodes = [...this.nodes.filter((node) => node.id !== created.id), created];
    this.saveCache();
    return created;
  }

  async updateNode(nodeId: string, name: string): Promise<TaxonomyNode> {
    const updated = normalizeNode(await apiService.put<TaxonomyNode>(`/taxonomy/nodes/${nodeId}`, { name }));
    this.nodes = this.nodes.map((node) => (node.id === updated.id ? updated : node));
    this.saveCache();
    return updated;
  }

  async deleteNode(nodeId: string): Promise<void> {
    await apiService.delete<{ deleted: boolean }>(`/taxonomy/nodes/${nodeId}`);
    const toDelete = new Set<string>([nodeId]);
    let changed = true;

    while (changed) {
      changed = false;
      this.nodes.forEach((node) => {
        if (node.parentId && toDelete.has(node.parentId) && !toDelete.has(node.id)) {
          toDelete.add(node.id);
          changed = true;
        }
      });
    }

    this.nodes = this.nodes.filter((node) => !toDelete.has(node.id));
    this.saveCache();
  }
}

export const taxonomyService = new TaxonomyService();
