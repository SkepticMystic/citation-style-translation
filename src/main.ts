import { Notice, Plugin } from 'obsidian';
import { authorReg, citeRegex } from 'src/contants';
import { copy } from 'src/util';
import { CSTSettingTab } from './CSTSettingTab';

interface CSTSettings { }

const DEFAULT_SETTINGS: CSTSettings = {}

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
export default class CSTPlugin extends Plugin {
	settings: CSTSettings;

	async onload() {
		console.log('loading plugin');

		await this.loadSettings();

		this.addCommand({
			id: 'cites2Pandoc',
			name: 'Convert cites2Pandoc and copy to clipboard',
			callback: this.cites2Pandoc
		});
		this.addCommand({
			id: 'Pandoc2Cites',
			name: 'Convert Pandoc2Cites and copy to clipboard',
			callback: this.Pandoc2Cites
		});

		this.addSettingTab(new CSTSettingTab(this.app, this));
	}

	async getSelectionText() {
		var text = "";
		if (window.getSelection) {
			text = window.getSelection().toString();
		}

		if (text !== '') {
			return text
		} else {
			// Read current file
			const currFile = this.app.workspace.getActiveFile()
			return (await this.app.vault.cachedRead(currFile))
		}
	}

	getCitationEntries() {
		let entries = this.app.plugins.plugins['obsidian-citation-plugin']?.library?.entries
		if (!entries) { new Notice('Please enable the Citations plugin'); return }
		let refs = Object.values(entries).map(entry => entry.data)
		return refs
	}

	Pandoc2Cites = async () => {
		const content = await this.getSelectionText()
		console.log({ content })
		const refs = this.getCitationEntries()
		if (!refs) { return }

		const pandocCites = content.match(/\[@.+?\]/g)
		console.log({ pandocCites })

		let replacement = content.slice();

		pandocCites.forEach(pCite => {
			const key = pCite.replace(/\[@(.+?)\]/, '$1')
			const ref = refs.find(ref => ref.id === key)
			if (!ref) return
			console.log({ pCite, key, ref })
			const year = ref.issued['date-parts'][0][0]
			let authorStr: string;

			if (ref.author.length <= 2) {
				const authorArr: string[] = ref.author.map(author => {
					if (author.family) {
						return author.family
					} else if (author.literal) {
						return author.literal
					}
				})
				authorStr = authorArr.join(' & ')
			} else if (ref.author.length > 2) {
				if (ref.author[0].family) {
					authorStr = `${ref.author[0].family} et al.`
				} else if (ref.author[0].literal) {
					authorStr = `${ref.author[0].literal} et al.`
				}

			}
			console.log({ year, authorStr })
			const intextCite = `(${authorStr}, ${year})`
			replacement = replacement.replaceAll(pCite, intextCite)
		})
		console.log({ replacement })
		copy(replacement)
	}


	cites2Pandoc = async () => {
		const content = await this.getSelectionText()
		console.log({ content })
		const refs = this.getCitationEntries()
		if (!refs) { return }

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

