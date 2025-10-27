import { requestUrl } from "obsidian";
import { CompletrSettings } from "../settings";
import { Suggestion, SuggestionContext, SuggestionProvider } from "./provider";

interface LLMChoice {
    text?: string;
    completion?: string;
}

interface LLMResponse {
    choices?: LLMChoice[];
}

class LLMCompletionProvider implements SuggestionProvider {
    private lastRequestKey: string | null = null;
    private cachedSuggestions: Suggestion[] = [];
    private pendingRequest: Promise<Suggestion[]> | null = null;

    async getSuggestions(context: SuggestionContext, settings: CompletrSettings): Promise<Suggestion[]> {
        if (!settings.llmProviderEnabled)
            return [];

        if (!settings.llmCompletionsUrl)
            return [];

        const prompt = context.editor.getValue();
        if (!prompt?.trim())
            return [];

        const cursorKey = `${context.start.line}:${context.start.ch}`;
        const requestKey = `${cursorKey}:${hashString(prompt)}`;

        if (this.lastRequestKey === requestKey && this.cachedSuggestions.length > 0)
            return this.cachedSuggestions;

        if (this.pendingRequest && this.lastRequestKey === requestKey)
            return this.pendingRequest;

        this.lastRequestKey = requestKey;
        this.pendingRequest = this.fetchSuggestions(prompt, settings)
            .then((suggestions) => {
                this.cachedSuggestions = suggestions;
                this.pendingRequest = null;
                return suggestions;
            })
            .catch((error) => {
                console.error("Failed to fetch LLM suggestions", error);
                this.cachedSuggestions = [];
                this.pendingRequest = null;
                return [];
            });

        return this.pendingRequest;
    }

    private async fetchSuggestions(prompt: string, settings: CompletrSettings): Promise<Suggestion[]> {
        try {
            const payload = {
                prompt: prompt,
                max_tokens: settings.llmMaxTokens,
                temperature: settings.llmTemperature,
            };

            console.log("LLM provider sending request", {
                url: settings.llmCompletionsUrl,
                payload,
            });

            const response = await requestUrl({
                url: settings.llmCompletionsUrl,
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
