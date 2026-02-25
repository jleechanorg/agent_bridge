/**
 * Link understanding — URL extraction and metadata formatting.
 */

export interface LinkMetadata {
    url: string;
    title?: string;
    description?: string;
}

const URL_REGEX = /https?:\/\/[^\s<>\"')\]]+/g;

export class LinkExtractor {
    static extractUrls(text: string): string[] {
        const matches = text.match(URL_REGEX) ?? [];
        return [...new Set(matches)];
    }

    static formatMetadata(meta: LinkMetadata): string {
        const parts = [`🔗 ${meta.url}`];
        if (meta.title) parts.push(`   Title: ${meta.title}`);
        if (meta.description) parts.push(`   ${meta.description}`);
        return parts.join("\n");
    }
}
