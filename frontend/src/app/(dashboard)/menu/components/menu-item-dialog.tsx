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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Trash2 } from "lucide-react";
import { useMenuStore } from "@/stores/menu-store";
import { tenantClient } from "@/lib/api-client";
import { useLanguage } from "@/i18n/language-context";
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
  const { categories, updateItem, createOption, fetchMenu } = useMenuStore();

  const [name, setName] = useState(item?.name ?? "");
  const [nameAr, setNameAr] = useState(item?.nameAr ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [image, setImage] = useState(item?.image ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(item?.categoryId ?? categoryId ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);

  // Options state for create mode
  const [options, setOptions] = useState<{ name: string; price: number }[]>(() => {
    if (item?.options && item.options.length > 0) {
      return item.options.map(o => ({
        name: o.name,
        price: o.price,
      }));
    }
    return [];
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = t("menu.name_required");
    if (!selectedCategoryId) errs.categoryId = t("menu.category_required");
    const priceVal = Number(price);
    if (price === "" || isNaN(priceVal)) errs.price = t("menu.price_required");
    else if (priceVal < 0) errs.price = t("menu.price_min");
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const addOption = () => {
    setOptions([...options, { name: "", price: 0 }]);
  };

  const removeOption = (index: number) => {
    setOptions(options.filter((_, i) => i !== index));
  };

  const updateOption = (index: number, field: "name" | "price", value: string | number) => {
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
      const itemData = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        description: description.trim() || undefined,
        image: image.trim() || undefined,
        price: Number(price),
        categoryId: selectedCategoryId,
        available,
      };

      if (isEditing && item) {
        await updateItem(item.id, itemData);
        onOpenChange(false);
        onSuccess?.();
      } else {
        // Create mode: use tenantClient directly to get the new item ID
        const response = await tenantClient.post("/menu/items", itemData);
        const newItemId = response.data.id;

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
            <Label htmlFor="item-image">{t("menu.image_url_label")}</Label>
            <Input
              id="item-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder={t("menu.image_url_placeholder")}
              disabled={loading}
            />
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

          {/* Options Section - Create Mode */}
          {!isEditing && (
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
                    onChange={(e) => updateOption(index, "name", e.target.value)}
                    disabled={loading}
                    className="flex-1"
                  />
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder={t("menu.price_placeholder")}
                    value={opt.price}
                    onChange={(e) => updateOption(index, "price", e.target.value)}
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
          )}

          {/* Options Section - Edit Mode (Read-only) */}
          {isEditing && item?.options && item.options.length > 0 && (
            <div className="space-y-2">
              <Label>{t("menu.options")}</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                {item.options.map((opt, i) => (
                  <span key={opt.id}>
                    {opt.name}
                    {opt.price > 0 && ` (+${opt.price.toFixed(2)} SAR)`}
                    {i < item.options!.length - 1 ? ", " : ""}
                  </span>
                ))}
              </div>
            </div>
          )}

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
