import { Command } from "commander";
import { getStore } from "./Store";
import {
	askQuestion, 
	compareStrings, 
	GREEN_TICK, 
	isStringIncludedInArray, 
	parseTone, 
	parseWordLevel, 
	printWords, 
	RED_CROSS
} from "./utils";

export const word = new Command("word")
	.alias("words")
	.alias("wd")
	.alias("w")
	.description("Manage your words")

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

word.command("copy <word> <source> <dest>")
	.alias("cp")
	.description("Copy a word from one deck to another")
	.option("-f, --force", "Force copy even if the word already exists in the destination deck", false)
	.action((word, source, dest, options) => {
		try {
			const store = getStore()
			const copiedWordData = store.copyDeckWord(source, dest, word, options.force || false)
			printWords({ [word]: copiedWordData })
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


word.command("test")
	.description("Test your knowledge of words in the specified deck")
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

			let allTestCases: Record<string, string[]> = {
				["chinese-pinyin"]: Object.keys(words).filter(word => words[word].pinyin && words[word].pinyin.length > 0),
				["chinese-english"]: Object.keys(words).filter(word => words[word].translations.length > 0),
				["english-chinese"]: Object.keys(words).filter(word => words[word].translations.length > 0),
				["english-pinyin"]: Object.keys(words).filter(word => words[word].pinyin && words[word].pinyin.length > 0)
			}

			let errors: Record<string, string[]> = {
				["chinese-pinyin"]: [],
				["chinese-english"]: [],
				["english-chinese"]: [],
				["english-pinyin"]: [],
			}


			if (options.kind != "mixed") {
				if (!Object.keys(allTestCases).includes(options.kind)) {
					throw new Error(`Unknown test kind: ${options.kind}. Available kinds: ${Object.keys(allTestCases).join(", ")}`)
				}

				allTestCases = {
					[options.kind]: allTestCases[options.kind]
				}
			} 

			const successWords: string[] = []
			let count = 0

			for (let i = 0; i < options.number; i++) {
				if (i > 0) {
					console.log()
				}

				const remainingTestCases = Object.values(allTestCases).reduce((acc, arr) => acc + arr.length, 0)
				if (remainingTestCases < 1) {
					console.log("No more words available for testing in this deck.")
					break
				}

				count++

				const testKindIdx = Math.floor(Math.random() * Object.keys(allTestCases).length)
				const testKind = Object.keys(allTestCases)[testKindIdx]
				const wordIndex = Math.floor(Math.random() * allTestCases[testKind].length)

				const word = allTestCases[testKind][wordIndex]
				const wordData = words[word]
				
				allTestCases[testKind].splice(wordIndex, 1) // Remove the tested word from the list
				if (allTestCases[testKind].length === 0) {
					delete allTestCases[testKind] // Remove the test kind if no words left
				}

				switch (testKind) {
					case "chinese-pinyin": {
						const response = await askQuestion(`${i + 1}. What is the pinyin for "${word}"? `)
						if (parseTone(response.trim()) === wordData.pinyin.toLowerCase()) {
							successWords.push(word)
							console.log(GREEN_TICK, `Correct! Pinyin for "${word}" is "${wordData.pinyin}".`)
						} else {
							errors["chinese-pinyin"].push(word)
							console.log(RED_CROSS, `Incorrect! The correct pinyin is "${wordData.pinyin}".`)
						}
						break;
					}
					case "chinese-english": {
						const response = await askQuestion(`${i + 1}. What is the English translation for "${word}"? `)

						if (isStringIncludedInArray(wordData.translations, response)) {
							successWords.push(word)
							console.log(GREEN_TICK, `Correct! The translation for "${word}" is "${response}" ${wordData.translations.length ? "(" + wordData.translations.join(", ") + ")" : ""}.`)
						} else {
							errors["chinese-english"].push(word)
							console.log(RED_CROSS, `Incorrect! The correct translation/s is/are ${wordData.translations.join(", ")}".`)
						}
						break;
					}
					case "english-chinese": {
						const response = await askQuestion(`${i + 1}. What are the Chinese characters for ${wordData.translations.join(", ")}? `)

						if (compareStrings(response, word)) {
							successWords.push(word)
							console.log(GREEN_TICK, `Correct! The Chinese characters for "${wordData.translations.join(", ")}" is "${word}".`)
						} else {
							errors["english-chinese"].push(word)
							console.log(RED_CROSS, `Incorrect! The correct characters are "${word}".`)
						}
						break;
					}
					case "english-pinyin": {
						const response = await askQuestion(`${i + 1}. What is the pinyin for ${wordData.translations.join(", ")}? `)

						if (compareStrings(parseTone(response), wordData.pinyin)) {
							successWords.push(word)
							console.log(GREEN_TICK, `Correct! The pinyin for "${wordData.translations.join(", ")}" is "${wordData.pinyin}".`)
						} else {
							errors["english-pinyin"].push(word)
							console.log(RED_CROSS, `Incorrect! The correct pinyin is "${wordData.pinyin}".`)
						}
						break;
					}
					default: {
						throw new Error(`Unknown test kind: ${testKind}`)
					}
				}
			}

			const totalErrors = Object.values(errors).reduce((acc, arr) => acc + arr.length, 0)

			console.log(`\nTest completed!`)
			console.log(`Total words tested: ${count}`)
			console.log(GREEN_TICK, `Successfully answered: ${successWords.length} words`)
			console.log(RED_CROSS, `Total errors: ${totalErrors} words`)
			console.log(`Chinese → Pinyin errors: ${errors["chinese-pinyin"].length} words`)
			console.log(`Chinese → English errors: ${errors["chinese-english"].length} words`)
			console.log(`English → Chinese errors: ${errors["english-chinese"].length} words`)
			console.log(`English → Pinyin errors: ${errors["english-pinyin"].length} words`)
		} catch (err: any) {
			console.error(err)
			console.error(err.message)
		}
	})