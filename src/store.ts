import fs from "fs"
import { LLM } from "./llm"

export class Store {
	private data: StoreData = { decks: {} }
	private llm: LLM = new LLM("");

	constructor(json: string) {
		this.data = JSON.parse(json)
		this.llm = new LLM(this.data.llmApiKey || process.env.OPENAI_API_KEY || "");
	}

	setLlmApiKey(apiKey: string): void {
		this.data.llmApiKey = apiKey
		this.llm = new LLM(apiKey);
		this.persist()
	}

	listDecks(): Record<string, Deck> {
		return this.data.decks
	}

	getDeck(name: string): Deck {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		return this.data.decks[name]
	}

	hasDeck(name: string): boolean {		
		return !!this.data.decks[name]
	}

	removeDeck(name: string): void {
		if (name === "default") {
			throw new Error("Cannot remove the default deck.")
		}

		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}

		this.persist()
		delete this.data.decks[name]
	}

	addDeck(name: string, description?: string): void {
		if (this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" already exists.`)
		}

		this.data.decks[name] = { words: {}, description: description || "" }
		this.persist()
	}

	getDeckWord(name: string, word: string): DeckWordData {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (!this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" does not exist in deck "${name}".`)
		}

		return this.data.decks[name].words[word]
	}

	setWordCommenct(name: string, word: string, comment: string): void {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (!this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" does not exist in deck "${name}".`)
		}

		this.data.decks[name].words[word].comment = comment
		this.persist()
	}

	async addDeckWord(name: string, word: string, comment: string, level: number): Promise<DeckWordData> {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" already exists in deck "${name}".`)
		}

		const data = await this.llm.getWordData(word)
		data.translations = data.translations?.map(t => t.trim()) || []
		data.comment = comment || data.comment || ""
		data.level = level ?? -1;
		data.createdAt = new Date().toISOString();

		this.data.decks[name].words[word] = data
		this.persist()
		return data
	}

	removeDeckWord(name: string, word: string): void {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (!this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" does not exist in deck "${name}".`)
		}

		delete this.data.decks[name].words[word]
		this.persist()
	}

	updateDeckWord(name: string, word: string, data: DeckWordData): DeckWordData {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (!this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" does not exist in deck "${name}".`)
		}

		this.data.decks[name].words[word] = data
		this.persist()
		return data
	}

	deckHasWord(name: string, word: string): boolean {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		return !!this.data.decks[name].words[word]
	}

	listDeckWords(name: string): Record<string, DeckWordData> {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}

		return this.data.decks[name].words
	}

	private persist(): void {
		try {
			const json = JSON.stringify(this.data, null, 2)
			fs.writeFileSync("store.json", json, "utf8")
		} catch (err) {
			console.error("Error persisting store:", err)
			throw err
		}
	}

	async generateDeckPhrase(name: string, words: string[], prevPhrases: string[], word?: string): Promise<[string, DeckPhrase]> {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}

		if (words.length === 0) {
			throw new Error("No words provided for phrase generation.")
		}

		const genPhrase = await this.llm.generatePhrase(words, prevPhrases, word)

		if (genPhrase.phrase.trim() === "") {
			throw Error("No more meaningful phrase could be generated with the provided words.")
		}
		return [genPhrase.phrase, {
			pinyin: genPhrase.pinyin,
			translation: genPhrase.translation,
			note: genPhrase.note || ""
		}]
	}
}

export type StoreData = {
	llmApiKey?: string
	decks: Record<string, Deck>
}

export type Deck = {
	words: Record<string, DeckWordData>
	phrases?: Record<string, DeckPhrase>
	description?: string
}

export type DeckWordData = {
	sentence: string
	tone: string
	note: string
	sentenceTranslation: string
	translations: string[]
	comment: string
	pinyin: string
	sentencePinyin: string
	sentenceDefinition: string
	level: number
	createdAt: string
}

export type DeckPhrase = {
	pinyin: string
	translation: string
	note?: string
}

const baseStore: StoreData = {
	decks: {
		default: {
			words: {},
			phrases: {},
			description: "Default Deck"
		}
	}
}

export function getStore(): Store {
	try {
		const data = fs.readFileSync("store.json", "utf8")
		return new Store(data)
	} catch (error: any) {
		if (error.code === "ENOENT") {
			const deck = JSON.stringify(baseStore, null, 2)
			fs.writeFileSync("store.json", deck)
			return new Store(deck)
		} else {
			throw error
		}
	}
}