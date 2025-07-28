import fs from "fs";
import path from "path";
import { LLM } from "./llm";

export class Store {
	private metadata: StoreMetadata = { llmApiKey: "", decks: [] };
	private llm: LLM;

	private deckFolder = path.resolve("decks");

	constructor(json: string) {
		this.metadata = JSON.parse(json);
		this.llm = new LLM(this.metadata.llmApiKey || process.env.OPENAI_API_KEY || "");
		if (!fs.existsSync(this.deckFolder)) fs.mkdirSync(this.deckFolder);
	}

	private getDeckPath(name: string): string {
		return path.join(this.deckFolder, `${name}.json`);
	}

	private loadDeck(name: string): Deck {
		const filePath = this.getDeckPath(name);
		if (!fs.existsSync(filePath)) {
			throw new Error(`Deck with name "${name}" does not exist.`);
		}
		const content = fs.readFileSync(filePath, "utf8");
		return JSON.parse(content);
	}

	private saveDeck(name: string, deck: Deck): void {
		fs.writeFileSync(this.getDeckPath(name), JSON.stringify(deck, null, 2), "utf8");
	}

	private deleteDeckFile(name: string): void {
		fs.unlinkSync(this.getDeckPath(name));
	}

	private persistMetadata(): void {
		fs.writeFileSync("store.json", JSON.stringify(this.metadata, null, 2), "utf8");
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
		if (!this.metadata.decks.includes(name)) {
			throw new Error(`Deck with name "${name}" does not exist.`);
		}
		return this.loadDeck(name);
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
	if (!fs.existsSync("store.json")) {
		fs.writeFileSync("store.json", JSON.stringify(baseMetadata, null, 2));
	}

	if (!fs.existsSync("decks")) {
		fs.mkdirSync("decks");
	}

	const defaultDeckPath = path.join("decks", "default.json");
	if (!fs.existsSync(defaultDeckPath)) {
		fs.writeFileSync(defaultDeckPath, JSON.stringify(defaultDeck, null, 2));
	}

	const json = fs.readFileSync("store.json", "utf8");
	return new Store(json);
}
