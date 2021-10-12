import { App, PluginSettingTab, Setting } from 'obsidian';
import Cites2PandocPlugin from './main';

export class SampleSettingTab extends PluginSettingTab {
    plugin: Cites2PandocPlugin;

    constructor(app: App, plugin: Cites2PandocPlugin) {
        super(app, plugin);
        this.plugin = plugin;
    }

    display(): void {
        let { containerEl } = this;

        containerEl.empty();

        // containerEl.createEl('h2', { text: 'Settings for my awesome plugin.' });


    }
}
