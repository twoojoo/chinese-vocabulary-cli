import { ChatOpenAI } from "@langchain/openai";
import { DeckWordData } from "./store";

export class LLM {
	constructor(private apiKey: string) {}

	private checkApiKey() {
		if (!this.apiKey) {
			throw new Error("API key is required for LLM operations.");
		}
	}

	async generatePhrase(words: string[], word?: string): Promise<string> {
		this.checkApiKey();

		if (words.length === 0) {
			throw new Error("No words provided for phrase generation.");
		}

		const chat = new ChatOpenAI({
			model: "gpt-4.1-nano",
			apiKey: this.apiKey,
			maxTokens: 100,
			temperature: 0.7,
		});


		let prompt = `Generate a phrase in chinese simplified using the following words and characters: ${words.join(", ")}${word ? `, and include the word "${word}".` : ""}. 
		If the provided words are not sufficient to form a meaningful phrase, please return an empty string. Do not include any explanations or additional text in your response.`;
	
		const response = await chat.invoke([{ role: "user", content: prompt, }]);
		
		return response.content.toString().trim();
	}

	async getWordData(word: string): Promise<DeckWordData> {
		this.checkApiKey();

		if (!word) {
			throw new Error("Word is required to fetch data.");
		}

		const chat = new ChatOpenAI({
			model: "gpt-4.1-nano",
			apiKey: this.apiKey,
			maxTokens: 100,
			temperature: 0.7,
		});

		const prompt = `Provide the definition and pinyin for the word "${word}" in Chinese Simplified. Format your response as JSON with keys 
			"definition" (just the transalation if it's a simple meaning, or a brief definition if it's more complex), 
			"pinyin" (the pinyin transcription of the word with the correct tone), 
			"tone" (1, 2, 3, 4 or "-" for neutral tone)
			"sentence" (a brief example sentence that uses that word).
			"sentencePinyin" (the pinyin transcription of the example sentence with the correct tones),
			"sentenceTranslation" (the translation of the example sentence in English)
			"sentenceDefinition" (if the translation is not literal, explain the meaning, otherwise just "-").
			Just return the JSON string without any prefix or postfix text.`;

		const response = await chat.invoke([{ role: "user", content: prompt }]);
		
		try {
			return JSON.parse(response.content.toString());
		} catch (err) {
			throw new Error("Failed to parse response from LLM.");
		}
	}
}