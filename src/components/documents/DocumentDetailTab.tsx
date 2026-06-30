import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { documentApi, workspaceApi } from "@/lib/api";
import {
  SHARE_PERMISSIONS,
  registryStatusClass,
  registryStatusLabel,
  registryTypeLabel,
  sharePermissionLabel,
  truncateHash,
  type CompanyDocumentRecord,
  type DocumentProfilePayload,
} from "@/lib/documentWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { useWorkspace } from "@/hooks/useWorkspace";
import { getStoredWorkspaceId } from "@/lib/workspace";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { formatFinanceTableDate } from "@/components/finance/financeTable";
import { ArrowLeft, Loader2, ShieldCheck, Trash2 } from "lucide-react";

type DetailTab = "overview" | "versions" | "sharing" | "signatures";

type WorkspaceMemberOption = {
  userId: string;
  name?: string;
  email?: string;
};

export function DocumentDetailTab({ documentId }: { documentId: string }) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { mode } = useWorkspace();
  const [profile, setProfile] = useState<DocumentProfilePayload | null>(null);
  const [members, setMembers] = useState<WorkspaceMemberOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<DetailTab>("overview");
  const [saving, setSaving] = useState(false);
  const [shareUserId, setShareUserId] = useState("");
  const [sharePermission, setSharePermission] = useState("view");
  const [verifyResults, setVerifyResults] = useState<Array<{ id?: string; signerName?: string; verificationStatus?: string }>>([]);

  const loadProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await documentApi.getProfile(documentId);
      setProfile((res.data as DocumentProfilePayload) || null);
    } catch {
      toast({ title: t("docProfileLoadFailed"), variant: "destructive" });
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [documentId, toast, t]);

  useEffect(() => {
    void loadProfile();
  }, [loadProfile]);

  useEffect(() => {
    if (mode !== "workspace") return;
    const workspaceId = getStoredWorkspaceId();
    if (!workspaceId) return;
    void workspaceApi.getMembers(workspaceId).then((res) => {
      const list = (res.data as WorkspaceMemberOption[]) || [];
      setMembers(list);
    });
  }, [mode]);

  const doc = profile?.document;

  const handleShare = async () => {
    if (!shareUserId) return;
    setSaving(true);
    try {
      await documentApi.addShare(documentId, { targetUserId: shareUserId, permission: sharePermission });
      setShareUserId("");
      void loadProfile();
      toast({ title: t("docShareAdded") });
    } catch {
      toast({ title: t("docSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const removeShare = async (shareId: string) => {
    try {
      await documentApi.removeShare(documentId, shareId);
      void loadProfile();
    } catch {
      toast({ title: t("docSaveFailed"), variant: "destructive" });
    }
  };

  const restoreVersion = async (versionId: string) => {
    try {
      await documentApi.restoreVersion(documentId, versionId);
      void loadProfile();
      toast({ title: t("docVersionRestored") });
    } catch {
      toast({ title: t("docSaveFailed"), variant: "destructive" });
    }
  };

  const signDocument = async () => {
    setSaving(true);
    try {
      await documentApi.sign(documentId);
      void loadProfile();
      toast({ title: t("docSigned") });
    } catch {
      toast({ title: t("docSaveFailed"), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const verifySignatures = async () => {
    try {
      const res = await documentApi.verifySignatures(documentId);
      const data = res.data as { results?: typeof verifyResults };
      setVerifyResults(data?.results || []);
      toast({ title: t("docVerifyComplete") });
    } catch {
      toast({ title: t("docSaveFailed"), variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        {t("loading")}
      </div>
    );
  }

  if (!doc) {
    return (
      <div className="p-6 text-center">
        <p className="text-sm text-gray-600">{t("docNotFound")}</p>
        <Button asChild variant="link" className="mt-2">
          <Link to="/documents/archive">{t("docBackToArchive")}</Link>
        </Button>
      </div>
    );
  }

  const tabs: { key: DetailTab; label: string }[] = [
    { key: "overview", label: t("docTabOverview") },
    { key: "versions", label: t("docTabVersions") },
    { key: "sharing", label: t("docTabSharing") },
    { key: "signatures", label: t("docTabSignatures") },
  ];

  return (
    <div className="space-y-4 p-4 lg:p-6">
      <Button asChild variant="ghost" size="sm" className="px-2">
        <Link to="/documents/archive">
          <ArrowLeft className="mr-1 h-4 w-4" />
          {t("docBackToArchive")}
        </Link>
      </Button>

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">{doc.title}</h2>
          <p className="text-sm text-gray-500">
            v{doc.currentVersionNumber || 1} · {doc.fileName}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span className={cn("inline-flex rounded-full px-2 py-0.5 text-xs font-medium", registryStatusClass(doc.registryStatus || "draft"))}>
            {registryStatusLabel(doc.registryStatus || "draft", t)}
          </span>
          <Button size="sm" variant="outline" onClick={() => void documentApi.openFile(documentId)}>
            {t("docViewFile")}
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-gray-200 pb-2">
        {tabs.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm font-medium",
              tab === item.key ? "bg-sky-100 text-sky-800" : "text-gray-600 hover:bg-gray-100",
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "overview" && (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="rounded-lg border border-gray-200 bg-white p-4 space-y-2 text-sm">
            <p><span className="text-gray-500">{t("docRegistryType")}:</span> {registryTypeLabel(doc.registryType || "general", t)}</p>
            <p><span className="text-gray-500">{t("docEffectiveDate")}:</span> {doc.effectiveDate ? formatFinanceTableDate(doc.effectiveDate) : "—"}</p>
            <p><span className="text-gray-500">{t("docExpiryDate")}:</span> {doc.expiryDate ? formatFinanceTableDate(doc.expiryDate) : "—"}</p>
            <p><span className="text-gray-500">{t("docContentHash")}:</span> <code className="text-xs">{truncateHash(doc.contentHash, 16)}</code></p>
            {doc.note ? <p className="text-gray-600">{doc.note}</p> : null}
          </section>
          <section className="rounded-lg border border-gray-200 bg-white p-4">
            <h3 className="text-sm font-semibold text-gray-900">{t("docArchiveStats")}</h3>
            <ul className="mt-2 space-y-1 text-sm text-gray-600">
              <li>{profile?.versionCount} {t("docVersionsTotal")}</li>
              <li>{profile?.shareCount} {t("docSharesTotal")}</li>
              <li>{profile?.signatureCount} {t("docSignaturesTotal")}</li>
            </ul>
          </section>
        </div>
      )}

      {tab === "versions" && (
        <section className="rounded-lg border border-gray-200 bg-white">
          <div className="border-b border-gray-100 px-4 py-3">
            <p className="text-sm font-semibold text-gray-900">{t("docCurrentVersion")} v{doc.currentVersionNumber}</p>
          </div>
          <ul className="divide-y divide-gray-100">
            {(doc.versions || []).length === 0 ? (
              <li className="p-4 text-sm text-gray-500">{t("docNoVersions")}</li>
            ) : (
              doc.versions!.map((version) => (
                <li key={version._id || `${version.versionNumber}-${version.fileUrl}`} className="flex flex-wrap items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">v{version.versionNumber} — {version.fileName}</p>
                    <p className="text-xs text-gray-500">
                      {version.uploadedAt ? formatFinanceTableDate(version.uploadedAt) : ""}
                      {version.changeNote ? ` · ${version.changeNote}` : ""}
                    </p>
                  </div>
                  {version._id ? (
                    <Button size="sm" variant="outline" onClick={() => void restoreVersion(version._id!)}>
                      {t("docRestoreVersion")}
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "sharing" && (
        <section className="space-y-4">
          {mode === "workspace" && members.length > 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50/50 p-4 grid gap-3 sm:grid-cols-[1fr_140px_auto]">
              <div>
                <Label>{t("docShareWith")}</Label>
                <Select value={shareUserId} onValueChange={setShareUserId}>
                  <SelectTrigger><SelectValue placeholder={t("docSelectMember")} /></SelectTrigger>
                  <SelectContent>
                    {members.map((member) => (
                      <SelectItem key={member.userId} value={member.userId}>
                        {member.name || member.email || member.userId}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>{t("docSharePermission")}</Label>
                <Select value={sharePermission} onValueChange={setSharePermission}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {SHARE_PERMISSIONS.map((perm) => (
                      <SelectItem key={perm} value={perm}>{sharePermissionLabel(perm, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end">
                <Button size="sm" onClick={() => void handleShare()} disabled={saving}>{t("docAddShare")}</Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">{t("docSharingWorkspaceOnly")}</p>
          )}
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {(doc.shares || []).length === 0 ? (
              <li className="p-4 text-sm text-gray-500">{t("docNoShares")}</li>
            ) : (
              doc.shares!.map((share) => (
                <li key={share._id} className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{share.targetName || share.targetUserId}</p>
                    <p className="text-xs text-gray-500">{sharePermissionLabel(share.permission || "view", t)}</p>
                  </div>
                  {share._id ? (
                    <Button variant="ghost" size="icon" onClick={() => void removeShare(share._id!)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  ) : null}
                </li>
              ))
            )}
          </ul>
        </section>
      )}

      {tab === "signatures" && (
        <section className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button size="sm" onClick={() => void signDocument()} disabled={saving}>
              <ShieldCheck className="mr-1.5 h-4 w-4" />
              {t("docSign")}
            </Button>
            <Button size="sm" variant="outline" onClick={() => void verifySignatures()}>
              {t("docVerifySignatures")}
            </Button>
          </div>
          <ul className="divide-y divide-gray-100 rounded-lg border border-gray-200 bg-white">
            {(doc.signatures || []).length === 0 ? (
              <li className="p-4 text-sm text-gray-500">{t("docNoSignatures")}</li>
            ) : (
              doc.signatures!.map((sig) => (
                <li key={sig._id} className="p-4">
                  <p className="text-sm font-medium text-gray-900">{sig.signerName}</p>
                  <p className="text-xs text-gray-500">
                    {sig.signedAt ? formatFinanceTableDate(sig.signedAt) : ""} · {sig.algorithm || "SHA-256"}
                  </p>
                  <p className="mt-1 text-xs font-mono text-gray-600">{truncateHash(sig.signatureHash, 20)}</p>
                </li>
              ))
            )}
          </ul>
          {verifyResults.length > 0 && (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-3 text-sm">
              {verifyResults.map((row) => (
                <p key={String(row.id)}>{row.signerName}: {row.verificationStatus}</p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
