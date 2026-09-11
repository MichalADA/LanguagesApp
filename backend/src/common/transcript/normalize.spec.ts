import { normalizeTranscript, tokenizeTranscript, uniqueTokens } from "./normalize";
import { computeCoverage } from "./coverage";

describe("normalizeTranscript", () => {
  it("keeps Croatian diacritics", () => {
    expect(normalizeTranscript("Često Ćuti Đak Šuma Žaba")).toContain("često");
    expect(normalizeTranscript("Često Ćuti Đak Šuma Žaba")).toContain("žaba");
  });

  it("strips speaker labels", () => {
    const normalized = normalizeTranscript("Mario: Bok, kako si?\nLaura: Dobro sam.");
    expect(normalized).not.toContain("mario:");
    expect(normalized).not.toContain("laura:");
    expect(normalized).toContain("bok");
    expect(normalized).toContain("dobro");
  });

  it("lowercases", () => {
    expect(normalizeTranscript("Zdravo")).toBe("zdravo");
  });
});

describe("tokenizeTranscript", () => {
  it("drops punctuation", () => {
    expect(tokenizeTranscript("Bok, kako si? Dobro!")).toEqual(["bok", "kako", "si", "dobro"]);
  });

  it("keeps diacritics inside tokens", () => {
    expect(tokenizeTranscript("Često plivam.")).toEqual(["često", "plivam"]);
  });

  it("counts repeated tokens", () => {
    const tokens = tokenizeTranscript("bok bok bok");
    expect(tokens).toEqual(["bok", "bok", "bok"]);
  });

  it("empty on empty input", () => {
    expect(tokenizeTranscript("")).toEqual([]);
    expect(tokenizeTranscript("   \n  ")).toEqual([]);
  });
});

describe("uniqueTokens", () => {
  it("deduplicates preserving order", () => {
    expect(uniqueTokens(["a", "b", "a", "c", "b"])).toEqual(["a", "b", "c"]);
  });
});

describe("computeCoverage", () => {
  const known = new Set(["bok", "kako", "si", "dobro", "sam"]);

  it("100% when every unique word is known", () => {
    const report = computeCoverage("Bok, kako si? Dobro sam.", known);
    expect(report.totalWords).toBe(5);
    expect(report.uniqueWords).toBe(5);
    expect(report.knownWords).toBe(5);
    expect(report.missingWords).toBe(0);
    expect(report.coveragePercent).toBe(100);
    expect(report.missing).toEqual([]);
  });

  it("splits known and missing", () => {
    const report = computeCoverage("Bok! Zapravo često plivam.", known);
    expect(report.totalWords).toBe(4);
    expect(report.uniqueWords).toBe(4);
    expect(report.knownWords).toBe(1);
    expect(report.missingWords).toBe(3);
    expect(report.missing).toEqual(expect.arrayContaining(["često", "plivam", "zapravo"]));
    expect(report.missing).toHaveLength(3);
    expect(report.coveragePercent).toBe(25);
  });

  it("zero on empty transcript", () => {
    const report = computeCoverage("", known);
    expect(report.totalWords).toBe(0);
    expect(report.uniqueWords).toBe(0);
    expect(report.coveragePercent).toBe(0);
  });
});
