import { useCallback, useEffect, useState } from "react";
import { categoryApi } from "@/lib/api";
import { WORKSPACE_CHANGED_EVENT } from "@/lib/workspace";
import type { WorkspaceCategoryOption, WorkspaceCategoryType } from "@/lib/workspaceCategories";

const cache = new Map<string, WorkspaceCategoryOption[]>();
const inflight = new Map<string, Promise<WorkspaceCategoryOption[]>>();

function cacheKey(type: WorkspaceCategoryType) {
  return type;
}

export function useWorkspaceCategories(type: WorkspaceCategoryType) {
  const [categories, setCategories] = useState<WorkspaceCategoryOption[]>(
    () => cache.get(cacheKey(type)) ?? [],
  );
  const [loading, setLoading] = useState(!cache.has(cacheKey(type)));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (force = false) => {
      const key = cacheKey(type);
      if (!force && cache.has(key)) {
        setCategories(cache.get(key)!);
        setLoading(false);
        return cache.get(key)!;
      }

      let promise = inflight.get(key);
      if (!promise || force) {
        promise = categoryApi
          .getAll(type)
          .then((res) => (Array.isArray(res.data) ? res.data : []) as WorkspaceCategoryOption[])
          .finally(() => inflight.delete(key));
        inflight.set(key, promise);
      }

      setLoading(true);
      try {
        const data = await promise;
        cache.set(key, data);
        setCategories(data);
        setError(null);
        return data;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load categories");
        return cache.get(key) ?? [];
      } finally {
        setLoading(false);
      }
    },
    [type],
  );

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onWorkspaceChange = () => {
      cache.delete(cacheKey(type));
      void load(true);
    };
    window.addEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChange);
    return () => window.removeEventListener(WORKSPACE_CHANGED_EVENT, onWorkspaceChange);
  }, [load, type]);

  const createCategory = useCallback(
    async (label: string) => {
      const res = await categoryApi.create({ type, label });
      const created = res.data as WorkspaceCategoryOption;
      cache.delete(cacheKey(type));
      await load(true);
      return created;
    },
    [load, type],
  );

  const updateCategory = useCallback(
    async (id: string, label: string) => {
      await categoryApi.update(id, { label });
      cache.delete(cacheKey(type));
      await load(true);
    },
    [load, type],
  );

  const deleteCategory = useCallback(
    async (id: string) => {
      await categoryApi.delete(id);
      cache.delete(cacheKey(type));
      await load(true);
    },
    [load, type],
  );

  return {
    categories,
    loading,
    error,
    refresh: () => load(true),
    createCategory,
    updateCategory,
    deleteCategory,
  };
}

export function invalidateWorkspaceCategories(type?: WorkspaceCategoryType) {
  if (type) {
    cache.delete(cacheKey(type));
    return;
  }
  cache.clear();
}
