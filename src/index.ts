import { Command } from "commander"
import { DeckWordData, getStore } from "./store.js"
import table from "as-table"

const cli = new Command("zzcli")

const deck = new Command("deck")
	.alias("d")
	.description("Manage your decks")

const word = new Command("word")
	.alias("w")
	.description("Manage your words")

const phrase = new Command("phrase")
	.alias("p")
	.description("Manage your phrases")

const llm = new Command("llm")
	.description("Manage LLM operations")

deck.command("add <name>")
	.alias("a")
	.description("Add a new deck with the given name")
	.option("-d, --description <description>", "Description of the deck")
	.action((name, options) => {
		try {
			const store = getStore()
			store.addDeck(name, options.description)
		} catch (err: any) {
			console.error(err.message)
		}
	})
	
deck.command("remove <name>")
	.alias("rm")
	.description("Remove the deck with the given name")
	.action((name) => {
		try {
			const store = getStore()
			store.removeDeck(name)
		} catch (err: any) {
			console.error(err.message)
		}
	})

deck.command("list")
	.alias("ls")
	.description("List all decks")
	.action(() => {
		try {
			const store = getStore()
			const decks = store.listDecks()
			if (Object.keys(decks).length === 0) {
				console.log("No decks available.")
			} else {
				console.log(table(Object.entries(decks).map(([name, deck]) => ({
					Name: name,
					Description: deck.description || "-",
					Words: Object.keys(deck.words).length
				}))))
			}
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("add <word>")
	.alias("a")
	.description("Add a word to the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.option("-c, --comment <comment>", "Comment about the word")
	.option("-l, --level <level>", "Level of the word (1-10, -1 to unset level)", parseWordLevel, -1)
	.action(async (word, options) => {
		try {
			const store = getStore()
			const wordData = await store.addDeckWord(options.deck, word, options.comment, options.level)
			printWords({ [word]: wordData })
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("set-level <word> <level>")
	.alias("sl")
	.description("Set the level of a word in the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.action(async (word, level, options) => {

		try {
			const store = getStore()
			let wordData = store.getDeckWord(options.deck, word)
			wordData.level = parseWordLevel(level)
			wordData = store.updateDeckWord(options.deck, word, wordData)
			printWords({ [word]: wordData })
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("remove <word>")
	.alias("rm")
	.description("Remove a word from the specified deck")
	.option("-d, --deck <deck>", "Deck to remove the word from", "default")
	.action((word, options) => {
		try {
			const store = getStore()
			store.removeDeckWord(options.deck, word)	
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("comment <word> <comment>")
	.description("Add/Change comment for a word in the specified deck")
	.option("-d, --deck <deck>", "Deck to add the comment to", "default")
	.action((word, options) => {
		try {
			if (!word) word = "-"

			const store = getStore()
			const wordData = store.getDeckWord(options.deck, word)
			wordData.comment = wordData.comment || "-"

			store.setWordCommenct(options.deck, word, wordData.comment)
			printWords({ [word]: wordData })
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("list")
	.alias("ls")
	.description("List all words in the specified deck")
	.option("-d, --deck <deck>", "Deck to list words from", "default")
	.action((options, as) => {
		try {
			const store = getStore()
			const words = store.listDeckWords(options.deck)
			if (Object.keys(words).length === 0) {
				console.log(`No words available in deck "${options.deck}".`)
			} else {
				printWords(words)
			}
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("count")
	.alias("c")
	.description("Count all words in the specified deck")
	.option("-d, --deck <deck>", "Deck to count words in", "default")
	.action(options => {
		try {
			const store = getStore()
			const words = store.listDeckWords(options.deck)
			console.log((Object.keys(words).length || 0).toString())
		} catch (err: any) {
			console.error(err.message)
		}
	})

phrase.command("generate")
	.alias("gen")
	.description("Generate a phrase using words from the specified deck")
	.option("-d, --deck <deck>", "Deck to generate phrase from", "default")
	.option("-w, --word <word>", "Include a specific word in the phrase")
	.action(async (options) => {
		try {
			const store = getStore()
			const words = store.listDeckWords(options.deck)
			if (Object.keys(words).length === 0) {
				console.log(`No words available in deck "${options.deck}".`)
				return
			}
			const wordList = Object.keys(words)
			const phrase = await store.generateDeckPhrase(options.deck, wordList, options.word)
			if (phrase) {
				console.log(`Generated phrase: ${phrase}`)
			} else {
				console.log("No meaningful phrase could be generated with the provided words.")
			}
		} catch (err: any) {
			console.error(err.message)
		}
	})

llm.command("set-key <api-key>")
	.alias("sk")
	.action((apiKey) => {
		try {
			const store = getStore()
			store.setLlmApiKey(apiKey)
			console.log("LLM API key set successfully.")
		} catch (err: any) {
			console.error(err.message)
		}
	})

cli.addCommand(llm)
cli.addCommand(word)
cli.addCommand(phrase)
cli.addCommand(deck)
cli.parse()

function printWords(words: Record<string, DeckWordData>) {
	console.log(table(Object.entries(words).map(([name, word]) => ({
		Name: name,
		Pinyin: word.pinyin || "-",
		Tone: word.tone || "-",
		Definition: word.definition || "-",
		["Example Sentence"]: word.sentence || "-",
		["Sentence Pinyin"]: word.sentencePinyin || "-",
		["Sentence Translation"]: word.sentenceTranslation || "-",
		["Sentence Definition"]: word.sentenceDefinition || "-",
		Level: word.level >= 0 ? word.level.toString() : "-",
		Comment: word.comment || "-",
	}))))
}

function parseWordLevel(level: string): number {
	const parsed = parseInt(level, 10)
	if (isNaN(parsed) || parsed < -1 || parsed > 10) {
		throw new Error("Level must be a number between -1 (not set) and 10 (max confidence).")
	}
	return parsed
}