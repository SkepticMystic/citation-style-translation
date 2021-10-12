import { App, PluginSettingTab } from 'obsidian';
import CSTPlugin from './main';

export class CSTSettingTab extends PluginSettingTab {
    plugin: CSTPlugin;

    constructor(app: App, plugin: CSTPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        // containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });


    }
}
