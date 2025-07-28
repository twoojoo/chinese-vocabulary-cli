import { Command } from "commander"
import { DeckWordData, getStore } from "./store.js"
import table from "as-table"
import readline from "readline"

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

word.command("reset")
	.description("Reset the word store for the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.action(async (options) => {
		try {
			const store = getStore()
			const wordData = store.listDeckWords(options.deck)
			for (const word of Object.keys(wordData)) {
				store.removeDeckWord(options.deck, word)
			}
			console.log(`All words in deck "${options.deck}" have been reset.`)
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

word.command("level-up <word>")
	.alias("up")
	.description("Increase the level of a word in the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.action(async (word, options) => {
		try {
			const store = getStore()
			let wordData = store.getDeckWord(options.deck, word)
			wordData.level = Math.min(wordData.level + 1, 10) // Cap level at 10
			wordData = store.updateDeckWord(options.deck, word, wordData)
			printWords({ [word]: wordData })
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("level-down <word>")
	.alias("down")
	.description("Decrease the level of a word in the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.action(async (word, options) => {
		try {
			const store = getStore()
			let wordData = store.getDeckWord(options.deck, word)
			wordData.level = Math.max(wordData.level - 1, 0) // Cap level at 
			wordData = store.updateDeckWord(options.deck, word, wordData)
			printWords({ [word]: wordData })
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("unset-level <word>")
	.alias("ul")
	.description("Unset the level of a word in the specified deck")
	.option("-d, --deck <deck>", "Deck to add the word to", "default")
	.action((word, options) => {
		try {
			const store = getStore()
			let wordData = store.getDeckWord(options.deck, word)
			wordData.level = -1 // Unset level
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
	.option("-l, --level <level>", "Filter words by level (1-10, -1 for unset)")
	.action((options) => {
		try {
			const store = getStore()
			let words = store.listDeckWords(options.deck)

			if (parseInt(options.level) >= -1 && parseInt(options.level) <= 10 && !isNaN(parseInt(options.level))) {
				const level = parseWordLevel(options.level.toString())
				words = Object.fromEntries(
					Object.entries(words).filter(([_, word]) => word.level === level)
				)
			}

			if (Object.keys(words).length === 0) {
				console.log(`No words available in deck "${options.deck}".`)
			} else {
				printWords(words)
			}
		} catch (err: any) {
			console.error(err.message)
		}
	})

word.command("test")
	.option("-k, --kind", "Test kind", "mixed")
	.option("-d, --deck <deck>", "Deck to test words from", "default")
	.option("-n, --number <number>", "Number of words to test", parseInt, 10)
	.action(async (options) => {
		try {
			const store = getStore()
			const words = store.listDeckWords(options.deck)
			if (Object.keys(words).length === 0) {
				console.log(`No words available in deck "${options.deck}".`)
				return
			}

			const allWords: string[] = Object.keys(words)
			const successWords: string[] = []
			const pinyinErrors: string[] = []
			const englishErrors: string[] = []
			const chineseErrors: string[] = []
			const sentenceErrors: string[] = []

			for (let i = 0; i < options.number; i++) {
				const randomIndex = Math.floor(Math.random() * allWords.length)
				const word = allWords[randomIndex]
				const wordData = words[word]

				const testKind = options.kind != "mixed" 
					? options.kind 
					: Math.random() < 0.25
						? "pinyin" // given character, guess pinyin
						: Math.random() < 0.33
							? "english" // given character, guess english translation
							: Math.random() < 0.5
								? "chinese" // given pinyin, guess chinese characters
								: "sentence" // given char and pinyin, create meaningful sentence 

				switch (testKind) {
					case "pinyin": {
						const response = await askQuestion(`What is the pinyin for "${word}"? `)
						if (response.trim().toLowerCase() === wordData.pinyin.toLowerCase()) {
							successWords.push(word)
							console.log(`Correct! Pinyin for "${word}" is "${wordData.pinyin}".`)
						} else {
							pinyinErrors.push(word)
							console.log(`Incorrect! The correct pinyin is "${wordData.pinyin}".`)
						}
					}
					case "english": {
						const response = await askQuestion(`What is the English translation for "${word}"? `)
						if (response.trim().toLowerCase().includes(wordData.definition.toLowerCase())) {
							successWords.push(word)
							console.log(`Correct! The translation for "${word}" is "${wordData.definition}".`)
						} else {
							englishErrors.push(word)
							console.log(`Incorrect! The correct translation is "${wordData.definition}".`)
						}
					}
				}

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
	.option("-n, --number <number>", "Number of words to use in the phrase")
	.action(async (options) => {
		if (options.number < 1 || isNaN(options.number)) {
			options.number = 1
		}

		const alreadyGenerated: string[] = []

		try {
			for (let i = 0; i < (options.number || 1); i++) {
				const store = getStore()
				const words = store.listDeckWords(options.deck)
				if (Object.keys(words).length === 0) {
					console.log(`No words available in deck "${options.deck}".`)
					return
				}
				const wordList = Object.keys(words)
				const [phrase, phraseData] = await store.generateDeckPhrase(options.deck, wordList, alreadyGenerated, options.word)
				alreadyGenerated.push(phrase)

				console.log(`Phrase: ${phrase}`)
				console.log(`Pinyin: ${phraseData.pinyin}`)
				console.log(`Translation: ${phraseData.translation}`)
				console.log(`Note: ${phraseData.note || "-"}`)

				if (options.number > 1 && i < (options.number || 1) - 1) {
					console.log("---")
				}
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
		Translations: word.definition || "-",
		Note: word.note || "-",
		["Example Sentence"]: word.sentence || "-",
		["Sentence Pinyin"]: word.sentencePinyin || "-",
		["Sentence Translation"]: word.sentenceTranslation || "-",
		["Sentence Definition"]: word.sentenceDefinition || "-",
		Level: word.level >= 0 ? word.level.toString() : "-",
		Comment: word.comment || "-",
		Created: word.createdAt ? new Date(word.createdAt).toLocaleDateString("en-US") : "-"
	}))))
}

function parseWordLevel(level: string): number {
	const parsed = parseInt(level, 10)
	if (isNaN(parsed) || parsed < -1 || parsed > 10) {
		throw new Error("Level must be a number between -1 (not set) and 10 (max confidence).")
	}
	return parsed
}

function askQuestion(question: string): Promise<string> {
	return new Promise((resolve) => {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout
		});
		rl.question(question, (answer) => {
			rl.close();
			resolve(answer);
		});
	});
}