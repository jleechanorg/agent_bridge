/**
 * Markdown renderer — strip to plain text; frontmatter parsing.
 */

export class MarkdownRenderer {
    static toPlainText(md: string): string {
        let text = md;
        // Remove code fences
        text = text.replace(/```[\s\S]*?```/g, (match) => {
            return match.replace(/```\w*\n?/g, "").replace(/```/g, "").trim();
        });
        // Remove inline code backticks
        text = text.replace(/`([^`]+)`/g, "$1");
        // Remove headers
        text = text.replace(/^#{1,6}\s+/gm, "");
        // Remove bold/italic
        text = text.replace(/\*\*([^*]+)\*\*/g, "$1");
        text = text.replace(/\*([^*]+)\*/g, "$1");
        text = text.replace(/__([^_]+)__/g, "$1");
        text = text.replace(/_([^_]+)_/g, "$1");
        // Remove links: [text](url) → text
        text = text.replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
        // Remove images: ![alt](url) → alt
        text = text.replace(/!\[([^\]]*)\]\([^)]+\)/g, "$1");
        // Clean up
        text = text.replace(/\n{3,}/g, "\n\n");
        return text.trim();
    }
}

export class FrontmatterParser {
    static parse(input: string): { data: Record<string, any>; content: string } {
        const match = input.match(/^---\n([\s\S]*?)---\n?([\s\S]*)$/);
        if (!match) return { data: {}, content: input };

        const yamlStr = match[1].trim();
        const content = match[2].trim();

        if (!yamlStr) return { data: {}, content };

        // Simple YAML parser (key: value, key: [a, b])
        const data: Record<string, any> = {};
        for (const line of yamlStr.split("\n")) {
            const kv = line.match(/^(\w+):\s*(.+)$/);
            if (!kv) continue;
            const [, key, rawVal] = kv;
            // Array check
            const arrayMatch = rawVal.match(/^\[(.+)\]$/);
            if (arrayMatch) {
                data[key] = arrayMatch[1].split(",").map((s) => s.trim());
            } else {
                data[key] = rawVal;
            }
        }
        return { data, content };
    }
}
