import { Notice } from "obsidian";

export async function copy(content: string) {
    await navigator.clipboard.writeText(content).then(
        () => new Notice("Copied to clipboard"),
        () => new Notice("Could not copy to clipboard")
    );
}