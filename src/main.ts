import { Notice, Plugin } from 'obsidian';
import { authorReg, citeRegex } from 'src/contants';
import { copy } from 'src/util';
import { SampleSettingTab } from './SampleSettingTab';

interface Cites2PandocSettings { }

const DEFAULT_SETTINGS: Cites2PandocSettings = {}

declare module 'obsidian' {
	interface App {
		plugins: {
			plugins: {
				'obsidian-citation-plugin': {
					library: {
						entries: {
							[id: string]: {
								data: {
									id: string,
									// abstract?: string,
									// accessed?: any,
									author?: {
										family?: string,
										given?: string,
										literal?: string
									}[],
									// DOI?: string,
									// ISSN?: string,
									// issue?: string,
									issued?: { 'date-parts': number[][] },
									// language?: string,
									// note?: string,
									// page?: string,
									// source?: string,
									// title?: string,
									// type?: string,
									// URL?: string,
									// volume?: string,
								}
							}
						}
					}
				}
			}
		}
	}
}
export default class Cites2PandocPlugin extends Plugin {
	settings: Cites2PandocSettings;

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		this.addCommand({
			id: 'cites2Pandoc',
			name: 'Convert cites2Pandoc and copy to clipboard',
			callback: this.cites2Pandoc
		});

		this.addSettingTab(new SampleSettingTab(this.app, this));
	}

	cites2Pandoc = async () => {
		// Get Citations plugin library
		let entries = this.app.plugins.plugins['obsidian-citation-plugin']?.library?.entries
		if (!entries) { new Notice('Please enable the Citations plugin'); return }
		let refs = Object.values(entries).map(entry => entry.data)

		// Read current file
		const currFile = this.app.workspace.getActiveFile()
		const content = await this.app.vault.cachedRead(currFile)

		const cites = content.match(citeRegex)
		console.log({ cites })

		let replacements = content.slice()
		if (cites) {
			const citeMap = cites.map((cite) => {
				const firstAuthor = cite.match(authorReg)[0];
				const year = cite.match(/\d{4}/g)[0]
				return { cite, firstAuthor, year };
			});
			console.log({ citeMap })

			// Replace cites with pandoc cites
			citeMap.forEach(cite => {
				console.log({ cite })
				const matchingRef = refs.find(ref =>
					ref.author?.some(author =>
						author?.family === cite.firstAuthor ||
						author?.literal === cite.firstAuthor
					)
					&&
					ref.issued['date-parts'][0][0].toString() === cite.year)
				if (matchingRef) {
					const panCite = `[@${matchingRef.id}]`
					replacements = replacements.replaceAll(`(${cite.cite})`, panCite)
				}
			})
			console.log(replacements)
		} else {
			
		}


		// Latex → Pandoc
		replacements = replacements.replaceAll(/\\cite\{(.+?)\}/g, '[@$1]')
		copy(replacements)
	}
	onunload() {
		console.log('unloading plugin');
	}

	async loadSettings() {
		this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
	}

	async saveSettings() {
		await this.saveData(this.settings);
	}
}

