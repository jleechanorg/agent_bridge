/**
 * Browser client — HTTP-based web content fetching.
 */

export interface PageContent {
    url: string;
    title: string;
    text: string;
    statusCode: number;
}

export class BrowserClient {
    /** Fetch page content via HTTP and extract text */
    static async fetchPage(url: string): Promise<PageContent> {
        const response = await fetch(url);
        const html = await response.text();

        const title = html.match(/<title[^>]*>(.*?)<\/title>/i)?.[1]?.trim() ?? "";
        const text = BrowserClient.htmlToText(html);

        return {
            url,
            title,
            text,
            statusCode: response.status,
        };
    }

    /** Strip HTML tags to plain text */
    static htmlToText(html: string): string {
        return html
            .replace(/<script[\s\S]*?<\/script>/gi, "")
            .replace(/<style[\s\S]*?<\/style>/gi, "")
            .replace(/<[^>]+>/g, " ")
            .replace(/&nbsp;/g, " ")
            .replace(/&amp;/g, "&")
            .replace(/&lt;/g, "<")
            .replace(/&gt;/g, ">")
            .replace(/\s+/g, " ")
            .trim();
    }
}
