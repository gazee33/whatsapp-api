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
  const { categories, createItem, updateItem, createCustomization, fetchMenu } = useMenuStore();

  const [name, setName] = useState(item?.name ?? "");
  const [nameAr, setNameAr] = useState(item?.nameAr ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [image, setImage] = useState(item?.image ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(item?.categoryId ?? categoryId ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);

  // Customization state for create mode
  const [customizations, setCustomizations] = useState<{
    name: string;
    nameAr?: string;
    details: { name: string; nameAr?: string; price: number }[];
  }[]>(() => {
    if (item?.customizationHeaders && item.customizationHeaders.length > 0) {
      // For edit mode with existing customizations - populate read-only
      return item.customizationHeaders.map(h => ({
        name: h.name,
        nameAr: h.nameAr || undefined,
        details: h.details?.map(d => ({
          name: d.name,
          nameAr: d.nameAr || undefined,
          price: d.price,
        })) || [],
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

  // Customization helpers for create mode
  const addCustomization = () => {
    setCustomizations([
      ...customizations,
      { name: "", nameAr: "", details: [] }
    ]);
  };

  const removeCustomization = (index: number) => {
    setCustomizations(customizations.filter((_, i) => i !== index));
  };

  const updateCustomizationName = (index: number, field: "name" | "nameAr", value: string) => {
    const updated = [...customizations];
    updated[index][field] = value;
    setCustomizations(updated);
  };

  const addDetail = (headerIndex: number) => {
    const updated = [...customizations];
    updated[headerIndex].details.push({ name: "", nameAr: "", price: 0 });
    setCustomizations(updated);
  };

  const removeDetail = (headerIndex: number, detailIndex: number) => {
    const updated = [...customizations];
    updated[headerIndex].details.splice(detailIndex, 1);
    setCustomizations(updated);
  };

  const updateDetail = (headerIndex: number, detailIndex: number, field: "name" | "nameAr" | "price", value: string | number) => {
    const updated = [...customizations];
    if (field === "price") {
      updated[headerIndex].details[detailIndex].price = Number(value) || 0;
    } else {
      updated[headerIndex].details[detailIndex][field] = value as "name" | "nameAr";
    }
    setCustomizations(updated);
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

        // Create customizations for headers with non-empty name and at least one detail
        const customizationErrors: string[] = [];
        for (const cust of customizations) {
          const validDetails = cust.details.filter(d => d.name.trim());
          if (cust.name.trim() && validDetails.length > 0) {
            try {
              await createCustomization(newItemId, {
                name: cust.name,
                nameAr: cust.nameAr?.trim() || undefined,
                details: validDetails.map(d => ({
                  name: d.name,
                  nameAr: d.nameAr?.trim() || undefined,
                  price: d.price,
                })),
              });
            } catch (custError) {
              console.error("Failed to create customization:", custError);
              customizationErrors.push(`Failed to save "${cust.name}" options`);
            }
          }
        }

        await fetchMenu();
        if (customizationErrors.length > 0) {
          setErrors({ form: customizationErrors.join('. ') });
          setLoading(false);
          return;
        }
        onOpenChange(false);
        onSuccess?.();
      }
    } catch {
      setErrors({ form: t("menu.edit_item") });
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
            <Label htmlFor="item-image">Image URL</Label>
            <Input
              id="item-image"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
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

          {/* Customization Section - Create Mode */}
          {!isEditing && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label>Customization Options</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addCustomization}
                  disabled={loading}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Add
                </Button>
              </div>
              {customizations.map((cust, headerIndex) => (
                <div key={headerIndex} className="border rounded-lg p-3 space-y-2">
                  <div className="flex items-center gap-2">
                    <Input
                      placeholder="e.g. Size, Spice Level"
                      value={cust.name}
                      onChange={(e) => updateCustomizationName(headerIndex, "name", e.target.value)}
                      disabled={loading}
                      className="flex-1"
                    />
                    <Input
                      placeholder="الحجم"
                      value={cust.nameAr || ""}
                      onChange={(e) => updateCustomizationName(headerIndex, "nameAr", e.target.value)}
                      disabled={loading}
                      className="flex-1"
                      dir="rtl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeCustomization(headerIndex)}
                      disabled={loading}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="space-y-2 pl-4">
                    {cust.details.map((detail, detailIndex) => (
                      <div key={detailIndex} className="flex items-center gap-2">
                        <Input
                          placeholder="Option name"
                          value={detail.name}
                          onChange={(e) => updateDetail(headerIndex, detailIndex, "name", e.target.value)}
                          disabled={loading}
                          className="flex-1"
                        />
                        <Input
                          placeholder="العربية"
                          value={detail.nameAr || ""}
                          onChange={(e) => updateDetail(headerIndex, detailIndex, "nameAr", e.target.value)}
                          disabled={loading}
                          className="flex-1"
                          dir="rtl"
                        />
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="Price"
                          value={detail.price}
                          onChange={(e) => updateDetail(headerIndex, detailIndex, "price", e.target.value)}
                          disabled={loading}
                          className="w-24"
                        />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeDetail(headerIndex, detailIndex)}
                          disabled={loading}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => addDetail(headerIndex)}
                      disabled={loading}
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Option
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Customization Section - Edit Mode (Read-only) */}
          {isEditing && item?.customizationHeaders && item.customizationHeaders.length > 0 && (
            <div className="space-y-2">
              <Label>Customization Options</Label>
              <div className="text-sm text-muted-foreground space-y-1">
                {item.customizationHeaders.map((header) => (
                  <div key={header.id}>
                    <span className="font-medium">{header.name}</span>
                    {header.nameAr && <span className="text-muted-foreground"> ({header.nameAr})</span>}
                    {": "}
                    {header.details?.map((d, i) => (
                      <span key={d.id}>
                        {d.name}
                        {d.nameAr && ` (${d.nameAr})`}
                        {d.price > 0 && ` (+${d.price.toFixed(2)} SAR)`}
                        {i < (header.details?.length || 0) - 1 ? ", " : ""}
                      </span>
                    ))}
                  </div>
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
