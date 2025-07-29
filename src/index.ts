import { Command } from "commander"
import { deck } from "./deck.js"
import { llm } from "./llm.js"
import { word } from "./word.js"
import { phrase } from "./phrase.js"

const cli = new Command("zzcli")

cli.addCommand(llm)
cli.addCommand(word)
cli.addCommand(phrase)
cli.addCommand(deck)

cli.parse()
