import fs from "fs";
import path from "path";
import { LLM } from "./model";
import zlib from "zlib"
import { GREEN_TICK } from "./utils";

const linuxConfigPath = path.join(process.env.HOME || "~", ".hzcli");
const windowsConfigPath = path.join(process.env.APPDATA || "~", "hzcli");
const configPath = process.platform === "win32" ? windowsConfigPath : linuxConfigPath;
const defaultDecksPath = __dirname

export class Store {
	private metadata: StoreMetadata = { llmApiKey: "", decks: [] };
	private llm: LLM;
	private deckFolder: string = path.join(configPath, "decks");;
	private storePath: string = path.join(configPath, "store.json");

	constructor(json: string) {
		this.metadata = JSON.parse(json);
		this.llm = new LLM(this.metadata.llmApiKey || process.env.OPENAI_API_KEY || "");
		if (!fs.existsSync(this.deckFolder)) {
			fs.mkdirSync(this.deckFolder);
		}
	}

	private getDeckPath(name: string): string {
		return path.join(this.deckFolder, `${name}.json`);
	}

	private loadDeck(name: string): Deck {
		const filePath = this.getDeckPath(name);
		if (!fs.existsSync(filePath)) {
			throw new Error(`Deck with name "${name}" does not exist.`);
		}

		let content = fs.readFileSync(filePath, "utf8");

		if (!content) {
			throw new Error(`Deck file "${name}" is empty or corrupted.`);
		}

		return JSON.parse(content);
	}

	private saveDeck(name: string, deck: Deck): void {
		const content = JSON.stringify(deck)
		if (!content) {
			throw new Error(`Cannot save empty deck "${name}".`);
		}

		fs.writeFileSync(this.getDeckPath(name), content, "utf8");
	}

	private deleteDeckFile(name: string): void {
		fs.unlinkSync(this.getDeckPath(name));
	}

	private persistMetadata(): void {
		fs.writeFileSync(this.storePath, JSON.stringify(this.metadata, null, 2), "utf8");
	}

	setLlmApiKey(apiKey: string): void {
		this.metadata.llmApiKey = apiKey;
		this.llm = new LLM(apiKey);
		this.persistMetadata();
	}

	listDecks(): Record<string, Deck> {
		const decks: Record<string, Deck> = {};
		for (const name of this.metadata.decks) {
			decks[name] = this.loadDeck(name);
		}
		return decks;
	}

	getDeck(name: string): Deck {
		if (!(this.metadata.decks || []).includes(name)) {
			throw new Error(`Deck with name "${name}" does not exist.`);
		}
		return this.loadDeck(name);
	}

	mergeDecks(targetName: string, sourceName: string, deleteSource: boolean): void {
		if (!this.metadata.decks.includes(targetName)) {
			throw new Error(`Target deck "${targetName}" does not exist.`);
		}
		if (!this.metadata.decks.includes(sourceName)) {
			throw new Error(`Source deck "${sourceName}" does not exist.`);
		}

		const targetDeck = this.loadDeck(targetName);
		const sourceDeck = this.loadDeck(sourceName);

		for (const word in sourceDeck.words) {
			if (!targetDeck.words[word]) {
				targetDeck.words[word] = sourceDeck.words[word];
			}
		}

		this.saveDeck(targetName, targetDeck);
		
		if (deleteSource) {
			this.deleteDeckFile(sourceName);
		}

		this.metadata.decks = this.metadata.decks.filter(d => d !== sourceName);
		this.persistMetadata();
	}

	importDeck(name: string, deck: Deck, merge: boolean, replace: boolean): void {
		if (this.hasDeck(name)) {
			if (merge && replace) {
				throw new Error(`Deck with name "${name}" already exists. Use merge or replace, not both.`);
			}	

			if (merge) {
				this.saveDeck(name + "-temp", deck);
				this.mergeDecks(name, name + "-temp", true);
				this.metadata.decks.push(name);
				this.persistMetadata();
				return
			}

			if (replace) {
				this.deleteDeckFile(name);
			} else {
				throw new Error(`Deck with name "${name}" already exists. Use merge or replace.`);
			}
		}

		this.saveDeck(name, deck);
		this.metadata.decks.push(name);
		this.persistMetadata();
	}

	cloneDeck(targetName: string, sourceName: string): void {
		if (this.hasDeck(targetName)) {
			throw new Error(`Deck with name "${targetName}" already exists.`);
		}
		if (!this.metadata.decks.includes(sourceName)) {
			throw new Error(`Source deck "${sourceName}" does not exist.`);
		}

		const sourceDeck = this.loadDeck(sourceName);
		const clonedDeck: Deck = {
			words: { ...sourceDeck.words },
			phrases: { ...sourceDeck.phrases },
			description: sourceDeck.description
		};

		this.saveDeck(targetName, clonedDeck);
		this.metadata.decks.push(targetName);
		this.persistMetadata();
	}

	hasDeck(name: string): boolean {
		return this.metadata.decks.includes(name);
	}

	addDeck(name: string, description?: string): void {
		if (this.hasDeck(name)) {
			throw new Error(`Deck with name "${name}" already exists.`);
		}
		const deck: Deck = { words: {}, description: description || "" };
		this.metadata.decks.push(name);
		this.saveDeck(name, deck);
		this.persistMetadata();
	}

	removeDeck(name: string): void {
		if (name === "default") {
			throw new Error("Cannot remove the default deck.");
		}
		if (!this.hasDeck(name)) {
			throw new Error(`Deck with name "${name}" does not exist.`);
		}
		this.metadata.decks = this.metadata.decks.filter(d => d !== name);
		this.deleteDeckFile(name);
		this.persistMetadata();
	}

	getDeckWord(name: string, word: string): DeckWordData {
		const deck = this.loadDeck(name);
		const wordData = deck.words[word];
		if (!wordData) throw new Error(`Word "${word}" does not exist in deck "${name}".`);
		return wordData;
	}

	setWordCommenct(name: string, word: string, comment: string): void {
		const deck = this.loadDeck(name);
		if (!deck.words[word]) throw new Error(`Word "${word}" does not exist in deck "${name}".`);
		deck.words[word].comment = comment;
		this.saveDeck(name, deck);
	}

	async addDeckWord(name: string, word: string, comment: string, level: number): Promise<DeckWordData> {
		const deck = this.loadDeck(name);
		if (deck.words[word]) throw new Error(`Word "${word}" already exists in deck "${name}".`);

		const data = await this.llm.getWordData(word);
		data.translations = data.translations?.map(t => t.trim()) || [];
		data.comment = comment || data.comment || "";
		data.level = level ?? -1;
		data.createdAt = new Date().toISOString();

		deck.words[word] = data;
		this.saveDeck(name, deck);
		return data;
	}

	removeDeckWord(name: string, word: string): void {
		const deck = this.loadDeck(name);
		if (!deck.words[word]) throw new Error(`Word "${word}" does not exist in deck "${name}".`);
		delete deck.words[word];
		this.saveDeck(name, deck);
	}

	updateDeckWord(name: string, word: string, data: DeckWordData): DeckWordData {
		const deck = this.loadDeck(name);
		if (!deck.words[word]) throw new Error(`Word "${word}" does not exist in deck "${name}".`);
		deck.words[word] = data;
		this.saveDeck(name, deck);
		return data;
	}

	deckHasWord(name: string, word: string): boolean {
		const deck = this.loadDeck(name);
		return !!deck.words[word];
	}

	listDeckWords(name: string): Record<string, DeckWordData> {
		const deck = this.loadDeck(name);
		return deck.words;
	}

	async generateDeckPhrase(name: string, words: string[], prevPhrases: string[], word?: string): Promise<[string, DeckPhrase]> {
		const deck = this.loadDeck(name);
		if (words.length === 0) throw new Error("No words provided for phrase generation.");

		const genPhrase = await this.llm.generatePhrase(words, prevPhrases, word);
		if (genPhrase.phrase.trim() === "") {
			throw Error("No more meaningful phrase could be generated with the provided words.");
		}

		return [genPhrase.phrase, {
			pinyin: genPhrase.pinyin,
			translation: genPhrase.translation,
			note: genPhrase.note || ""
		}];
	}
}

export type StoreMetadata = {
	llmApiKey?: string;
	decks: string[];
};

export type Deck = {
	words: Record<string, DeckWordData>;
	phrases?: Record<string, DeckPhrase>;
	description?: string;
};

export type DeckWordData = {
	sentence: string;
	tone: string;
	note: string;
	sentenceTranslation: string;
	translations: string[];
	comment: string;
	pinyin: string;
	sentencePinyin: string;
	sentenceDefinition: string;
	level: number;
	createdAt: string;
};

export type DeckPhrase = {
	pinyin: string;
	translation: string;
	note?: string;
};

const baseMetadata: StoreMetadata = {
	decks: ["default"]
};

const defaultDeck: Deck = {
	words: {},
	phrases: {},
	description: "Default Deck"
};

export function getStore(): Store {
	const storePath = path.join(configPath, "store.json")
	const deckFolder = path.join(configPath, "decks");

	// CREATE STORE FILE
	if (!fs.existsSync(storePath)) {
		if (!fs.existsSync(configPath)) {
			fs.mkdirSync(configPath, { recursive: true });
		}
		fs.writeFileSync(storePath, JSON.stringify(baseMetadata, null, 2));
	}

	// CREATE DECKS FOLDER
	if (!fs.existsSync(deckFolder)) {
		fs.mkdirSync(deckFolder);
	}

	// CREATE DEFAULT DECK
	const defaultDeckPath = path.join(deckFolder, "default.json");
	if (!fs.existsSync(defaultDeckPath)) {
		fs.writeFileSync(defaultDeckPath, JSON.stringify(defaultDeck, null, 2));
	}

	// LOAD BASE DECKS
	const defaultDekcs = fs.readdirSync(path.join(defaultDecksPath, "base_decks"))
		.filter(file => file.endsWith(".json"))
		.map(file => path.basename(file, ".json"));

	for (const deckName of defaultDekcs) {
		const deckPath = path.join(deckFolder, `${deckName}.json`);
		if (!fs.existsSync(deckPath)) {
			const deckContent = fs.readFileSync(path.join(defaultDecksPath, "base_decks", `${deckName}.json`), "utf8");
			fs.writeFileSync(deckPath, deckContent, "utf8");
			baseMetadata.decks.push(deckName);
			fs.writeFileSync(storePath, JSON.stringify(baseMetadata, null, 2), "utf8");
			console.debug(GREEN_TICK, `Added base deck: ${deckName}`);
		}
	}

	// LOAD STORE FILE
	const json = fs.readFileSync(storePath, "utf8");
	return new Store(json);
}
