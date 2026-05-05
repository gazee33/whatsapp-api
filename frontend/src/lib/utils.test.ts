import { describe, it, expect } from "vitest";
import {
  cn,
  formatCurrency,
  formatTimeAgo,
  truncate,
  getInitials,
} from "./utils";

describe("cn", () => {
  it("merges tailwind classes", () => {
    expect(cn("px-4", "py-2")).toBe("px-4 py-2");
  });

  it("handles conditional classes", () => {
    expect(cn("base", false && "hidden", "extra")).toBe("base extra");
  });

  it("resolves tailwind conflicts", () => {
    expect(cn("px-4", "px-6")).toBe("px-6");
  });
});

describe("formatCurrency", () => {
  it("formats SAR by default", () => {
    const result = formatCurrency(150.5);
    expect(result).toContain("150.50");
    expect(result).toContain("SAR");
  });

  it("formats zero", () => {
    const result = formatCurrency(0);
    expect(result).toContain("0.00");
  });
});

describe("formatTimeAgo", () => {
  it('returns "just now" for recent timestamps', () => {
    const now = new Date().toISOString();
    expect(formatTimeAgo(now)).toBe("just now");
  });

  it("returns minutes ago", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    expect(formatTimeAgo(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
    expect(formatTimeAgo(twoHoursAgo)).toBe("2h ago");
  });

  it("returns days ago", () => {
    const threeDaysAgo = new Date(
      Date.now() - 3 * 24 * 60 * 60 * 1000
    ).toISOString();
    expect(formatTimeAgo(threeDaysAgo)).toBe("3d ago");
  });
});

describe("truncate", () => {
  it("returns original string when shorter than length", () => {
    expect(truncate("hello", 10)).toBe("hello");
  });

  it("truncates and appends ellipsis", () => {
    expect(truncate("hello world", 5)).toBe("hello...");
  });

  it("returns exact when equal to length", () => {
    expect(truncate("hello", 5)).toBe("hello");
  });
});

describe("getInitials", () => {
  it("returns initials from full name", () => {
    expect(getInitials("John Doe")).toBe("JD");
  });

  it("returns single initial for single name", () => {
    expect(getInitials("Admin")).toBe("A");
  });

  it("returns up to two initials for long names", () => {
    expect(getInitials("John Michael Doe")).toBe("JM");
  });

  it("returns uppercase initials", () => {
    expect(getInitials("john doe")).toBe("JD");
  });
});
