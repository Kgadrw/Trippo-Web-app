import { createContext } from "react";

export type PageSearchContextValue = {
  query: string;
  setQuery: (value: string) => void;
  enabled: boolean;
  placeholder: string;
};

/** Kept in a separate module so HMR of the provider/hook does not recreate the context. */
export const PageSearchContext = createContext<PageSearchContextValue | null>(null);

export const PAGE_SEARCH_FALLBACK: PageSearchContextValue = {
  query: "",
  setQuery: () => {},
  enabled: false,
  placeholder: "Search...",
};
