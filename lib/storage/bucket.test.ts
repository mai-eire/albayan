import { describe, expect, it } from "vitest";
import { safeFilename } from "./bucket";

describe("safeFilename", () => {
  it("normalises names and keeps extensions", () => {
    expect(safeFilename("My Report.PDF")).toBe("my-report.pdf");
    expect(safeFilename("../../etc/passwd")).toBe("etc-passwd");
    expect(safeFilename("   ")).toBe("file");
    expect(safeFilename("سورة الفاتحة.mp3")).toBe("mp3");
  });
});
