"use client";

import { useEffect, useState, useCallback } from "react";
import { Plus, Pencil, Trash2, Users, CheckCircle2, XCircle } from "lucide-react";
import { usePlatformStore } from "@/stores/platform-store";
import { useLanguage } from "@/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { toast } from "sonner";
import type { OnboardingPreset, TonePreset } from "@/lib/types";

const TONE_PRESETS: { value: TonePreset; label: string }[] = [
  { value: "casual", label: "Casual" },
  { value: "formal", label: "Formal" },
  { value: "playful", label: "Playful" },
  { value: "professional", label: "Professional" },
];

const EMPTY_FORM = {
  name: "",
  description: "",
  tonePreset: "casual" as TonePreset,
  defaultCustomInstructions: "",
};

function PresetForm({
  initial,
  onSave,
  onCancel,
  saving,
}: {
  initial: typeof EMPTY_FORM;
  onSave: (data: typeof EMPTY_FORM) => Promise<void>;
  onCancel: () => void;
  saving: boolean;
}) {
  const { t } = useLanguage();
  const [form, setForm] = useState(initial);

  function set<K extends keyof typeof EMPTY_FORM>(key: K, val: (typeof EMPTY_FORM)[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error(t("platform.presets.name_required"));
      return;
    }
    await onSave(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="preset-name">{t("platform.presets.name")}</Label>
        <Input
          id="preset-name"
          value={form.name}
          onChange={(e) => set("name", e.target.value)}
          placeholder={t("platform.presets.name_placeholder")}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="preset-description">{t("platform.presets.description")}</Label>
        <Input
          id="preset-description"
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder={t("platform.presets.description_placeholder")}
        />
      </div>

      <div className="space-y-2">
        <Label>{t("platform.presets.tone")}</Label>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {TONE_PRESETS.map((tp) => (
            <button
              key={tp.value}
              type="button"
              onClick={() => set("tonePreset", tp.value)}
              className={`rounded-lg border px-3 py-2 text-sm font-medium transition-colors ${
                form.tonePreset === tp.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-input bg-background hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              {tp.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="preset-instructions">{t("platform.presets.custom_instructions")}</Label>
        <textarea
          id="preset-instructions"
          rows={4}
          value={form.defaultCustomInstructions}
          onChange={(e) => set("defaultCustomInstructions", e.target.value)}
          maxLength={500}
          placeholder={t("platform.presets.instructions_placeholder")}
          className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-y"
        />
        <p className="text-right text-xs text-muted-foreground">
          {form.defaultCustomInstructions.length}/500
        </p>
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={saving}>
          {t("common.cancel")}
        </Button>
        <Button type="submit" loading={saving}>
          {t("common.save")}
        </Button>
      </div>
    </form>
  );
}

function PresetCard({
  preset,
  onEdit,
  onDelete,
}: {
  preset: OnboardingPreset;
  onEdit: (preset: OnboardingPreset) => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const businessCount = preset._count?.businesses ?? 0;

  return (
    <div
      className={`rounded-xl border bg-card p-4 shadow-sm transition-all ${
        !preset.isActive ? "opacity-60" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-sm truncate">{preset.name}</h3>
            <span
              className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
                preset.isActive
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                  : "bg-gray-100 text-gray-500 dark:bg-gray-800"
              }`}
            >
              {preset.isActive ? (
                <>
                  <CheckCircle2 className="h-3 w-3" />
                  {t("platform.presets.active")}
                </>
              ) : (
                <>
                  <XCircle className="h-3 w-3" />
                  {t("platform.presets.inactive")}
                </>
              )}
            </span>
          </div>
          {preset.description && (
            <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{preset.description}</p>
          )}
          <div className="mt-2 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span className="capitalize font-medium text-foreground">{preset.tonePreset}</span>
            <span className="flex items-center gap-1">
              <Users className="h-3 w-3" />
              {businessCount} {t("platform.presets.business_count")}
            </span>
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          <button
            onClick={() => onEdit(preset)}
            className="p-1.5 rounded-lg hover:bg-accent transition-colors"
            aria-label={t("common.edit")}
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
          {preset.isActive && (
            <button
              onClick={() => onDelete(preset.id)}
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-destructive transition-colors"
              aria-label={t("common.delete")}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function PresetsPage() {
  const { t } = useLanguage();
  const { presets, presetsLoading, fetchPresets, createPreset, updatePreset, deletePreset } =
    usePlatformStore();

  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingPreset, setEditingPreset] = useState<OnboardingPreset | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchPresets().then(() => setLoaded(true));
  }, [fetchPresets]);

  const handleCreate = useCallback(
    async (data: typeof EMPTY_FORM) => {
      setSaving(true);
      try {
        await createPreset(data);
        setShowForm(false);
        toast.success(t("platform.presets.created"));
      } catch {
        toast.error(t("platform.presets.create_error"));
      } finally {
        setSaving(false);
      }
    },
    [createPreset, t],
  );

  const handleUpdate = useCallback(
    async (data: typeof EMPTY_FORM) => {
      if (!editingPreset) return;
      setSaving(true);
      try {
        await updatePreset(editingPreset.id, data);
        setEditingPreset(null);
        toast.success(t("platform.presets.updated"));
      } catch {
        toast.error(t("platform.presets.update_error"));
      } finally {
        setSaving(false);
      }
    },
    [editingPreset, updatePreset, t],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deletePreset(id);
        toast.success(t("platform.presets.deleted"));
      } catch {
        toast.error(t("platform.presets.delete_error"));
      }
    },
    [deletePreset, t],
  );

  if (!loaded || presetsLoading) {
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <SkeletonBlock className="h-8 w-48" />
        <div className="grid gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((i) => (
            <SkeletonBlock key={i} className="h-28" />
          ))}
        </div>
      </div>
    );
  }

  const editInitial = editingPreset
    ? {
        name: editingPreset.name,
        description: editingPreset.description,
        tonePreset: editingPreset.tonePreset,
        defaultCustomInstructions: editingPreset.defaultCustomInstructions,
      }
    : EMPTY_FORM;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("platform.presets.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("platform.presets.subtitle")}</p>
        </div>
        {!showForm && !editingPreset && (
          <Button onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t("platform.presets.new_preset")}
          </Button>
        )}
      </div>

      <Separator />

      {/* New preset form */}
      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("platform.presets.create")}</CardTitle>
            <CardDescription>{t("platform.presets.create_desc")}</CardDescription>
          </CardHeader>
          <CardContent>
            <PresetForm
              initial={EMPTY_FORM}
              onSave={handleCreate}
              onCancel={() => setShowForm(false)}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* Edit form */}
      {editingPreset && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">{t("platform.presets.edit")}</CardTitle>
            <CardDescription>{editingPreset.name}</CardDescription>
          </CardHeader>
          <CardContent>
            <PresetForm
              initial={editInitial}
              onSave={handleUpdate}
              onCancel={() => setEditingPreset(null)}
              saving={saving}
            />
          </CardContent>
        </Card>
      )}

      {/* Preset list */}
      {presets.length === 0 && !showForm ? (
        <div className="rounded-xl border border-dashed p-12 text-center">
          <p className="text-muted-foreground text-sm">{t("platform.presets.no_presets")}</p>
          <Button className="mt-4" variant="outline" onClick={() => setShowForm(true)}>
            <Plus className="h-4 w-4" />
            {t("platform.presets.new_preset")}
          </Button>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {presets.map((preset) => (
            <PresetCard
              key={preset.id}
              preset={preset}
              onEdit={(p) => {
                setShowForm(false);
                setEditingPreset(p);
              }}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
