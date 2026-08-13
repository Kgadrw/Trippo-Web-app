import {
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { useLocation } from "react-router-dom";
import { useTranslation } from "@/hooks/useTranslation";
import { resolvePageSearchScope } from "@/lib/pageSearch";
import {
  PAGE_SEARCH_FALLBACK,
  PageSearchContext,
} from "@/hooks/pageSearchContext";

export function PageSearchProvider({ children }: { children: ReactNode }) {
  const [query, setQuery] = useState("");
  const { pathname } = useLocation();
  const { t } = useTranslation();

  const scope = useMemo(() => resolvePageSearchScope(pathname), [pathname]);
  const enabled = scope !== null;
  const placeholder = scope
    ? scope.fullPlaceholder
      ? t(scope.labelKey as Parameters<typeof t>[0])
      : `${t("search")} ${t(scope.labelKey as Parameters<typeof t>[0]).toLowerCase()}...`
    : `${t("search")}...`;

  useEffect(() => {
    setQuery("");
  }, [pathname]);

  const value = useMemo(
    () => ({
      query,
      setQuery,
      enabled,
      placeholder,
    }),
    [query, enabled, placeholder],
  );

  return <PageSearchContext.Provider value={value}>{children}</PageSearchContext.Provider>;
}

export function usePageSearch() {
  return useContext(PageSearchContext) ?? PAGE_SEARCH_FALLBACK;
}
