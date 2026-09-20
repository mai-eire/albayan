import { describe, expect, it } from "vitest";
import { cleanRulesHtml } from "./rules";

describe("cleanRulesHtml", () => {
  it("keeps structure and drops everything else", () => {
    const pasted =
      '<h2 style="color:red" class="x">Arrival</h2><p><b>Be</b> on <span style="font-weight:700">time</span>.</p>' +
      "<ul><li>Bags in the hall</li></ul><script>alert(1)</script><img src=x onerror=alert(1)>" +
      '<p><a href="https://example.com" onclick="x()">Site</a></p>';
    const html = cleanRulesHtml(pasted);
    expect(html).toContain("<h2>Arrival</h2>");
    expect(html).toContain("<strong>Be</strong>");
    expect(html).toContain("<li><p>Bags in the hall</p></li>");
    expect(html).not.toContain("script");
    expect(html).not.toContain("img");
    expect(html).not.toContain("onclick");
    expect(html).not.toContain("style");
    expect(html).toMatch(/<a [^>]*href="https:\/\/example.com"/);
  });

  it("turns rules saved as plain text into paragraphs", () => {
    expect(cleanRulesHtml("Be kind.\n\nBe on time <3")).toBe(
      "<p>Be kind.</p><p>Be on time &lt;3</p>",
    );
    expect(cleanRulesHtml(null)).toBe("");
    expect(cleanRulesHtml("<p></p>")).toBe("");
  });
});
