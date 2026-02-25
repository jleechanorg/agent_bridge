/**
 * Media understanding — file type detection and agent note formatting.
 */

export interface MediaAttachment {
    url: string;
    mimeType: string;
    filename: string;
    size?: number;
}

type MediaType = "image" | "video" | "audio" | "unknown";

const EXT_MAP: Record<string, MediaType> = {
    png: "image", jpg: "image", jpeg: "image", gif: "image", webp: "image", svg: "image", bmp: "image",
    mp4: "video", mov: "video", avi: "video", mkv: "video", webm: "video",
    mp3: "audio", wav: "audio", ogg: "audio", flac: "audio", aac: "audio", m4a: "audio",
};

export class MediaDetector {
    static detectType(filename: string): MediaType {
        const ext = filename.split(".").pop()?.toLowerCase() ?? "";
        return EXT_MAP[ext] ?? "unknown";
    }

    static detectByMime(mime: string): MediaType {
        const prefix = mime.split("/")[0];
        if (prefix === "image") return "image";
        if (prefix === "video") return "video";
        if (prefix === "audio") return "audio";
        return "unknown";
    }

    static formatNote(attachment: MediaAttachment): string {
        const type = MediaDetector.detectByMime(attachment.mimeType);
        const sizeStr = attachment.size ? ` (${Math.round(attachment.size / 1024)}KB)` : "";
        return `[${type}] ${attachment.filename}${sizeStr} — ${attachment.url}`;
    }
}
