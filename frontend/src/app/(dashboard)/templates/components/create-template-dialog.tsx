"use client";

import { useState } from "react";
import { useLanguage } from "@/i18n/language-context";
import { Button } from "@/components/ui/button";
import { Input, Label } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

interface CreateTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TemplateFormData) => Promise<void>;
}

export interface TemplateFormData {
  name: string;
  category: string;
  language: string;
  components: {
    type: string;
    text?: string;
    example?: { body_text?: string[][] };
    buttons?: { type: string; text: string }[];
  }[];
}

const CATEGORIES = ["MARKETING", "UTILITY", "AUTHENTICATION"];
const LANGUAGES = [
  { value: "en_US", label: "English (US)" },
  { value: "ar", label: "Arabic" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
  { value: "pt_BR", label: "Portuguese (Brazil)" },
];

export function CreateTemplateDialog({ open, onOpenChange, onSubmit }: CreateTemplateDialogProps) {
  const { t } = useLanguage();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<string>("MARKETING");
  const [language, setLanguage] = useState<string>("en_US");
  const [bodyText, setBodyText] = useState("");
  const [headerText, setHeaderText] = useState("");
  const [footerText, setFooterText] = useState("");
  const [buttons, setButtons] = useState<string[]>(["", "", ""]);

  const resetForm = () => {
    setName("");
    setCategory("MARKETING");
    setLanguage("en_US");
    setBodyText("");
    setHeaderText("");
    setFooterText("");
    setButtons(["", "", ""]);
  };

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) resetForm();
    onOpenChange(isOpen);
  };

  const handleNameChange = (value: string) => {
    setName(value.toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, ""));
  };

  const handleButtonChange = (index: number, value: string) => {
    const newButtons = [...buttons];
    newButtons[index] = value;
    setButtons(newButtons);
  };

  const buildComponents = () => {
    const components: TemplateFormData["components"] = [];

    if (headerText.trim()) {
      components.push({ type: "HEADER", text: headerText.trim() });
    }

    components.push({
      type: "BODY",
      text: bodyText.trim(),
      example: {
        body_text: [[
          bodyText.includes("{{1}}") ? "sample value 1" : "",
          bodyText.includes("{{2}}") ? "sample value 2" : "",
        ].filter(Boolean)],
      },
    });

    if (footerText.trim()) {
      components.push({ type: "FOOTER", text: footerText.trim() });
    }

    const activeButtons = buttons.filter((b) => b.trim());
    if (activeButtons.length > 0) {
      components.push({
        type: "BUTTONS",
        buttons: activeButtons.map((text) => ({ type: "QUICK_REPLY", text: text.trim() })),
      });
    }

    return components;
  };

  const handleSubmit = async () => {
    if (!name.trim() || !bodyText.trim()) return;

    setLoading(true);
    try {
      await onSubmit({
        name: name.trim(),
        category,
        language,
        components: buildComponents(),
      });
      resetForm();
      onOpenChange(false);
    } catch (err) {
      console.error('[CreateTemplate] Submit failed:', err);
    } finally {
      setLoading(false);
    }
  };

  const isValid = name.trim() && bodyText.trim();

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{t("templates.create_title")}</DialogTitle>
          <DialogDescription>{t("templates.create_desc")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="template-name">{t("templates.name")}</Label>
              <Input
                id="template-name"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                placeholder="order_confirmation"
              />
              <p className="text-xs text-muted-foreground">{t("templates.name_hint")}</p>
            </div>
            <div className="space-y-2">
              <Label>{t("templates.category")}</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((cat) => (
                    <SelectItem key={cat} value={cat}>
                      {cat.charAt(0) + cat.slice(1).toLowerCase()}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>{t("templates.language")}</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((lang) => (
                  <SelectItem key={lang.value} value={lang.value}>
                    {lang.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="header-text">{t("templates.header")} ({t("templates.optional")})</Label>
            <Input
              id="header-text"
              value={headerText}
              onChange={(e) => setHeaderText(e.target.value)}
              placeholder={t("templates.header_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body-text">
              {t("templates.body")} <span className="text-destructive">*</span>
            </Label>
            <textarea
              id="body-text"
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              placeholder={t("templates.body_placeholder")}
              rows={4}
              className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors duration-200 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <p className="text-xs text-muted-foreground">{t("templates.body_hint")}</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="footer-text">{t("templates.footer")} ({t("templates.optional")})</Label>
            <Input
              id="footer-text"
              value={footerText}
              onChange={(e) => setFooterText(e.target.value)}
              placeholder={t("templates.footer_placeholder")}
            />
          </div>

          <div className="space-y-2">
            <Label>{t("templates.buttons")} ({t("templates.optional")})</Label>
            <div className="space-y-2">
              {buttons.map((button, index) => (
                <Input
                  key={index}
                  value={button}
                  onChange={(e) => handleButtonChange(index, e.target.value)}
                  placeholder={`${t("templates.button")} ${index + 1}`}
                  maxLength={25}
                />
              ))}
            </div>
            <p className="text-xs text-muted-foreground">{t("templates.buttons_hint")}</p>
          </div>

          <div className="rounded-lg border bg-muted/50 p-4 space-y-2">
            <p className="text-sm font-medium">{t("templates.preview")}</p>
            <div className="rounded-lg border bg-white p-3 space-y-2">
              {headerText && (
                <p className="text-sm font-medium">{headerText}</p>
              )}
              <p className="text-sm whitespace-pre-wrap">{bodyText || t("templates.body_placeholder")}</p>
              {footerText && (
                <p className="text-xs text-muted-foreground">{footerText}</p>
              )}
              {buttons.filter((b) => b.trim()).length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {buttons.filter((b) => b.trim()).map((btn, i) => (
                    <Badge key={i} variant="secondary" className="text-xs">
                      {btn}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => handleClose(false)}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleSubmit} loading={loading} disabled={!isValid}>
            {t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}