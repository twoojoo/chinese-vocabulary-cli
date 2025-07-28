import { Command } from "commander"
import { getStore } from "./store.js"
import table from "as-table"

const cli = new Command("zhongcli")

const deck = new Command("deck")
	.description("Manage your decks")

const word = new Command("word")
	.description("Manage your words")

deck.command("add <name>")
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

word.command("add <deck> <word>")
	.description("Add a word to the specified deck")
	.option("-d, --definition <definition>", "Definition of the word")
	.option("-s, --sentence <sentence>", "Example sentence using the word")
	.option("-p, --pinyin <pinyin>", "Pinyin representation of the word")
	.option("-c, --comment <comment>", "Comment about the word")
	.action((deck, word, options) => {
		try {
			const store = getStore()
			store.addDeckWord(deck, word, {
				definition: options.definition,
				sentence: options.sentence,
				pinyin: options.pinyin,
				comment: options.comment
			})
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("remove <deck> <word>")
	.description("Remove a word from the specified deck")
	.action((deck, word) => {
		try {
			const store = getStore()
			store.removeDeckWord(deck, word)	
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("list <deck>")
	.description("List all words in the specified deck")
	.action((deck) => {
		try {
			const store = getStore()
			const words = store.listDeckWords(deck)
			if (Object.keys(words).length === 0) {
				console.log(`No words available in deck "${deck}".`)
			} else {
				console.log(table(Object.entries(words).map(([name, word]) => ({
					Name: name,
					Pinyin: word.pinyin || "-",
					Definition: word.definition || "-",
					Sentence: word.sentence || "-",
					Comment: word.comment || "-",
				}))))
			}
		} catch (err: any) {
			console.error(err.message)
		}
	})

deck.addCommand(word)
cli.addCommand(deck)
cli.parse()