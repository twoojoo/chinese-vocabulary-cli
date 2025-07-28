import fs from "fs"

export class Store {
	private data: StoreData = { decks: {} }

	constructor(json: string) {
		this.data = JSON.parse(json)
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

	addDeckWord(name: string, word: string, data: DeckWordData): void {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" already exists in deck "${name}".`)
		}

		this.data.decks[name].words[word] = data
		this.persist()
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

	updateDeckWord(name: string, word: string, data: DeckWordData): void {
		if (!this.data.decks[name]) {
			throw new Error(`Deck with name "${name}" does not exist.`)
		}
		if (!this.data.decks[name].words[word]) {
			throw new Error(`Word "${word}" does not exist in deck "${name}".`)
		}

		this.data.decks[name].words[word] = data
		this.persist()
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
}

export type StoreData = {
	decks: Record<string, Deck>
}

export type Deck = {
	words: Record<string, DeckWordData>
	description?: string
}

export type DeckWordData = {
	sentence?: string
	definition?: string
	comment?: string
	pinyin?: string
}

export function getStore(): Store {
	try {
		const data = fs.readFileSync("store.json", "utf8")
		return new Store(data)
	} catch (error: any) {
		if (error.code === "ENOENT") {
			const deck = JSON.stringify({ decks: {} }, null, 2)
			fs.writeFileSync("store.json", deck)
			return new Store(deck)
		} else {
			throw error
		}
	}
}