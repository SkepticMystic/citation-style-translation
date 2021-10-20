import { Notice, Plugin } from "obsidian";
import { authorReg, citeRegex } from "src/contants";
import { copy } from "src/util";
import { CSTSettingTab } from "./CSTSettingTab";

interface CSTSettings {}
interface Entry {
  id: string;
  author?: Author[];
  issued?: { "date-parts": number[][] };
}
interface Author {
  family?: string;
  given?: string;
  literal?: string;
}

const DEFAULT_SETTINGS: CSTSettings = {};

declare module "obsidian" {
  interface App {
    plugins: {
      plugins: {
        "obsidian-citation-plugin": {
          library: {
            entries: {
              [id: string]: {
                data: Entry;
              };
            };
          };
        };
      };
    };
  }
}
export default class CSTPlugin extends Plugin {
  settings: CSTSettings;

  async onload() {
    console.log("loading plugin");

    await this.loadSettings();

    this.addCommand({
      id: "cites2Pandoc",
      name: "Convert cites2Pandoc and copy to clipboard",
      callback: this.cites2Pandoc,
    });
    this.addCommand({
      id: "Pandoc2Cites",
      name: "Convert Pandoc2Cites and copy to clipboard",
      callback: this.Pandoc2Cites,
    });

    this.addSettingTab(new CSTSettingTab(this.app, this));
  }

  async getSelectionText() {
    var text = "";
    if (window.getSelection) {
      text = window.getSelection().toString();
    }
    if (text !== "") {
      return text;
    } else {
      const currFile = this.app.workspace.getActiveFile();
      return await this.app.vault.cachedRead(currFile);
    }
  }

  getCitationEntries() {
    let entries =
      this.app.plugins.plugins["obsidian-citation-plugin"]?.library?.entries;
    if (!entries) {
      new Notice("Please enable the Citations plugin");
      return;
    }
    let refs = Object.values(entries).map((entry) => entry.data);
    return refs;
  }

  authorName = (author: Author) => {
    if (author.family) {
      return author.family;
    } else if (author.literal) {
      return author.literal;
    }
  };

  /**
   * Given a `citekey` grab the corresponding in-text citation (no brackets)
   * @param  {string} citekey
   * @param  {Entry[]} refs
   * @returns {string} `Author & Another et al., Year`
   */
  citekey2inText(citekey: string, refs: Entry[]): string {
    const ref = refs.find((ref) => ref.id === citekey);
    if (!ref) return;

    const year = ref.issued["date-parts"][0][0];
    let authorStr: string;

    if (ref.author.length <= 2) {
      authorStr = ref.author.map(this.authorName).join(" & ");
    } else {
      authorStr = `${this.authorName(ref.author[0])} et al.`;
    }
    console.log({ year, authorStr });

    return `${authorStr}, ${year}`;
  }

  Pandoc2Cites = async () => {
    const content = await this.getSelectionText();
    const refs = this.getCitationEntries();
    if (!refs) {
      return;
    }

    // Array of pandoc citations: `['[@1]', '[@2]', ...]`
    const pandocCites = content.match(/\[@.+?\]/g);

    let replacement = content.slice();
    pandocCites.forEach((pCite) => {
      let currBracket = "";
      const keys = pCite.replace(/\[(.+?)\]/, "$1");
      const splitKeys = keys.split(";");

      if (splitKeys.length > 1) {
        // Multi-bracket
        splitKeys.forEach((key, i) => {
          const citekey = key.trim().slice(1);
          const intextCite = this.citekey2inText(citekey, refs);
          if (i === 0) {
            currBracket += `(${intextCite}; `;
          } else if (i !== splitKeys.length - 1) {
            currBracket += `${intextCite}; `;
          } else {
            currBracket += `${intextCite})`;
          }
        });
        replacement = replacement.replaceAll(pCite, currBracket);
      } else {
        // Single bracket
        const citekey = splitKeys[0].slice(1);
        const intextCite = `(${this.citekey2inText(citekey, refs)})`;
        replacement = replacement.replaceAll(pCite, intextCite);
      }
    });
    console.log({ replacement });
    copy(replacement);
  };

  cites2Pandoc = async () => {
    const content = await this.getSelectionText();
    const refs = this.getCitationEntries();
    if (!refs) {
      return;
    }

    const cites = content.match(citeRegex);
    console.log({ cites });

    let replacements = content.slice();
    if (cites) {
      const citeMap = cites.map((original) => {
        const firstAuthor = original.match(authorReg)[0];
        const year = original.match(/\d{4}/g)[0];
        return { original, firstAuthor, year };
      });
      console.log({ citeMap });

      // Replace cites with pandoc cites
      citeMap.forEach((cite, i) => {
        const matchingRef = refs.filter(
          (ref) =>
            ref.author?.some(
              (author) =>
                author?.family === cite.firstAuthor ||
                author?.literal === cite.firstAuthor
            ) && ref.issued["date-parts"][0][0].toString() === cite.year
        );

        if (matchingRef.length === 0) {
          return;
        } else if (matchingRef.length === 1) {
          console.log({ matchingRef });
          const { original } = cite;
          const { id } = matchingRef[0];
          if (
            // Start of a multi-cite
            original.endsWith(";") &&
            (!citeMap[i - 1] || !citeMap[i - 1].original.endsWith(";"))
          ) {
            replacements = replacements.replaceAll(`(${original}`, `[@${id};`);
          } else if (
            // Middle of a multi-cite
            original.endsWith(";") &&
            citeMap[i - 1].original.endsWith(";")
          ) {
            replacements = replacements.replaceAll(original, `@${id};`);
          } else if (
            // End of a multi-cite
            !original.endsWith(";") &&
            citeMap[i - 1]?.original.endsWith(";")
          ) {
            replacements = replacements.replaceAll(`${original})`, `@${id}]`);
          } else {
            // Regular cite
            replacements = replacements.replaceAll(`(${original})`, `[@${id}]`);
          }
        } else {
          new Notice(
            `More than one possible reference was found for ${cite.original}. It has been skipped.`
          );
          return;
        }
      });
      console.log(replacements);
    } else {
      return;
    }

    // Latex → Pandoc
    replacements = replacements.replaceAll(/\\cite\{(.+?)\}/g, "[@$1]");
    copy(replacements);
  };
  onunload() {
    console.log("unloading plugin");
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);
  }
}
