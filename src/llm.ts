import { getStore } from "./store";
import { Command } from "commander";

export const llm = new Command("llm")
	.description("Manage LLM operations")


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