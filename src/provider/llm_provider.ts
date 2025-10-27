import { EditorPosition, requestUrl } from "obsidian";
import { CompletrSettings } from "../settings";
import { Suggestion, SuggestionContext, SuggestionProvider } from "./provider";

interface LLMRequestSettings {
    url: string;
    maxTokens: number;
    temperature: number;
}

interface PendingRequest {
    key: string;
    prompt: string;
    settings: LLMRequestSettings;
}

interface LLMChoice {
    text?: string;
    completion?: string;
}

interface LLMResponse {
    choices?: LLMChoice[];
}

class LLMCompletionProvider implements SuggestionProvider {
    private lastSuccessfulRequestKey: string | null = null;
    private cachedSuggestions: Suggestion[] = [];
    private inFlightPromise: Promise<Suggestion[]> | null = null;
    private queuedRequest: PendingRequest | null = null;
    private queuePromise: Promise<Suggestion[]> | null = null;

    async getSuggestions(context: SuggestionContext, settings: CompletrSettings): Promise<Suggestion[]> {
        if (!settings.llmProviderEnabled)
            return [];

        if (!settings.llmCompletionsUrl)
            return [];

        const cursorPosition = context.start ?? context.editor.getCursor();
        const prompt = this.getPromptUpToCursor(context, cursorPosition);
        if (!prompt?.trim())
            return [];

        const cursorKey = `${cursorPosition.line}:${cursorPosition.ch}`;
        const requestKey = `${cursorKey}:${hashString(prompt)}`;

        if (this.lastSuccessfulRequestKey === requestKey && this.cachedSuggestions.length > 0)
            return this.cachedSuggestions;

        const requestSettings: LLMRequestSettings = {
            url: settings.llmCompletionsUrl,
            maxTokens: settings.llmMaxTokens,
            temperature: settings.llmTemperature,
        };

        const pendingRequest: PendingRequest = {
            key: requestKey,
            prompt,
            settings: requestSettings,
        };

        if (!this.inFlightPromise)
            return this.startRequest(pendingRequest);

        this.queuedRequest = pendingRequest;

        if (!this.queuePromise) {
            const queuePromise = this.inFlightPromise.then(() => {
                const next = this.queuedRequest;
                this.queuedRequest = null;
                if (!next)
                    return this.cachedSuggestions;
                return this.startRequest(next);
            });

            let cleanupPromise: Promise<Suggestion[]>;
            cleanupPromise = queuePromise.then((result) => {
                if (this.queuePromise === cleanupPromise)
                    this.queuePromise = null;
                return result;
            });

            this.queuePromise = cleanupPromise;
        }

        return this.queuePromise;
    }

    private startRequest(request: PendingRequest): Promise<Suggestion[]> {
        const fetchPromise = this.fetchSuggestions(request);
        const finalPromise = fetchPromise.finally(() => {
            if (this.inFlightPromise === finalPromise)
                this.inFlightPromise = null;
        });

        this.inFlightPromise = finalPromise;
        return finalPromise;
    }

    private getPromptUpToCursor(context: SuggestionContext, cursor: EditorPosition): string {
        const startOfDocument: EditorPosition = { line: 0, ch: 0 };
        return context.editor.getRange(startOfDocument, cursor);
    }

    private async fetchSuggestions(request: PendingRequest): Promise<Suggestion[]> {
        try {
            const payload = {
                prompt: request.prompt,
                max_tokens: request.settings.maxTokens,
                temperature: request.settings.temperature,
            };

            console.log("LLM provider sending request", {
                url: request.settings.url,
                payload,
            });

            const response = await requestUrl({
                url: request.settings.url,
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            });

            console.log("LLM provider received response", {
                status: response.status,
                headers: response.headers,
                text: response.text,
            });

            const data: LLMResponse = typeof response.json === "object" ? response.json : JSON.parse(response.text);
            const choices = data.choices ?? [];
            const suggestions = choices
                .map((choice) => {
                    const text = (choice.text ?? choice.completion ?? "").trimStart();
                    if (!text)
                        return null;
                    return new Suggestion(
                        text,
                        text,
                        undefined,
                        undefined,
                        { partialText: text }
                    );
                })
                .filter((suggestion): suggestion is Suggestion => suggestion != null);

            this.lastSuccessfulRequestKey = request.key;
            this.cachedSuggestions = suggestions;

            if (suggestions.length === 0)
                return [];

            return suggestions;
        } catch (error) {
            console.error("LLM provider request failed", error);
            return [];
        }
    }
}

function hashString(value: string): number {
    let hash = 0;
    for (let i = 0; i < value.length; i++) {
        hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
    }
    return hash;
}

export const LLMProvider = new LLMCompletionProvider();
