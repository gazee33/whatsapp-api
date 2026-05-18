"use client";

import { Image, Map, Link2, MapPin } from "lucide-react";
import { useLanguage } from "@/i18n/language-context";
import { Input, Label } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";

export interface BrandPresenceValue {
  logoUrl: string;
  coverUrl: string;
  mapsUrl: string;
  showAddressByName: boolean;
}

interface BrandPresenceCardProps {
  value: BrandPresenceValue;
  onChange: (next: BrandPresenceValue) => void;
}

export function BrandPresenceCard({ value, onChange }: BrandPresenceCardProps) {
  const { t } = useLanguage();

  const patch = (partial: Partial<BrandPresenceValue>) =>
    onChange({ ...value, ...partial });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Link2 className="h-4 w-4" />
          {t("settings.brand_presence")}
        </CardTitle>
        <CardDescription>{t("settings.brand_presence_desc")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Logo URL */}
        <div className="space-y-2">
          <Label htmlFor="logoUrl" className="flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.logo_url")}
          </Label>
          <Input
            id="logoUrl"
            type="url"
            placeholder="https://example.com/logo.png"
            value={value.logoUrl}
            onChange={(e) => patch({ logoUrl: e.target.value })}
          />
        </div>

        {/* Cover URL */}
        <div className="space-y-2">
          <Label htmlFor="coverUrl" className="flex items-center gap-1.5">
            <Image className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.cover_url")}
          </Label>
          <Input
            id="coverUrl"
            type="url"
            placeholder="https://example.com/cover.jpg"
            value={value.coverUrl}
            onChange={(e) => patch({ coverUrl: e.target.value })}
          />
        </div>

        {/* Maps URL */}
        <div className="space-y-2">
          <Label htmlFor="mapsUrl" className="flex items-center gap-1.5">
            <Map className="h-3.5 w-3.5 text-muted-foreground" />
            {t("settings.maps_url")}
          </Label>
          <Input
            id="mapsUrl"
            type="url"
            placeholder="https://maps.google.com/?q=..."
            value={value.mapsUrl}
            onChange={(e) => patch({ mapsUrl: e.target.value })}
          />
        </div>

        <Separator />

        {/* Show address by name */}
        <div className="flex items-center justify-between rounded-lg border p-3">
          <div className="flex items-start gap-3">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="space-y-0.5">
              <Label>{t("settings.show_address_by_name")}</Label>
              <p className="text-xs text-muted-foreground">
                {t("settings.show_address_by_name_desc")}
              </p>
            </div>
          </div>
          <Switch
            checked={value.showAddressByName}
            onCheckedChange={(v) => patch({ showAddressByName: v })}
          />
        </div>
      </CardContent>
    </Card>
  );
}
