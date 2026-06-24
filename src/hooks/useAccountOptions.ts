import { useEffect, useState } from "react";
import { accountApi } from "@/lib/api";

export type AccountOption = {
  _id?: string;
  id?: number;
  name: string;
  type?: string;
  isDefault?: boolean;
};

let cachedAccounts: AccountOption[] | null = null;
let pendingAccountsPromise: Promise<AccountOption[]> | null = null;

async function loadAccountOptions(): Promise<AccountOption[]> {
  if (cachedAccounts) {
    return cachedAccounts;
  }

  if (!pendingAccountsPromise) {
    pendingAccountsPromise = accountApi
      .getAll()
      .then((res) => {
        const list = Array.isArray(res.data) ? res.data : [];
        cachedAccounts = list.filter((account) => account?._id || account?.id);
        return cachedAccounts;
      })
      .catch(() => {
        return [];
      })
      .finally(() => {
        pendingAccountsPromise = null;
      });
  }

  return pendingAccountsPromise;
}

export function invalidateAccountOptionsCache() {
  cachedAccounts = null;
}

export function useAccountOptions(enabled = true) {
  const [accounts, setAccounts] = useState<AccountOption[]>(() => cachedAccounts ?? []);

  useEffect(() => {
    if (!enabled) {
      setAccounts([]);
      return;
    }

    let cancelled = false;

    void loadAccountOptions().then((list) => {
      if (!cancelled) {
        setAccounts(list);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [enabled]);

  return accounts;
}
