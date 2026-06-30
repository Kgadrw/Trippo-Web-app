import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useApi } from "@/hooks/useApi";
import { documentApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CategorySelect } from "@/components/categories/CategorySelect";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { REGISTRY_STATUSES, REGISTRY_TYPES, registryStatusLabel, registryTypeLabel } from "@/lib/documentWorkflow";
import { useTranslation } from "@/hooks/useTranslation";
import { Plus, Loader2, MoreVertical, Pencil, Trash2, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { uploadCompanyDocument, openCompanyDocumentInNewTab } from "@/lib/financeUpload";
import { filterByPageSearch } from "@/lib/pageSearch";
import { usePageSearch } from "@/hooks/usePageSearch";
import {
  FINANCE_TH_CLASS,
  FINANCE_TD_CLASS,
  formatFinanceTableDate,
  FinanceDocumentRefCell,
  FinanceTableCheckbox,
  FinanceTableLoading,
  FinanceTableShell,
} from "@/components/finance/financeTable";
import { DeleteConfirmDialog } from "@/components/ui/delete-confirm-dialog";
import { useDeleteConfirm } from "@/hooks/useDeleteConfirm";

export interface CompanyDocumentEntry {
  id?: number;
  _id?: string;
  title: string;
  category?: string;
  registryType?: string;
  registryStatus?: string;
  effectiveDate?: string;
  expiryDate?: string;
  date: string;
  note?: string;
  fileUrl: string;
  fileName: string;
  fileSize?: number;
  currentVersionNumber?: number;
}

function documentId(entry: CompanyDocumentEntry) {
  return String(entry._id ?? entry.id ?? "");
}

function buildDocumentDate(dateValue: string) {
  const now = new Date();
  const savedDate = new Date((dateValue || new Date().toISOString().split("T")[0]) + "T00:00:00");
  savedDate.setHours(now.getHours(), now.getMinutes(), now.getSeconds(), now.getMilliseconds());
  return savedDate.toISOString();
}

function formatFileSize(bytes?: number) {
  if (!bytes || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function DocumentsTab() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { items: documents, isLoading, add, update, remove, refresh } = useApi<CompanyDocumentEntry>({
    endpoint: "documents",
    defaultValue: [],
  });

  const lastRefreshRef = useRef(0);
  useEffect(() => {
    const onRefresh = () => void refresh(true);
    const onVisibility = () => {
      if (document.visibilityState !== "visible") return;
      const now = Date.now();
      if (now - lastRefreshRef.current < 30_000) return;
      lastRefreshRef.current = now;
      void refresh(true);
    };
    window.addEventListener("documents-should-refresh", onRefresh);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("documents-should-refresh", onRefresh);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refresh]);

  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("general");
  const [date, setDate] = useState(() => new Date().toISOString().split("T")[0]);
  const [note, setNote] = useState("");
  const [registryType, setRegistryType] = useState("general");
  const [registryStatus, setRegistryStatus] = useState("draft");
  const [effectiveDate, setEffectiveDate] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [existingFileUrl, setExistingFileUrl] = useState<string | undefined>();
  const [existingFileName, setExistingFileName] = useState<string | undefined>();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CompanyDocumentEntry | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isRefreshing, setIsRefreshing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const {
    target: deleteTarget,
    open: deleteOpen,
    isDeleting: isDeleteDeleting,
    setIsDeleting: setIsDeleteDeleting,
    requestDelete,
    takeTarget,
    handleOpenChange: handleDeleteOpenChange,
  } = useDeleteConfirm<CompanyDocumentEntry>();

  const sortedDocuments = useMemo(() => {
    return [...documents].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
    );
  }, [documents]);

  const { query: pageSearchQuery } = usePageSearch();
  const visibleDocuments = useMemo(
    () =>
      filterByPageSearch(sortedDocuments, pageSearchQuery, (entry) => [
        entry.title,
        entry.category,
        entry.registryType,
        entry.note,
        entry.fileName,
      ]),
    [sortedDocuments, pageSearchQuery],
  );

  const allSelected =
    visibleDocuments.length > 0 && visibleDocuments.every((e) => selectedIds.has(documentId(e)));

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedIds(new Set());
      return;
    }
    setSelectedIds(new Set(visibleDocuments.map((e) => documentId(e))));
  };

  const toggleSelectRow = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetForm = () => {
    setTitle("");
    setCategory("general");
    setDate(new Date().toISOString().split("T")[0]);
    setNote("");
    setRegistryType("general");
    setRegistryStatus("draft");
    setEffectiveDate("");
    setExpiryDate("");
    setFile(null);
    setExistingFileUrl(undefined);
    setExistingFileName(undefined);
    setEditing(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openCreate = () => {
    resetForm();
    setOpen(true);
  };

  const openEdit = (entry: CompanyDocumentEntry) => {
    setEditing(entry);
    setTitle(entry.title);
    setCategory(entry.category || "general");
    setDate(entry.date ? entry.date.split("T")[0] : new Date().toISOString().split("T")[0]);
    setNote(entry.note || "");
    setRegistryType(entry.registryType || "general");
    setRegistryStatus(entry.registryStatus || "draft");
    setEffectiveDate(entry.effectiveDate ? entry.effectiveDate.split("T")[0] : "");
    setExpiryDate(entry.expiryDate ? entry.expiryDate.split("T")[0] : "");
    setFile(null);
    setExistingFileUrl(entry.fileUrl);
    setExistingFileName(entry.fileName);
    if (fileInputRef.current) fileInputRef.current.value = "";
    setOpen(true);
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await refresh(true);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleSave = async () => {
    if (isSaving) return;
    if (!title.trim()) {
      toast({ title: "Missing title", description: "Please enter a document title.", variant: "destructive" });
      return;
    }
    if (!file && !existingFileUrl) {
      toast({ title: "Missing file", description: "Please upload a document file.", variant: "destructive" });
      return;
    }

    try {
      setIsSaving(true);
      let fileUrl = existingFileUrl;
      let fileName = existingFileName;
      let fileSize: number | undefined;

      if (file) {
        const uploaded = await uploadCompanyDocument(file);
        fileUrl = uploaded.fileUrl;
        fileName = uploaded.fileName;
        fileSize = uploaded.fileSize;
      } else if (editing?.fileSize) {
        fileSize = editing.fileSize;
      }

      const payload = {
        title: title.trim(),
        category: category.trim() || "general",
        registryType,
        registryStatus,
        effectiveDate: effectiveDate || undefined,
        expiryDate: expiryDate || undefined,
        date: buildDocumentDate(date),
        note: note.trim() || undefined,
        fileUrl: fileUrl!,
        fileName: fileName!,
        fileSize,
        changeNote: file ? "File updated" : undefined,
      };

      if (editing) {
        await update({ ...editing, ...payload } as CompanyDocumentEntry);
        toast({ title: "Document updated", description: "Changes saved successfully." });
      } else {
        await add(payload as CompanyDocumentEntry);
        toast({ title: "Document uploaded", description: "Your document has been saved." });
      }

      window.dispatchEvent(new CustomEvent("documents-should-refresh"));
      resetForm();
      setOpen(false);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not save document.";
      toast({ title: "Save failed", description: message, variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    const item = takeTarget();
    if (!item) return;
    const id = documentId(item);
    setIsDeleteDeleting(true);
    setDeletingId(id);
    try {
      await remove(item as CompanyDocumentEntry);
      toast({ title: t("deleted"), description: item.title });
      window.dispatchEvent(new CustomEvent("documents-should-refresh"));
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Could not delete document.";
      toast({ title: t("error"), description: message, variant: "destructive" });
    } finally {
      setDeletingId(null);
      setIsDeleteDeleting(false);
    }
  };

  return (
    <>
      <FinanceTableShell
        title={t("docArchiveTitle")}
        onAdd={openCreate}
        addLabel={t("docUpload")}
        onRefresh={() => void handleRefresh()}
        isRefreshing={isRefreshing}
      >
        {isLoading ? (
          <FinanceTableLoading />
        ) : visibleDocuments.length === 0 ? (
          <div className="px-4 py-16 text-center text-sm text-gray-500">
            {t("docArchiveEmpty")}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse">
              <thead>
                <tr>
                  <th className={cn(FINANCE_TH_CLASS, "w-10 pl-4")}>
                    <FinanceTableCheckbox
                      checked={allSelected}
                      onCheckedChange={toggleSelectAll}
                      ariaLabel="Select all"
                    />
                  </th>
                  <th className={FINANCE_TH_CLASS}>Date</th>
                  <th className={FINANCE_TH_CLASS}>Category</th>
                  <th className={FINANCE_TH_CLASS}>Document #</th>
                  <th className={FINANCE_TH_CLASS}>Title</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden md:table-cell")}>File</th>
                  <th className={cn(FINANCE_TH_CLASS, "hidden sm:table-cell")}>Size</th>
                  <th className={cn(FINANCE_TH_CLASS, "w-10 pr-4")} />
                </tr>
              </thead>
              <tbody className="bg-white">
                {visibleDocuments.map((entry, index) => {
                  const id = documentId(entry);
                  const isSelected = selectedIds.has(id);
                  return (
                    <tr
                      key={id}
                      className={cn(
                        "transition-colors hover:bg-gray-50/80",
                        isSelected && "bg-blue-50/40",
                      )}
                    >
                      <td className={cn(FINANCE_TD_CLASS, "pl-4")}>
                        <FinanceTableCheckbox
                          checked={isSelected}
                          onCheckedChange={() => toggleSelectRow(id)}
                          ariaLabel={`Select ${entry.title}`}
                        />
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-700 tabular-nums")}>
                        {formatFinanceTableDate(entry.date)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "text-gray-600 capitalize")}>
                        {entry.category || "general"}
                      </td>
                      <td className={FINANCE_TD_CLASS}>
                        <FinanceDocumentRefCell
                          entry={{
                            receiptFileName: entry.fileName,
                            receiptUrl: entry.fileUrl,
                          }}
                          fallbackPrefix="doc"
                          id={id}
                          index={index}
                          readOnly={!entry.fileUrl}
                        />
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "font-semibold text-gray-900 max-w-[200px] truncate")}>
                        <Link to={`/documents/${id}`} className="text-sky-700 hover:underline">
                          {entry.title}
                        </Link>
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden md:table-cell text-gray-600 max-w-[180px] truncate")}>
                        {entry.fileName}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "hidden sm:table-cell text-gray-600 tabular-nums")}>
                        {formatFileSize(entry.fileSize)}
                      </td>
                      <td className={cn(FINANCE_TD_CLASS, "pr-4 text-right")}>
                        <div className="flex items-center justify-end gap-1">
                          {entry.fileUrl ? (
                            <button
                              type="button"
                              className="p-1 text-gray-400 hover:text-gray-600"
                              onClick={() =>
                                void documentApi.openFile(id).catch(() =>
                                  void openCompanyDocumentInNewTab(entry.fileUrl).catch(() =>
                                    toast({
                                      title: t("docOpenFailed"),
                                      variant: "destructive",
                                    }),
                                  ),
                                )
                              }
                              aria-label="View file"
                            >
                              <Paperclip size={15} />
                            </button>
                          ) : null}
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-gray-400 hover:text-gray-700"
                                disabled={deletingId === id}
                              >
                                {deletingId === id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <MoreVertical className="h-3.5 w-3.5" />
                                )}
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => openEdit(entry)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => requestDelete(entry)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </FinanceTableShell>

      <Dialog open={open} onOpenChange={(next) => { setOpen(next); if (!next) resetForm(); }}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit document" : "Upload document"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Title</Label>
              <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Business license" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Category</Label>
                <CategorySelect type="document" value={category} onValueChange={setCategory} />
              </div>
              <div className="space-y-1">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("docRegistryType")}</Label>
                <Select value={registryType} onValueChange={setRegistryType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTRY_TYPES.map((value) => (
                      <SelectItem key={value} value={value}>{registryTypeLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>{t("docRegistryStatus")}</Label>
                <Select value={registryStatus} onValueChange={setRegistryStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {REGISTRY_STATUSES.map((value) => (
                      <SelectItem key={value} value={value}>{registryStatusLabel(value, t)}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>{t("docEffectiveDate")}</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
              </div>
              <div className="space-y-1">
                <Label>{t("docExpiryDate")}</Label>
                <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>File</Label>
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,image/*"
                className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
              <div className="flex flex-wrap items-center gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
                  {file || existingFileName ? "Change file" : "Choose file"}
                </Button>
                {(file || existingFileName) && (
                  <span className="text-xs text-gray-600 truncate max-w-[14rem]">
                    {file?.name || existingFileName}
                  </span>
                )}
              </div>
            </div>
            <div className="space-y-1">
              <Label>Note (optional)</Label>
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={2}
                placeholder="Add any details about this document"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="cancel" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-sky-400 text-white hover:bg-sky-500 border border-sky-400"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : editing ? "Save changes" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={handleDeleteOpenChange}
        title={t("deleteConfirmTitle")}
        description={t("deleteConfirmDesc").replace("{name}", deleteTarget?.title ?? "")}
        confirmLabel={t("delete")}
        cancelLabel={t("cancel")}
        deletingLabel={t("deleting")}
        onConfirm={handleDeleteConfirm}
        isDeleting={isDeleteDeleting}
      />
    </>
  );
}
