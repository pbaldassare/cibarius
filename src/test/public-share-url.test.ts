import { describe, expect, it } from "vitest";
import { SITE_URL, publicShareUrl } from "@/lib/site";

describe("publicShareUrl", () => {
  it("punta al dominio pubblico, non a localhost", () => {
    expect(SITE_URL).toBe("https://cibarius.online");
    expect(publicShareUrl("/haccp/label/abc")).toBe(
      "https://cibarius.online/haccp/label/abc",
    );
    expect(publicShareUrl("/restaurant/item/inv-1")).toBe(
      "https://cibarius.online/restaurant/item/inv-1",
    );
  });
});
