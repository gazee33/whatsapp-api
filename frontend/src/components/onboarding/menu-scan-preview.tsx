"use client";

import { useState } from "react";
import {
  ChevronDown,
  ChevronUp,
  Plus,
  Trash2,
  Edit3,
  Save,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import type { ExtractedMenu, ExtractedMenuItem, ExtractedItemOption } from "@/lib/types";
import { useLanguage } from "@/i18n/language-context";

interface MenuScanPreviewProps {
  data: ExtractedMenu;
  onSave: (menu: ExtractedMenu) => void;
  onCancel: () => void;
  onBack: () => void;
  saving?: boolean;
  error?: string | null;
}

export function MenuScanPreview({
  data,
  onSave,
  onCancel,
  onBack,
  saving = false,
  error = null,
}: MenuScanPreviewProps) {
  const { t } = useLanguage();
  const [menu, setMenu] = useState<ExtractedMenu>(data);
  const [expandedCategories, setExpandedCategories] = useState<
    Record<number, boolean>
  >({});

  const totalItems = menu.categories.reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  const toggleCategory = (index: number) => {
    setExpandedCategories((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const updateCategoryName = (index: number, name: string) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      categories[index] = { ...categories[index], name };
      return { ...prev, categories };
    });
  };

  const updateItem = (
    catIndex: number,
    itemIndex: number,
    updates: Partial<ExtractedMenuItem>
  ) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      const items = [...categories[catIndex].items];
      items[itemIndex] = { ...items[itemIndex], ...updates };
      categories[catIndex] = { ...categories[catIndex], items };
      return { ...prev, categories };
    });
  };

  const removeItem = (catIndex: number, itemIndex: number) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      const items = categories[catIndex].items.filter(
        (_, i) => i !== itemIndex
      );
      categories[catIndex] = { ...categories[catIndex], items };
      return { ...prev, categories };
    });
  };

  const addOption = (catIndex: number, itemIndex: number) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      const items = [...categories[catIndex].items];
      const options = [...items[itemIndex].options, { name: "", price: 0 }];
      items[itemIndex] = { ...items[itemIndex], options };
      categories[catIndex] = { ...categories[catIndex], items };
      return { ...prev, categories };
    });
  };

  const updateOption = (
    catIndex: number,
    itemIndex: number,
    optIndex: number,
    updates: Partial<ExtractedItemOption>
  ) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      const items = [...categories[catIndex].items];
      const options = [...items[itemIndex].options];
      options[optIndex] = { ...options[optIndex], ...updates };
      items[itemIndex] = { ...items[itemIndex], options };
      categories[catIndex] = { ...categories[catIndex], items };
      return { ...prev, categories };
    });
  };

  const removeOption = (
    catIndex: number,
    itemIndex: number,
    optIndex: number
  ) => {
    setMenu((prev) => {
      const categories = [...prev.categories];
      const items = [...categories[catIndex].items];
      const options = items[itemIndex].options.filter(
        (_, i) => i !== optIndex
      );
      items[itemIndex] = { ...items[itemIndex], options };
      categories[catIndex] = { ...categories[catIndex], items };
      return { ...prev, categories };
    });
  };

  const addCategory = () => {
    setMenu((prev) => ({
      ...prev,
      categories: [...prev.categories, { name: t("onboarding_wizard.new_category"), items: [] }],
    }));
  };

  const removeCategory = (index: number) => {
    setMenu((prev) => ({
      ...prev,
      categories: prev.categories.filter((_, i) => i !== index),
    }));
  };

  return (
    <div className="space-y-6">
      <div className="text-center space-y-3">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-indigo-100 ring-1 ring-indigo-200">
          <Edit3 className="h-8 w-8 text-indigo-500" />
        </div>
        <h2 className="text-2xl font-bold text-[#1E1B4B] font-[family-name:var(--font-playfair)]">
          {t("onboarding_wizard.review_menu")}
        </h2>
        <p className="text-slate-500 max-w-md mx-auto">
          {t("onboarding_wizard.review_menu_desc")}
        </p>
      </div>

      <div className="flex items-center justify-center gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg py-2 px-4">
        <span className="font-semibold text-indigo-600">
          {menu.categories.length}
        </span>{" "}
        {t("onboarding_wizard.categories_label")},{" "}
        <span className="font-semibold text-indigo-600">{totalItems}</span>{" "}
        {t("onboarding_wizard.items_found")}
      </div>

      {menu.categories.map((category, catIndex) => {
        const isExpanded = expandedCategories[catIndex] ?? false;
        return (
          <div
            key={catIndex}
            className="border border-slate-200 rounded-xl overflow-hidden"
          >
            <button
              onClick={() => toggleCategory(catIndex)}
              className="w-full flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {isExpanded ? (
                  <ChevronUp className="h-4 w-4 text-slate-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-slate-400" />
                )}
                <input
                  value={category.name}
                  onChange={(e) =>
                    updateCategoryName(catIndex, e.target.value)
                  }
                  onClick={(e) => e.stopPropagation()}
                  className="text-lg font-semibold text-[#1E1B4B] bg-transparent border-none outline-none focus:ring-0 p-0 font-[family-name:var(--font-playfair)]"
                />
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-medium">
                  {category.items.length} items
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeCategory(catIndex);
                  }}
                  className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </button>

            {isExpanded && (
              <div className="border-t border-slate-100 p-4 space-y-3">
                {category.items.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">
                    {t("onboarding_wizard.no_items_category")}
                  </p>
                )}
                {category.items.map((item, itemIndex) => (
                  <div
                    key={itemIndex}
                    className="bg-slate-50 rounded-lg p-4 space-y-3"
                  >
                    <div className="flex items-start gap-3">
                      <div className="flex-1 space-y-2">
                        <input
                          value={item.name}
                          onChange={(e) =>
                            updateItem(catIndex, itemIndex, {
                              name: e.target.value,
                            })
                          }
                          className="w-full text-sm font-medium text-slate-800 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                          placeholder={t("onboarding_wizard.item_name_placeholder")}
                        />
                        <input
                          value={item.description ?? ""}
                          onChange={(e) =>
                            updateItem(catIndex, itemIndex, {
                              description: e.target.value || null,
                            })
                          }
                          className="w-full text-xs text-slate-500 bg-white border border-slate-200 rounded-md px-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                          placeholder={t("onboarding_wizard.description_placeholder")}
                        />
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className="relative">
                          <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                            $
                          </span>
                          <input
                            type="number"
                            value={item.basePrice ?? ''}
                            onChange={(e) =>
                              updateItem(catIndex, itemIndex, {
                                basePrice: e.target.value ? parseFloat(e.target.value) : null,
                              })
                            }
                            className="w-24 text-sm font-medium text-slate-700 bg-white border border-slate-200 rounded-md pl-5 pr-3 py-1.5 outline-none focus:ring-2 focus:ring-indigo-200 focus:border-indigo-300"
                            step="0.01"
                            min="0"
                          />
                        </div>
                        <button
                          onClick={() => removeItem(catIndex, itemIndex)}
                          className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    {item.options.length > 0 && (
                      <div className="ms-2 ps-3 border-s-2 border-indigo-100 space-y-2">
                        <span className="text-xs font-medium text-slate-500">
                          {t("menu.options")}
                        </span>
                        {item.options.map((option, optIndex) => (
                          <div
                            key={optIndex}
                            className="flex items-center gap-2"
                          >
                            <input
                              value={option.name}
                              onChange={(e) =>
                                updateOption(
                                  catIndex,
                                  itemIndex,
                                  optIndex,
                                  { name: e.target.value }
                                )
                              }
                              className="flex-1 text-xs text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-1 focus:ring-indigo-200"
                              placeholder={t("menu.option_name_placeholder")}
                            />
                            <div className="relative">
                              <span className="absolute left-1.5 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                                $
                              </span>
                              <input
                                type="number"
                                value={option.price}
                                onChange={(e) =>
                                  updateOption(
                                    catIndex,
                                    itemIndex,
                                    optIndex,
                                    {
                                      price:
                                        parseFloat(e.target.value) || 0,
                                    }
                                  )
                                }
                                className="w-20 text-xs text-slate-600 bg-white border border-slate-200 rounded-md pl-4 pr-2 py-1 outline-none focus:ring-1 focus:ring-indigo-200"
                                step="0.01"
                                min="0"
                              />
                            </div>
                            <button
                              onClick={() =>
                                removeOption(catIndex, itemIndex, optIndex)
                              }
                              className="text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}

                    <button
                      onClick={() => addOption(catIndex, itemIndex)}
                      className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-700 transition-colors cursor-pointer"
                    >
                      <Plus className="h-3 w-3" />
                      {t("onboarding_wizard.add_option")}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={addCategory}
        className="w-full flex items-center justify-center gap-2 p-4 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 hover:text-indigo-600 hover:border-indigo-300 transition-colors cursor-pointer"
      >
        <Plus className="h-4 w-4" />
        {t("onboarding_wizard.add_category")}
      </button>

      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-100">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className="text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            {t("common.cancel")}
          </button>
          <button
            onClick={onBack}
            className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            {t("common.back")}
          </button>
        </div>
        <Button
          onClick={() => onSave(menu)}
          loading={saving}
          className="bg-indigo-500 hover:bg-indigo-600 text-white"
        >
          <Save className="h-4 w-4" />
          {t("onboarding_wizard.approve_save")}
        </Button>
      </div>

      {error && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50/60 border border-red-100/60">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  );
}
