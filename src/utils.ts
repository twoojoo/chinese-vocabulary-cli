import asTable from "as-table";
import { DeckWordData } from "./Store";
import readline from "readline";

export function printWords(words: Record<string, DeckWordData>) {
	console.log(asTable(Object.entries(words).map(([name, word]) => ({
		Name: name,
		Pinyin: word.pinyin || "-",
		Tone: word.tone || "-",
		Translations: word.translations || "-",
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

export function parseWordLevel(level: string): number {
	const parsed = parseInt(level, 10)
	if (isNaN(parsed) || parsed < -1 || parsed > 10) {
		throw new Error("Level must be a number between -1 (not set) and 10 (max confidence).")
	}
	return parsed
}

export function askQuestion(question: string): Promise<string> {
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

export function compareStrings(str1: string, str2: string): boolean {
	return str1.trim().toLowerCase() === str2.trim().toLowerCase();
}

export function isStringIncludedInArray(arr: string[], str: string): boolean {
	return arr.some(item => compareStrings(item, str));
}


export function parseTone(pinyin: string): string {
	const vowels = ['a', 'e', 'i', 'o', 'u', 'ü'];

	const vowelTones: Record<string, string[]> = {
		a: ["a", 'ā', 'á', 'ǎ', 'à'],
		e: ["e", 'ē', 'é', 'ě', 'è'],
		i: ["i", 'ī', 'í', 'ǐ', 'ì'],
		o: ["o", 'ō', 'ó', 'ǒ', 'ò'],
		u: ["u", 'ū', 'ú', 'ǔ', 'ù'],
		'ü': ["ü", 'ǖ', 'ǘ', 'ǚ', 'ǜ']
	}

	// 1: AA
	// 2: aA
	// 3: AaA
	// 4: Aa

	//detect if any vowel is written as a combination of those ones (1 to 4)
	if (!pinyin || pinyin.length === 0) {
		return "";
	}

	let tone = 0
	let str = ""
	for (const vowel of vowels) {
		if (pinyin.includes(vowel.toUpperCase() + vowel.toUpperCase())) {
			tone = 1;
			str = pinyin.replace(new RegExp(vowel.toUpperCase() + vowel.toUpperCase(), 'g'), vowelTones[vowel][tone]);
			break;
		}

		if (pinyin.includes(vowel + vowel.toLowerCase())) {
			tone = 2;
			str = pinyin.replace(new RegExp(vowel + vowel.toLowerCase(), 'g'), vowelTones[vowel][tone]);
			break;
		}

		if (pinyin.includes(vowel.toUpperCase() + vowel + vowel.toUpperCase())) {
			tone = 3;
			str = pinyin.replace(new RegExp(vowel.toUpperCase() + vowel + vowel.toUpperCase(), 'g'), vowelTones[vowel][tone]);
			break;
		}

		if (pinyin.includes(vowel.toUpperCase() + vowel)) {
			str = pinyin.replace(new RegExp(vowel.toUpperCase() + vowel, 'g'), vowelTones[vowel][0]);
			tone = 4;
			break;
		}
	}

	return str
}


export const GREEN_TICK = "\x1b[32m✓\x1b[0m"
export const RED_CROSS = "\x1b[31m✗\x1b[0m"
