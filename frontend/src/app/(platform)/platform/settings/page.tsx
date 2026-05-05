"use client";

import { useEffect, useState, useCallback } from "react";
import { Settings, Save } from "lucide-react";
import { platformClient } from "@/lib/api-client";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/input";
import { SkeletonBlock, FormSkeleton } from "@/components/shared/skeletons";
import { EmptyState } from "@/components/shared/empty-state";

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<Record<string, string> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const fetchSettings = useCallback(() => {
    setLoading(true);
    platformClient
      .get("/platform/settings")
      .then((r) => {
        setSettings(r.data);
        setError(null);
      })
      .catch((err) => {
        setError(err?.message || "Failed to fetch settings");
      })
      .finally(() => setLoading(false));
  }, []);

  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const handleChange = (key: string, value: string) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
    setSuccess(false);
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setError(null);
    try {
      await platformClient.put("/platform/settings", settings);
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(
        (err as Error)?.message || "Failed to save settings"
      );
    } finally {
      setSaving(false);
    }
  };

  if (loading)
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <SkeletonBlock className="h-7 w-40" />
            <SkeletonBlock className="mt-1 h-3 w-56" />
          </div>
          <SkeletonBlock className="h-9 w-36" />
        </div>
        <FormSkeleton sections={1} fieldsPerSection={4} />
      </div>
    );

  if (error && !settings) {
    return (
      <EmptyState
        icon={Settings}
        title="Failed to load settings"
        description={error}
        action={
          <Button onClick={fetchSettings}>Retry</Button>
        }
      />
    );
  }

  if (!settings || Object.keys(settings).length === 0) {
    return (
      <EmptyState
        icon={Settings}
        title="No settings found"
        description="Platform settings are not configured yet."
      />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Settings</h1>
          <p className="text-sm text-muted-foreground">
            Manage global platform configuration.
          </p>
        </div>
        <Button onClick={handleSave} loading={saving}>
          <Save className="h-4 w-4" />
          Save Changes
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="h-4 w-4 text-muted-foreground" />
            Configuration
          </CardTitle>
          <CardDescription>
            Modify platform-level settings below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.entries(settings).map(([key, value]) => (
            <div key={key} className="space-y-2">
              <Label htmlFor={`setting-${key}`} className="capitalize">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </Label>
              <Input
                id={`setting-${key}`}
                value={value}
                onChange={(e) => handleChange(key, e.target.value)}
              />
            </div>
          ))}

          {success && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-700 dark:border-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300">
              Settings saved successfully.
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-800 dark:bg-red-950/50 dark:text-red-300">
              {error}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
