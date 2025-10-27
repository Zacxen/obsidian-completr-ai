import { App, PluginSettingTab, Setting } from "obsidian";
import CompletrPlugin from "./main";

export default class CompletrSettingsTab extends PluginSettingTab {

    private plugin: CompletrPlugin;

    constructor(app: App, plugin: CompletrPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): any {
        const { containerEl } = this;

        containerEl.empty();

        new Setting(containerEl)
            .setName("Word character regex")
            .setDesc("A regular expression which matches a character of a word. Used during completion to find the word to the left of the cursor.")
            .addText(text => text
                .setValue(this.plugin.settings.characterRegex)
                .onChange(async val => {
                    try {
                        new RegExp("[" + val + "]+").test("");
                        text.inputEl.removeClass("completr-settings-error");
                        this.plugin.settings.characterRegex = val;
                        await this.plugin.saveSettings();
                    } catch (e) {
                        text.inputEl.addClass("completr-settings-error");
                    }
                }));

        new Setting(containerEl)
            .setName("Maximum look back distance")
            .setDesc("How many characters to look back when determining the current word.")
            .addText(text => {
                text.inputEl.type = "number";
                text
                    .setValue(this.plugin.settings.maxLookBackDistance + "")
                    .onChange(async val => {
                        if (!val || val.length < 1)
                            return;

                        this.plugin.settings.maxLookBackDistance = parseInt(val);
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Auto focus")
            .setDesc("Whether the popup is automatically focused once it opens.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoFocus)
                .onChange(async val => {
                    this.plugin.settings.autoFocus = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Auto trigger")
            .setDesc("Whether the popup opens automatically when typing.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.autoTrigger)
                .onChange(async val => {
                    this.plugin.settings.autoTrigger = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Add space after completed word")
            .setDesc("When enabled, a space will be added after a word has been completed.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.insertSpaceAfterComplete)
                .onChange(async val => {
                    this.plugin.settings.insertSpaceAfterComplete = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Insert period after double space")
            .setDesc("When enabled, a period is added after a completed word if a space is added after an automatic space.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.insertPeriodAfterSpaces)
                .onChange(async val => {
                    this.plugin.settings.insertPeriodAfterSpaces = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("LaTeX provider")
            .setHeading();

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc("Whether or not the LaTeX provider is enabled")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.latexProviderEnabled)
                .onChange(async val => {
                    this.plugin.settings.latexProviderEnabled = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Trigger in code blocks")
            .setDesc("Whether the LaTeX provider should trigger after dollar signs enclosed in code blocks.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.latexTriggerInCodeBlocks)
                .onChange(async val => {
                    this.plugin.settings.latexTriggerInCodeBlocks = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Ignore case")
            .setDesc("Whether the LaTeX provider should ignore the casing of the typed text.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.latexIgnoreCase)
                .onChange(async val => {
                    this.plugin.settings.latexIgnoreCase = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Minimum word trigger length")
            .setDesc("The minimum length a query has to be, to trigger LaTeX suggestions.")
            .addText(text => {
                text.inputEl.type = "number";
                text
                    .setValue(this.plugin.settings.latexMinWordTriggerLength + "")
                    .onChange(async val => {
                        if (!val || val.length < 1)
                            return;

                        this.plugin.settings.latexMinWordTriggerLength = parseInt(val);
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("LLM provider")
            .setHeading();

        new Setting(containerEl)
            .setName("Enabled")
            .setDesc("Whether completions should be requested from the configured LLM endpoint.")
            .addToggle(toggle => toggle
                .setValue(this.plugin.settings.llmProviderEnabled)
                .onChange(async val => {
                    this.plugin.settings.llmProviderEnabled = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Completions URL")
            .setDesc("The HTTP endpoint used for LLM completions.")
            .addText(text => text
                .setValue(this.plugin.settings.llmCompletionsUrl)
                .onChange(async val => {
                    this.plugin.settings.llmCompletionsUrl = val;
                    await this.plugin.saveSettings();
                }));

        new Setting(containerEl)
            .setName("Max tokens")
            .setDesc("The maximum number of tokens to request from the LLM.")
            .addText(text => {
                text.inputEl.type = "number";
                text
                    .setValue(this.plugin.settings.llmMaxTokens + "")
                    .onChange(async val => {
                        if (!val || val.length < 1)
                            return;

                        this.plugin.settings.llmMaxTokens = parseInt(val);
                        await this.plugin.saveSettings();
                    });
            });

        new Setting(containerEl)
            .setName("Temperature")
            .setDesc("Sampling temperature passed to the LLM.")
            .addText(text => {
                text.inputEl.type = "number";
                text.inputEl.step = "0.1";
                text
                    .setValue(this.plugin.settings.llmTemperature + "")
                    .onChange(async val => {
                        if (!val || val.length < 1)
                            return;

                        this.plugin.settings.llmTemperature = parseFloat(val);
                        await this.plugin.saveSettings();
                    });
            });
    }
}
