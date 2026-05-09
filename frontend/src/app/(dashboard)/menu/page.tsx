"use client";

/* eslint-disable @next/next/no-img-element */

import { useEffect, useState, useCallback, useRef } from "react";
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Tag,
  DollarSign,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useMenuStore } from "@/stores/menu-store";
import { useLanguage } from "@/i18n/language-context";
import { formatCurrency } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { resolveImageUrl } from "@/lib/utils";
import { API_BASE } from "@/lib/config";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { SearchInput } from "@/components/shared/search-input";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { AddCategoryDialog } from "./components/add-category-dialog";
import { MenuItemDialog } from "./components/menu-item-dialog";
import type { MenuCategory, MenuItem } from "@/lib/types";

export default function MenuPage() {
  const { t } = useLanguage();
  const {
    categories,
    searchResults,
    isLoading,
    fetchMenu,
    searchMenu,
    deleteItem,
    toggleItemAvailable,
  } = useMenuStore();

  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set()
  );
  const [searchQuery, setSearchQuery] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Dialog states
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<MenuCategory | null>(
    null
  );
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [addItemCategoryId, setAddItemCategoryId] = useState<string>("");

  useEffect(() => {
    fetchMenu();
  }, [fetchMenu]);

  const handleSearchChange = useCallback(
    (value: string) => {
      setSearchQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        searchMenu(value);
      }, 300);
    },
    [searchMenu]
  );

  const toggleExpand = (categoryId: string) => {
    setExpandedCategories((prev) => {
      const next = new Set(prev);
      if (next.has(categoryId)) {
        next.delete(categoryId);
      } else {
        next.add(categoryId);
      }
      return next;
    });
  };

  const handleEditCategory = (category: MenuCategory) => {
    setEditingCategory(category);
    setCategoryDialogOpen(true);
  };

  const handleAddCategory = () => {
    setEditingCategory(null);
    setCategoryDialogOpen(true);
  };

  const handleAddItem = (categoryId: string) => {
    setEditingItem(null);
    setAddItemCategoryId(categoryId);
    setItemDialogOpen(true);
  };

  const handleEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setAddItemCategoryId(item.categoryId);
    setItemDialogOpen(true);
  };

  const handleDeleteItem = async (item: MenuItem) => {
    if (!confirm(t("menu.delete_item_confirm").replace("{name}", item.name))) return;
    await deleteItem(item.id);
  };

  const handleToggleAvailable = async (itemId: string) => {
    await toggleItemAvailable(itemId);
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-16" />
          <SkeletonBlock className="mt-1 h-3 w-64" />
        </div>
        <div className="flex gap-1">
          <SkeletonBlock className="h-9 w-28 rounded-md" />
          <SkeletonBlock className="h-9 w-24 rounded-md" />
        </div>
        <div className="flex items-center justify-between">
          <SkeletonBlock className="h-3 w-24" />
          <SkeletonBlock className="h-9 w-32" />
        </div>
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-xl border bg-card shadow-sm">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-4 w-4" />
                  <div>
                    <SkeletonBlock className="h-4 w-32" />
                    <SkeletonBlock className="mt-1 h-3 w-20" />
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <SkeletonBlock className="h-5 w-16 rounded-full" />
                  <SkeletonBlock className="h-8 w-8 rounded-md" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("menu.title")}</h1>
          <p className="text-sm text-muted-foreground">
            {t("menu.subtitle")}
          </p>
        </div>
      </div>

      <Tabs defaultValue="categories" className="w-full">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="categories">
              <Tag className="me-2 h-4 w-4" />
              {t("menu.tab_categories")}
            </TabsTrigger>
            <TabsTrigger value="search">
              <Search className="me-2 h-4 w-4" />
              {t("menu.tab_search")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="categories" className="mt-4">
          {categories.length === 0 ? (
            <EmptyState
              icon={Tag}
              title={t("menu.no_categories")}
              description={t("menu.no_categories_desc")}
              action={
                <Button onClick={handleAddCategory}>
                  <Plus className="me-2 h-4 w-4" />
                  {t("menu.add_category")}
                </Button>
              }
            />
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {categories.length}{" "}
                  {categories.length === 1 ? t("menu.category_count") : t("menu.categories_count")}
                </p>
                <Button onClick={handleAddCategory} size="sm">
                  <Plus className="me-2 h-4 w-4" />
                  {t("menu.add_category")}
                </Button>
              </div>

              {categories
                .slice()
                .sort((a, b) => a.sortOrder - b.sortOrder)
                .map((category) => {
                  const isExpanded = expandedCategories.has(category.id);
                  const itemCount = category.items?.length ?? 0;
                  return (
                    <Card key={category.id}>
                      <div
                        className="flex cursor-pointer items-center justify-between p-4 select-none"
                        onClick={() => toggleExpand(category.id)}
                      >
                        <div className="flex items-center gap-3">
                          {isExpanded ? (
                            <ChevronUp className="h-4 w-4 text-muted-foreground shrink-0" />
                          ) : (
                            <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
                          )}
                          <div>
                            <h3 className="font-medium">{category.name}</h3>
                            {category.nameAr && (
                              <p
                                className="text-xs text-muted-foreground"
                                dir="rtl"
                              >
                                {category.nameAr}
                              </p>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary">
                            {itemCount} {itemCount === 1 ? t("menu.item_count") : t("menu.items_count")}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEditCategory(category);
                            }}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>

                      {isExpanded && (
                        <CardContent className="border-t p-0">
                          {(!category.items || category.items.length === 0) ? (
                            <div className="p-6 text-center">
                              <p className="text-sm text-muted-foreground mb-3">
                                {t("menu.no_category_items")}
                              </p>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleAddItem(category.id)}
                              >
                                <Plus className="me-2 h-4 w-4" />
                                {t("menu.add_first_item")}
                              </Button>
                            </div>
                          ) : (
                            <>
                              <div className="divide-y">
                                {category.items!.map((item) => (
                                  <div
                                    key={item.id}
                                    className="flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
                                  >
                                    <button
                                      type="button"
                                      className="flex-1 text-start min-w-0 me-3"
                                      onClick={() => handleEditItem(item)}
                                    >
                                      <div className="flex items-center gap-2">
                                        {item.image && (
                                          <img
                                            src={resolveImageUrl(item.image, API_BASE)}
                                            alt={item.name}
                                            className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                                          />
                                        )}
                                        <div className="min-w-0">
                                          <span
                                            className={cn(
                                              "font-medium text-sm",
                                              !item.available &&
                                                "line-through text-muted-foreground"
                                            )}
                                          >
                                            {item.name}
                                          </span>
                                          {item.nameAr && (
                                            <span
                                              className="text-xs text-muted-foreground"
                                              dir="rtl"
                                            >
                                              {item.nameAr}
                                            </span>
                                          )}
                                          {!item.available && (
                                            <Badge
                                              variant="destructive"
                                              className="text-[10px] px-1.5 py-0"
                                            >
                                              {t("menu.off_badge")}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-1 mt-0.5">
                                        <DollarSign className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-sm text-muted-foreground">
                                          {formatCurrency(item.price)}
                                        </span>
                                      </div>
                                      {item.options && item.options.length > 0 && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                          {item.options
                                            .map((opt) =>
                                              opt.price > 0
                                                ? `${opt.name} (+${formatCurrency(opt.price)})`
                                                : opt.name
                                            )
                                            .join(", ")}
                                        </div>
                                      )}
                                    </button>

                                    <div className="flex items-center gap-1 shrink-0">
                                      <button
                                        type="button"
                                        onClick={() =>
                                          handleToggleAvailable(item.id)
                                        }
                                        className={cn(
                                          "relative inline-flex h-6 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
                                          item.available
                                            ? "bg-primary"
                                            : "bg-muted-foreground/30"
                                        )}
                                        role="switch"
                                        aria-checked={item.available}
                                      >
                                        <span
                                          className={cn(
                                            "pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow ring-0 transition-transform duration-200",
                                            item.available
                                              ? "translate-x-4"
                                              : "translate-x-0"
                                          )}
                                        />
                                      </button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                        onClick={() => handleDeleteItem(item)}
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                              <div className="flex justify-center p-3 border-t">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleAddItem(category.id)}
                                >
                                  <Plus className="me-2 h-4 w-4" />
                                  {t("menu.add_item")}
                                </Button>
                              </div>
                            </>
                          )}
                        </CardContent>
                      )}
                    </Card>
                  );
                })}
            </div>
          )}
        </TabsContent>

        <TabsContent value="search" className="mt-4">
          <div className="space-y-4">
            <SearchInput
              placeholder={t("menu.search_placeholder")}
              value={searchQuery}
              onChange={handleSearchChange}
            />

            {searchQuery.trim() && searchResults.length === 0 ? (
              <EmptyState
                icon={Search}
                title={t("menu.no_results")}
                description={t("menu.no_results_desc").replace("{query}", searchQuery)}
              />
            ) : searchResults.length > 0 ? (
              <div className="space-y-1">
                {searchResults.map((item) => (
                  <Card key={item.id}>
                    <div
                      className="flex cursor-pointer items-center justify-between p-3 hover:bg-muted/50"
                      onClick={() => handleEditItem(item)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          {item.image && (
                            <img
                              src={resolveImageUrl(item.image, API_BASE)}
                              alt={item.name}
                              className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                            />
                          )}
                          <div className="min-w-0">
                            <span
                              className={cn(
                                "font-medium text-sm",
                                !item.available &&
                                  "line-through text-muted-foreground"
                              )}
                            >
                              {item.name}
                            </span>
                            {item.nameAr && (
                              <span
                                className="text-xs text-muted-foreground"
                                dir="rtl"
                              >
                                {item.nameAr}
                              </span>
                            )}
                            {!item.available && (
                              <Badge
                                variant="destructive"
                                className="text-[10px] px-1.5 py-0"
                              >
                                {t("menu.off_badge")}
                              </Badge>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm text-muted-foreground">
                              {formatCurrency(item.price)}
                            </span>
                          </div>
                          {item.category && (
                            <Badge variant="outline" className="text-[10px]">
                              {item.category.name}
                            </Badge>
                          )}
                        </div>
                        {item.options && item.options.length > 0 && (
                          <div className="mt-1 text-xs text-muted-foreground">
                            {item.options
                              .map((opt) =>
                                opt.price > 0
                                  ? `${opt.name} (+${formatCurrency(opt.price)})`
                                  : opt.name
                              )
                              .join(", ")}
                          </div>
                        )}
                      </div>
                      <Edit className="h-4 w-4 text-muted-foreground shrink-0 ms-3" />
                    </div>
                  </Card>
                ))}
              </div>
            ) : !searchQuery.trim() ? (
              <EmptyState
                icon={Search}
                title={t("menu.search_menu")}
                description={t("menu.search_menu_desc")}
              />
            ) : null}
          </div>
        </TabsContent>
      </Tabs>

      <AddCategoryDialog
        key={editingCategory?.id ?? "new-category"}
        open={categoryDialogOpen}
        onOpenChange={setCategoryDialogOpen}
        category={editingCategory}
      />

      <MenuItemDialog
        key={editingItem?.id ?? (addItemCategoryId || "new-item")}
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        categoryId={addItemCategoryId}
      />
    </div>
  );
}
