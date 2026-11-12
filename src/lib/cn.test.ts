import { describe, expect, it } from "vitest";
import { cn } from "./cn";

describe("cn", () => {
  it("lets later classes override earlier ones", () => {
    expect(cn("h-11 px-4", "h-10")).toBe("px-4 h-10");
    expect(cn("rounded-card", "rounded-full")).toBe("rounded-full");
    expect(cn("shadow-soft", "shadow-lift")).toBe("shadow-lift");
    expect(cn("inline-flex", "hidden sm:inline-flex")).toBe("hidden sm:inline-flex");
  });

  it("keeps non-conflicting custom tokens", () => {
    expect(cn("font-display font-semibold text-bruin-700 text-lg")).toBe(
      "font-display font-semibold text-bruin-700 text-lg",
    );
    expect(cn("bg-cream", false, null, "text-ink")).toBe("bg-cream text-ink");
  });
});
