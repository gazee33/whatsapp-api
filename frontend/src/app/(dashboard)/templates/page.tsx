"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "@/i18n/language-context";
import { MessageSquare, Plus } from "lucide-react";
import { useTemplateStore } from "@/stores/template-store";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SkeletonBlock } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";
import { CreateTemplateDialog, type TemplateFormData } from "./components/create-template-dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

const STATUS_OPTIONS = [
  { value: "all", label: "All" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "REJECTED", label: "Rejected" },
  { value: "DISABLED", label: "Disabled" },
];

const CATEGORY_COLORS: Record<string, string> = {
  MARKETING: "info",
  UTILITY: "success",
  AUTHENTICATION: "secondary",
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: "warning",
  APPROVED: "success",
  REJECTED: "destructive",
  DISABLED: "secondary",
};

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function TemplatesPage() {
  const { t } = useLanguage();
  const { templates, loading, fetchTemplates, createTemplate, deleteTemplate } = useTemplateStore();
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchTemplates(statusFilter === "all" ? undefined : statusFilter);
  }, [fetchTemplates, statusFilter]);

  const handleStatusChange = (value: string) => {
    setStatusFilter(value);
  };

  const handleCreateTemplate = async (data: TemplateFormData) => {
    try {
      await createTemplate(data);
      toast.success(t("templates.created"));
      setCreateDialogOpen(false);
    } catch (error: any) {
      toast.error(error.message || t("templates.create_error"));
    }
  };

  const handleDeleteTemplate = async (id: string) => {
    if (!confirm(t("templates.delete_confirm"))) return;
    setDeletingId(id);
    try {
      await deleteTemplate(id);
      toast.success(t("templates.deleted"));
    } catch (error: any) {
      toast.error(error.message || t("templates.delete_error"));
    } finally {
      setDeletingId(null);
    }
  };

  if (loading && templates.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <SkeletonBlock className="h-7 w-20" />
          <SkeletonBlock className="mt-1 h-3 w-56" />
        </div>
        <div className="flex gap-1 overflow-x-auto">
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-9 w-20 rounded-md" />
          ))}
        </div>
        <div className="grid gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">{t("templates.title")}</h1>
          <p className="text-sm text-muted-foreground">{t("templates.subtitle")}</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="me-2 h-4 w-4" />
          {t("templates.create")}
        </Button>
      </div>

      <div className="flex items-center gap-4">
        <Select value={statusFilter} onValueChange={handleStatusChange}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder={t("templates.filter_status")} />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((status) => (
              <SelectItem key={status.value} value={status.value}>
                {status.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {templates.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title={t("templates.no_templates")}
          description={t("templates.no_templates_desc")}
          action={
            <Button onClick={() => setCreateDialogOpen(true)}>
              <Plus className="me-2 h-4 w-4" />
              {t("templates.create")}
            </Button>
          }
        />
      ) : (
        <div className="grid gap-3">
          {templates.map((template) => (
            <Card key={template.id}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{template.name}</span>
                      <Badge
                        variant={(CATEGORY_COLORS[template.category] || "secondary") as any}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {template.category}
                      </Badge>
                      <Badge
                        variant={(STATUS_COLORS[template.status] || "secondary") as any}
                        className="text-[10px] px-1.5 py-0"
                      >
                        {template.status}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>{template.language}</span>
                      <span>{formatDate(template.createdAt)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => handleDeleteTemplate(template.id)}
                    loading={deletingId === template.id}
                  >
                    {t("common.delete")}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <CreateTemplateDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        onSubmit={handleCreateTemplate}
      />
    </div>
  );
}