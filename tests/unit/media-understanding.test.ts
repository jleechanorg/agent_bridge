import { describe, it, expect } from "vitest";
import { MediaDetector, type MediaAttachment } from "../../src/media-understanding/detector.js";

describe("Media Understanding", () => {
    it("detects image by extension", () => {
        expect(MediaDetector.detectType("photo.png")).toBe("image");
        expect(MediaDetector.detectType("photo.jpg")).toBe("image");
        expect(MediaDetector.detectType("photo.webp")).toBe("image");
    });

    it("detects video by extension", () => {
        expect(MediaDetector.detectType("clip.mp4")).toBe("video");
        expect(MediaDetector.detectType("clip.mov")).toBe("video");
    });

    it("detects audio by extension", () => {
        expect(MediaDetector.detectType("voice.mp3")).toBe("audio");
        expect(MediaDetector.detectType("voice.wav")).toBe("audio");
    });

    it("returns unknown for other files", () => {
        expect(MediaDetector.detectType("file.txt")).toBe("unknown");
        expect(MediaDetector.detectType("data.json")).toBe("unknown");
    });

    it("detects by MIME type", () => {
        expect(MediaDetector.detectByMime("image/png")).toBe("image");
        expect(MediaDetector.detectByMime("video/mp4")).toBe("video");
        expect(MediaDetector.detectByMime("audio/mpeg")).toBe("audio");
        expect(MediaDetector.detectByMime("text/plain")).toBe("unknown");
    });

    it("formats media note for agent", () => {
        const attachment: MediaAttachment = {
            url: "https://cdn.example.com/photo.png",
            mimeType: "image/png",
            filename: "photo.png",
            size: 1024,
        };
        const note = MediaDetector.formatNote(attachment);
        expect(note).toContain("photo.png");
        expect(note).toContain("image");
    });
});
