import { describe, it, expect } from "vitest";
import { MarkdownRenderer, FrontmatterParser } from "../../src/markdown/renderer.js";

describe("Markdown", () => {
    describe("MarkdownRenderer", () => {
        it("strips markdown to plain text", () => {
            const plain = MarkdownRenderer.toPlainText("**bold** and *italic*");
            expect(plain).toBe("bold and italic");
        });

        it("strips headers", () => {
            expect(MarkdownRenderer.toPlainText("# Title")).toBe("Title");
            expect(MarkdownRenderer.toPlainText("## Subtitle")).toBe("Subtitle");
        });

        it("strips links", () => {
            expect(MarkdownRenderer.toPlainText("[Click](https://example.com)")).toBe("Click");
        });

        it("strips code fences", () => {
            const md = "```js\nconsole.log('hi');\n```";
            const plain = MarkdownRenderer.toPlainText(md);
            expect(plain).toContain("console.log");
            expect(plain).not.toContain("```");
        });

        it("strips inline code", () => {
            expect(MarkdownRenderer.toPlainText("use `npm install`")).toBe("use npm install");
        });

        it("preserves list items", () => {
            const md = "- item 1\n- item 2";
            const plain = MarkdownRenderer.toPlainText(md);
            expect(plain).toContain("item 1");
            expect(plain).toContain("item 2");
        });
    });

    describe("FrontmatterParser", () => {
        it("parses YAML frontmatter", () => {
            const input = "---\ntitle: Hello\ntags: [a, b]\n---\nBody content";
            const result = FrontmatterParser.parse(input);
            expect(result.data.title).toBe("Hello");
            expect(result.data.tags).toEqual(["a", "b"]);
            expect(result.content).toBe("Body content");
        });

        it("returns empty data when no frontmatter", () => {
            const result = FrontmatterParser.parse("Just plain text");
            expect(result.data).toEqual({});
            expect(result.content).toBe("Just plain text");
        });

        it("handles empty frontmatter", () => {
            const result = FrontmatterParser.parse("---\n---\nContent");
            expect(result.data).toEqual({});
            expect(result.content).toBe("Content");
        });
    });
});
