import { Command } from "commander";
import { getStore } from "./store";

export const phrase = new Command("phrase")
	.alias("p")
	.description("Manage your phrases")

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