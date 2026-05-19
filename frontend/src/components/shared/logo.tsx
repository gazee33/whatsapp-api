"use client";

import Image from "next/image";
import { cn } from "@/lib/utils";
import { useLanguage } from "@/i18n/language-context";

interface LogoProps {
  variant?: "full" | "icon";
  className?: string;
  height?: number;
  priority?: boolean;
}

const FULL_LOGO_ASPECT_RATIO = 754 / 294;

export function Logo({
  variant = "full",
  className,
  height = 32,
  priority = false,
}: LogoProps) {
  const { isRtl } = useLanguage();

  if (variant === "icon") {
    return (
      <Image
        src="/logoIcon.png"
        alt="Nadil AI"
        width={height}
        height={height}
        priority={priority}
        className={cn("select-none", className)}
        style={{ height, width: height }}
      />
    );
  }

  const width = Math.round(height * FULL_LOGO_ASPECT_RATIO);
  return (
    <Image
      src={isRtl ? "/logoRtl.png" : "/logo.png"}
      alt="Nadil AI"
      width={width}
      height={height}
      priority={priority}
      className={cn("select-none", className)}
      style={{ height, width: "auto" }}
    />
  );
}
