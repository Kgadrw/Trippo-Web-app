import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useWorkspaceCategories } from "@/hooks/useWorkspaceCategories";
import { useTranslation } from "@/hooks/useTranslation";
import { useToast } from "@/hooks/use-toast";
import { formatCategoryLabel, type WorkspaceCategoryType } from "@/lib/workspaceCategories";
import { cn } from "@/lib/utils";
import { Loader2, Pencil, Plus, Trash2 } from "lucide-react";

const CREATE_VALUE = "__create_category__";

interface CategorySelectProps {
  type: WorkspaceCategoryType;
  value: string;
  onValueChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
  allowManage?: boolean;
  placeholder?: string;
}

export function CategorySelect({
  type,
  value,
  onValueChange,
  disabled = false,
  className,
  triggerClassName,
  allowManage = true,
  placeholder,
}: CategorySelectProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { categories, loading, createCategory, updateCategory, deleteCategory } =
    useWorkspaceCategories(type);

  const [createOpen, setCreateOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const labelFor = (key: string) => formatCategoryLabel(key, categories, t, type);

  const handleSelectChange = (next: string) => {
    if (next === CREATE_VALUE) {
      setNewLabel("");
      setCreateOpen(true);
      return;
    }
    onValueChange(next);
  };

  const handleCreate = async () => {
    const label = newLabel.trim();
    if (!label) return;
    setSaving(true);
    try {
      const created = await createCategory(label);
      onValueChange(created.key);
      setCreateOpen(false);
      setNewLabel("");
      toast({ title: t("categoryCreated") });
    } catch (error) {
      toast({
        title: t("categoryCreateFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const startEdit = (id: string, label: string) => {
    setEditingId(id);
    setEditingLabel(label);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const label = editingLabel.trim();
    if (!label) return;
    setSaving(true);
    try {
      await updateCategory(editingId, label);
      setEditingId(null);
      setEditingLabel("");
      toast({ title: t("saved") });
    } catch (error) {
      toast({
        title: t("saveFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteCategory(id);
      if (categories.some((item) => item.id === id && item.key === value)) {
        onValueChange(categories.find((item) => item.isDefault)?.key ?? "general");
      }
      toast({ title: t("categoryDeleted") });
    } catch (error) {
      toast({
        title: t("categoryDeleteFailed"),
        description: error instanceof Error ? error.message : undefined,
        variant: "destructive",
      });
    } finally {
      setDeletingId(null);
    }
  };

  const customCategories = categories.filter((item) => item.isCustom && item.id);

  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center gap-2">
        <Select value={value || undefined} onValueChange={handleSelectChange} disabled={disabled || loading}>
          <SelectTrigger className={cn("bg-white", triggerClassName)}>
            {loading ? (
              <span className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("loading")}
              </span>
            ) : (
              <SelectValue placeholder={placeholder || t("selectCategory")} />
            )}
          </SelectTrigger>
          <SelectContent>
            {categories.map((item) => (
              <SelectItem key={item.key} value={item.key}>
                {labelFor(item.key)}
              </SelectItem>
            ))}
            {!disabled && (
              <SelectItem value={CREATE_VALUE} className="text-sky-600">
                <span className="flex items-center gap-1.5">
                  <Plus className="h-3.5 w-3.5" />
                  {t("categoryCreateNew")}
                </span>
              </SelectItem>
            )}
          </SelectContent>
        </Select>
        {allowManage && !disabled && customCategories.length > 0 && (
          <Button type="button" variant="outline" size="sm" onClick={() => setManageOpen(true)}>
            {t("categoryManage")}
          </Button>
        )}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t("categoryCreateNew")}</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="new-category-name">{t("categoryName")}</Label>
            <Input
              id="new-category-name"
              value={newLabel}
              onChange={(e) => setNewLabel(e.target.value)}
              placeholder={t("categoryNamePlaceholder")}
              onKeyDown={(e) => {
                if (e.key === "Enter") void handleCreate();
              }}
            />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
              {t("cancel")}
            </Button>
            <Button type="button" onClick={() => void handleCreate()} disabled={saving || !newLabel.trim()}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("add")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={manageOpen} onOpenChange={setManageOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("categoryManage")}</DialogTitle>
          </DialogHeader>
          <div className="max-h-72 space-y-2 overflow-y-auto py-2">
            {customCategories.length === 0 ? (
              <p className="text-sm text-gray-500">{t("categoryNoCustom")}</p>
            ) : (
              customCategories.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2 rounded-md border border-gray-200 px-3 py-2"
                >
                  {editingId === item.id ? (
                    <>
                      <Input
                        value={editingLabel}
                        onChange={(e) => setEditingLabel(e.target.value)}
                        className="h-8"
                      />
                      <Button type="button" size="sm" onClick={() => void handleSaveEdit()} disabled={saving}>
                        {t("save")}
                      </Button>
                    </>
                  ) : (
                    <>
                      <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => startEdit(item.id!, item.label)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500"
                        onClick={() => void handleDelete(item.id!)}
                        disabled={deletingId === item.id}
                      >
                        {deletingId === item.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </Button>
                    </>
                  )}
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
