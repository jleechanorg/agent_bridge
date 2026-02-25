import { describe, it, expect } from "vitest";
import { LinkExtractor } from "../../src/link-understanding/extractor.js";

describe("Link Understanding", () => {
    it("extracts URLs from text", () => {
        const urls = LinkExtractor.extractUrls("Check https://example.com and http://test.org/path");
        expect(urls).toHaveLength(2);
        expect(urls[0]).toBe("https://example.com");
        expect(urls[1]).toBe("http://test.org/path");
    });

    it("returns empty for no URLs", () => {
        expect(LinkExtractor.extractUrls("no links here")).toEqual([]);
    });

    it("deduplicates URLs", () => {
        const urls = LinkExtractor.extractUrls("visit https://a.com and https://a.com again");
        expect(urls).toHaveLength(1);
    });

    it("formats link metadata", () => {
        const formatted = LinkExtractor.formatMetadata({
            url: "https://example.com",
            title: "Example",
            description: "An example site",
        });
        expect(formatted).toContain("Example");
        expect(formatted).toContain("https://example.com");
    });
});
