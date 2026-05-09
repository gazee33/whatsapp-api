"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { useMenuStore } from "@/stores/menu-store";
import { useLanguage } from "@/i18n/language-context";
import type { MenuCategory } from "@/lib/types";

interface AddCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  category?: MenuCategory | null;
  onSuccess?: () => void;
}

export function AddCategoryDialog({
  open,
  onOpenChange,
  category,
  onSuccess,
}: AddCategoryDialogProps) {
  const isEditing = !!category;
  const { t } = useLanguage();
  const { createCategory, updateCategory } = useMenuStore();

  const [name, setName] = useState(category?.name ?? "");
  const [nameAr, setNameAr] = useState(category?.nameAr ?? "");
  const [sortOrder, setSortOrder] = useState(String(category?.sortOrder ?? 0));
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("menu.name_required"));
      return;
    }
    setError("");
    setLoading(true);
    try {
      if (isEditing && category) {
        await updateCategory(category.id, {
          name: name.trim(),
          nameAr: nameAr.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
        });
      } else {
        await createCategory({
          name: name.trim(),
          nameAr: nameAr.trim() || undefined,
          sortOrder: Number(sortOrder) || 0,
        });
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setError(t("error.save_failed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("menu.edit_category") : t("menu.add_category")}</DialogTitle>
          <DialogDescription>
            {isEditing ? t("menu.edit_category_desc") : t("menu.create_category_desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">{t("menu.name_label")}</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("menu.name_placeholder")}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="nameAr">{t("menu.name_ar_label")}</Label>
            <Input
              id="nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="الأطباق الرئيسية"
              disabled={loading}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="sortOrder">{t("menu.sort_order_label")}</Label>
            <Input
              id="sortOrder"
              type="number"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              disabled={loading}
            />
          </div>
          {error && <p className="text-sm text-destructive">{error}</p>}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              {t("common.cancel")}
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? t("common.save_changes") : t("menu.create_category")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
