import { EditorPosition, EditorSuggestContext } from "obsidian";
import { CompletrSettings } from "../settings";
import { maybeLowerCase } from "../editor_helpers";

export class Suggestion {
    displayName: string;
    replacement: string;
    overrideStart?: EditorPosition;
    overrideEnd?: EditorPosition;
    icon?: string;
    color?: string;
    private partialOriginal?: string;
    private partialRemaining?: string | null;

    constructor(displayName: string, replacement: string, overrideStart?: EditorPosition, overrideEnd?: EditorPosition, opts?: {
        icon?: string,
        color?: string,
        partialText?: string,
    }) {
        this.displayName = displayName;
        this.replacement = replacement;
        this.overrideStart = overrideStart;
        this.overrideEnd = overrideEnd;
        this.icon = opts?.icon;
        this.color = opts?.color;
        if (opts?.partialText !== undefined) {
            this.partialOriginal = opts.partialText;
            this.partialRemaining = opts.partialText;
        }
    }

    static fromString(suggestion: string, overrideStart?: EditorPosition): Suggestion {
        return new Suggestion(suggestion, suggestion, overrideStart);
    }

    getDisplayNameLowerCase(lowerCase: boolean): string {
        return maybeLowerCase(this.displayName, lowerCase);
    }

    derive(options: Partial<typeof this>) {
        const derived = new Suggestion(
            options.displayName ?? this.displayName,
            options.replacement ?? this.replacement,
            options.overrideStart ?? this.overrideStart,
            options.overrideEnd ?? this.overrideEnd,
            {
                icon: options.icon ?? this.icon,
                color: options.color ?? this.color,
                partialText: this.partialOriginal,
            }
        );

        return derived;
    }

    hasPartialText(): boolean {
        return this.partialRemaining !== undefined;
    }

    hasPartialRemaining(): boolean {
        return this.partialRemaining !== undefined && this.partialRemaining !== null && this.partialRemaining.length > 0;
    }

    consumeNextPartialChunk(): string | null {
        if (this.partialRemaining === undefined)
            return null;

        const remaining = this.partialRemaining ?? "";
        if (remaining.length === 0) {
            this.partialRemaining = null;
            return null;
        }

        const match = remaining.match(/^[^ \t\n\r.,!?;:]+[ \t\n\r.,!?;:]?/);
        const chunk = match ? match[0] : remaining.charAt(0);
        this.partialRemaining = remaining.substring(chunk.length);
        if (this.partialRemaining.length === 0) {
            this.partialRemaining = null;
        }

        return chunk;
    }

    getPartialRemaining(): string {
        if (this.partialRemaining === undefined || this.partialRemaining === null)
            return "";

        return this.partialRemaining;
    }
}

export interface SuggestionContext extends EditorSuggestContext {
    separatorChar: string;
}

export interface SuggestionProvider {
    blocksAllOtherProviders?: boolean,

    getSuggestions(context: SuggestionContext, settings: CompletrSettings): Suggestion[] | Promise<Suggestion[]>,
}
