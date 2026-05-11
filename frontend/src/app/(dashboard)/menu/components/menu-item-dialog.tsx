"use client";

import { useState, useRef, useEffect } from "react";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2, Upload, X } from "lucide-react";
import { useMenuStore } from "@/stores/menu-store";
import { useLanguage } from "@/i18n/language-context";
import { resolveImageUrl } from "@/lib/utils";
import { API_BASE } from "@/lib/config";
import type { MenuItem, MenuCategory } from "@/lib/types";

interface MenuItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: MenuItem | null;
  categoryId?: string;
  onSuccess?: () => void;
}

export function MenuItemDialog({
  open,
  onOpenChange,
  item,
  categoryId,
  onSuccess,
}: MenuItemDialogProps) {
  const isEditing = !!item;
  const { t } = useLanguage();
  const { categories, updateItem, createItem, createOption, updateOption, deleteOption, fetchMenu } = useMenuStore();

  const fileInputRef = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(item?.name ?? "");
  const [nameAr, setNameAr] = useState(item?.nameAr ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const existingImageUrl = item?.image ?? null;
  const [imageRemoved, setImageRemoved] = useState(false);
  const [price, setPrice] = useState(item ? (item.basePrice !== null ? String(item.basePrice) : "") : "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(item?.categoryId ?? categoryId ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);

  // Options state — id is present for existing options, undefined for new ones
  const [options, setOptions] = useState<{ id?: string; name: string; price: number }[]>(() => {
    if (item?.options && item.options.length > 0) {
      return item.options.map(o => ({
        id: o.id,
        name: o.name,
        price: o.price,
      }));
    }
    return [];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    return () => {
      if (imagePreview) URL.revokeObjectURL(imagePreview);
    };
  }, [imagePreview]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setErrors({ image: t("menu.image_too_large") });
      return;
    }

    if (imagePreview) URL.revokeObjectURL(imagePreview);
    setImageFile(file);
    setImageRemoved(false);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImageRemoved(true);
    if (imagePreview) {
      URL.revokeObjectURL(imagePreview);
      setImagePreview(null);
    }
  };

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("menu.name_required");
    if (!selectedCategoryId) errs.categoryId = t("menu.category_required");
    if (price !== "") {
      const priceVal = Number(price);
      if (isNaN(priceVal)) errs.price = t("menu.price_required");
      else if (priceVal < 0) errs.price = t("menu.price_min");
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addOption = () => {
    setOptions([...options, { name: "", price: 0 }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateLocalOption = (index: number, field: "name" | "price", value: string | number) => {
    const updated = [...options];
    if (field === "price") {
      updated[index].price = Number(value) || 0;
    } else {
      updated[index].name = value as string;
    }
    setOptions(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('name', name.trim());
      if (nameAr.trim()) formData.append('nameAr', nameAr.trim());
      if (description.trim()) formData.append('description', description.trim());
      if (price !== "") formData.append('price', String(Number(price)));
      formData.append('categoryId', selectedCategoryId);
      formData.append('available', String(available));
      if (imageFile) {
        formData.append('image', imageFile);
      }
      if (imageRemoved) {
        formData.append('clearImage', 'true');
      }

      if (isEditing && item) {
        await updateItem(item.id, formData);

        // Diff options: delete removed, update modified, create new
        const localIds = new Set(options.filter(o => o.id).map(o => o.id!));
        const optionErrors: string[] = [];

        // Delete options that were in the item but are no longer in local state
        for (const opt of item.options ?? []) {
          if (!localIds.has(opt.id)) {
            try {
              await deleteOption(opt.id);
            } catch {
              optionErrors.push(`Failed to remove "${opt.name}" option`);
            }
          }
        }

        // Create or update each local option
        for (const opt of options) {
          if (!opt.name.trim()) continue;
          try {
            if (opt.id) {
              await updateOption(opt.id, { name: opt.name.trim(), price: opt.price });
            } else {
              await createOption(item.id, { name: opt.name.trim(), price: opt.price });
            }
          } catch {
            optionErrors.push(`Failed to save "${opt.name}" option`);
          }
        }

        if (optionErrors.length > 0) {
          setErrors({ form: optionErrors.join('. ') });
          setLoading(false);
          return;
        }
        onOpenChange(false);
        onSuccess?.();
      } else {
        const newItem = await createItem(formData);
        const newItemId = newItem.id;

        // Create options
        const optionErrors: string[] = [];
        for (const opt of options) {
          if (opt.name.trim()) {
            try {
              await createOption(newItemId, {
                name: opt.name.trim(),
                price: opt.price,
              });
            } catch (optError) {
              console.error("Failed to create option:", optError);
              optionErrors.push(`Failed to save "${opt.name}" option`);
            }
          }
        }

        await fetchMenu();
        if (optionErrors.length > 0) {
          setErrors({ form: optionErrors.join('. ') });
          setLoading(false);
          return;
        }
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      setErrors({ form: t("error.save_failed") });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t("menu.edit_item") : t("menu.add_item")}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? t("menu.edit_item_desc")
              : t("menu.add_item_desc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">{t("menu.name_label")}</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t("menu.item_name_placeholder")}
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-nameAr">{t("menu.name_ar_label")}</Label>
            <Input
              id="item-nameAr"
              value={nameAr}
              onChange={(e) => setNameAr(e.target.value)}
              placeholder="شاورما دجاج"
              disabled={loading}
              dir="rtl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-desc">{t("menu.item_description_label")}</Label>
            <Input
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("menu.item_description_placeholder")}
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label>{t("menu.image_upload_label")}</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/gif,image/webp"
              onChange={handleFileChange}
              className="hidden"
              disabled={loading}
            />
            {(imagePreview || (existingImageUrl && !imageRemoved)) ? (
              <div className="relative w-24 h-24 rounded-lg overflow-hidden border">
                <img
                  src={imagePreview || resolveImageUrl(existingImageUrl!, API_BASE)}
                  alt={name || "Preview"}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={handleRemoveImage}
                  disabled={loading}
                  className="absolute top-0 right-0 p-1 bg-destructive text-destructive-foreground rounded-bl-lg"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ) : null}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="h-4 w-4 me-1" />
              {imagePreview || (existingImageUrl && !imageRemoved)
                ? t("menu.change_image")
                : t("menu.upload_image")}
            </Button>
            {errors.image && (
              <p className="text-sm text-destructive">{errors.image}</p>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-price">{t("menu.price_label")}</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder={t("menu.price_placeholder")}
                disabled={loading}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">{t("menu.category_label")}</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
                disabled={loading}
              >
                <SelectTrigger id="item-category">
                  <SelectValue placeholder={t("menu.select_category")} />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((c: MenuCategory) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.categoryId && (
                <p className="text-sm text-destructive">{errors.categoryId}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="item-available"
              checked={available}
              onChange={(e) => setAvailable(e.target.checked)}
              className="h-4 w-4 rounded border-input text-primary focus:ring-2 focus:ring-ring"
              disabled={loading}
            />
            <Label htmlFor="item-available">{t("menu.available_checkbox")}</Label>
          </div>

          {/* Options Section — Editable in both create and edit mode */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label>{t("menu.options")}</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                disabled={loading}
              >
                <Plus className="h-4 w-4 me-1" />
                {t("menu.add")}
              </Button>
            </div>
            {options.map((opt, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  placeholder={t("menu.option_name_placeholder")}
                  value={opt.name}
                    onChange={(e) => updateLocalOption(index, "name", e.target.value)}
                  disabled={loading}
                  className="flex-1"
                />
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={t("menu.price_placeholder")}
                  value={opt.price}
                    onChange={(e) => updateLocalOption(index, "price", e.target.value)}
                  disabled={loading}
                  className="w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => removeOption(index)}
                  disabled={loading}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>

          {errors.form && (
            <p className="text-sm text-destructive">{errors.form}</p>
          )}
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
              {isEditing ? t("common.save_changes") : t("menu.add_item")}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
