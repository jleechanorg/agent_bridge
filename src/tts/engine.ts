/**
 * TTS — Text-to-speech engine with provider abstraction.
 */

export interface TTSConfig {
    enabled: boolean;
    provider: string;
    voice?: string;
    rate?: number;
    outputFile?: string;
}

export interface TTSProviderOpts {
    voice?: string;
    rate?: number;
    outputFile?: string;
}

export interface TTSProvider {
    readonly name: string;
    buildCommand(text: string, opts: TTSProviderOpts): string;
}

export class TTSEngine {
    private providers: Map<string, TTSProvider> = new Map();
    private config: TTSConfig = {
        enabled: false,
        provider: "macos",
    };

    registerProvider(name: string, provider: TTSProvider): void {
        this.providers.set(name, provider);
    }

    getProvider(name: string): TTSProvider {
        const provider = this.providers.get(name);
        if (!provider) throw new Error(`Unknown TTS provider: ${name}`);
        return provider;
    }

    listProviders(): string[] {
        return [...this.providers.keys()];
    }

    getConfig(): TTSConfig {
        return { ...this.config };
    }

    setConfig(partial: Partial<TTSConfig>): void {
        Object.assign(this.config, partial);
    }
}

export class MacOSTTSProvider implements TTSProvider {
    readonly name = "macos";

    buildCommand(text: string, opts: TTSProviderOpts): string {
        const escaped = text.replace(/'/g, "'\\''");
        const parts = ["say"];
        if (opts.voice) parts.push(`-v ${opts.voice}`);
        if (opts.rate) parts.push(`-r ${opts.rate}`);
        if (opts.outputFile) parts.push(`-o ${opts.outputFile}`);
        parts.push(`'${escaped}'`);
        return parts.join(" ");
    }
}
