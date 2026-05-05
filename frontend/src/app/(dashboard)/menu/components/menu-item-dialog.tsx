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
import { useMenuStore } from "@/stores/menu-store";
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
  const { categories, createItem, updateItem } = useMenuStore();

  const [name, setName] = useState(item?.name ?? "");
  const [nameAr, setNameAr] = useState(item?.nameAr ?? "");
  const [description, setDescription] = useState(item?.description ?? "");
  const [price, setPrice] = useState(item ? String(item.price) : "");
  const [selectedCategoryId, setSelectedCategoryId] = useState(item?.categoryId ?? categoryId ?? "");
  const [available, setAvailable] = useState(item?.available ?? true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const validate = (): boolean => {
    const errs: Record<string, string> = {};
    if (!name.trim()) errs.name = "Name is required";
    if (!selectedCategoryId) errs.categoryId = "Category is required";
    const priceVal = Number(price);
    if (price === "" || isNaN(priceVal)) errs.price = "Price is required";
    else if (priceVal < 0) errs.price = "Price must be 0 or greater";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name: name.trim(),
        nameAr: nameAr.trim() || undefined,
        description: description.trim() || undefined,
        price: Number(price),
        categoryId: selectedCategoryId,
        available,
      };
      if (isEditing && item) {
        await updateItem(item.id, payload);
      } else {
        await createItem(payload);
      }
      onOpenChange(false);
      onSuccess?.();
    } catch {
      setErrors({ form: "Failed to save item" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Item" : "Add Item"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the menu item details below."
              : "Add a new item to your menu."}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="item-name">Name</Label>
            <Input
              id="item-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Chicken Shawarma"
              disabled={loading}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="item-nameAr">Arabic Name (optional)</Label>
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
            <Label htmlFor="item-desc">Description</Label>
            <Input
              id="item-desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the item"
              disabled={loading}
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item-price">Price</Label>
              <Input
                id="item-price"
                type="number"
                step="0.01"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                disabled={loading}
              />
              {errors.price && (
                <p className="text-sm text-destructive">{errors.price}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="item-category">Category</Label>
              <Select
                value={selectedCategoryId}
                onValueChange={setSelectedCategoryId}
                disabled={loading}
              >
                <SelectTrigger id="item-category">
                  <SelectValue placeholder="Select category" />
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
            <Label htmlFor="item-available">Available for ordering</Label>
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
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {isEditing ? "Save Changes" : "Add Item"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
