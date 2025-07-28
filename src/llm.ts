import { ChatOpenAI } from "@langchain/openai";
import { DeckPhrase, DeckWordData } from "./store";

export class LLM {
	constructor(private apiKey: string) {}

	private checkApiKey() {
		if (!this.apiKey) {
			throw new Error("API key is required for LLM operations.");
		}
	}

	async generatePhrase(words: string[], prevPhrases: string[], word?: string, about?: string): Promise<{
		phrase: string;
		pinyin: string;
		translation: string;
		meaningful: boolean;
		note: string;
	}> {
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
		${about ? `The phrase must also be about: ${about}` : ""} 
		If the provided words are not sufficient to form a meaningful phrase, phrase MUST be an empty string.
		${prevPhrases.length ? `If the phrase matches the concepts of one of these previously generated phrases: ${prevPhrases.join(", ")}, phrase MUST be an empty string.}` : ""}
		Output must be a JSON string with these keys:
		"phrase" (the generated chinese characters phrase, or the empty string)
		"pinyin" (the pinyin transcription of the phrase with correct tones and spaces only for words, not single characters)
		"translation" (the english translation of the phrase.)
		"meaningful" (boolean indicating if the phrase is meaningful, true or false. you can consider as meaningful even simple phrases)
		"note" (any additional note about the phrase, such as the way the concepts translate if the translation is not literal, or an empty string if there is no need for notes).
		Just return the JSON string without any prefix or postfix text.`
	
		const response = await chat.invoke([{ role: "user", content: prompt, }]);
		const jsonResp = JSON.parse(response.content.toString().trim())

		if (!jsonResp.meaningful || !jsonResp.phrase) {
			jsonResp.phrase = "";
			jsonResp.pinyin = "";
			jsonResp.translation = "";
			jsonResp.note = "";
		}

		return jsonResp;
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
			"definition" (literal translation of the word in English. If more than one transaltion, seprate them with commas+space. Don't add anything else here),
			"note": (if the literal translation does not fully capture the meaning, provide a brief explanation of the word's usage or context, otherwise just an empty string),
			"pinyin" (the pinyin transcription of the word with the correct tone), 
			"tone" (1, 2, 3, 4 or "-" for neutral tone)
			"sentence" (a brief example sentence that uses that word).
			"sentencePinyin" (the pinyin transcription of the example sentence with the correct tones),
			"sentenceTranslation" (the translation of the example sentence in English)
			"sentenceDefinition" (if the translation is not literal, explain the meaning, otherwise just an empty string).
			Just return the JSON string without any prefix or postfix text.

		In the note be as musch brief as possible, eg:
		instead of "Used as a third-person singular feminine pronoun in Chinese"
		say "third-person singular feminine pronoun"
	`;

		const response = await chat.invoke([{ role: "user", content: prompt }]);
		
		try {
			return JSON.parse(response.content.toString());
		} catch (err) {
			throw new Error("Failed to parse response from LLM.");
		}
	}
}