import { Command } from "commander";
import { getStore } from "./Store";
import table from "as-table"
import fs from "fs"

export const deck = new Command("deck")
	.alias("decks")
	.alias("dk")
	.alias("d")
	.description("Manage your decks")


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

deck.command("merge <source> <dest>")
	.alias("m")
	.description("Merge the source deck into the destination deck")
	.option("-d, --delete-source", "Delete the source deck after merging", false)
	.action((deck1, deck2, options) => {
		try {
			const store = getStore()
			store.mergeDecks(deck2, deck1, options.deleteSource || false)
		} catch (err: any) {
			console.error(err.message)
		}
	})

deck.command("clone <source> <dest>")
	.alias("c")
	.description("Clone the source deck into a new destination deck")
	.action((deck1, deck2) => {
		try {
			const store = getStore()
			store.cloneDeck(deck2, deck1)
		} catch (err: any) {
			console.error(err.message)
		}
	})

deck.command("export [name]")
	.alias("e")
	.description("Export the specified deck to a JSON file named <name>.json")
	.option("-f, --force", "Force export even if the file already exists", false)
	.action((name, options) => {
		try {
			if (!name) name = "default"
			//check if file already exists
			const output = `${name}.json`
			if (fs.existsSync(output) && !options.force) {
				throw new Error(`File "${output}" already exists. Please choose a different name or remove the existing file.`)
			}

			const store = getStore()
			const deck = store.getDeck(name)
			fs.writeFileSync(output, JSON.stringify(deck, null, 2))

			console.log(`Deck "${name}" exported successfully to "${output}".`)
		} catch (err: any) {
			console.error(err.message)
		}
	})

deck.command("import <input>")
	.alias("i")
	.description("Import a deck from a JSON file")
	.option("-m, --merge", "Merge the imported deck with an existing one if it exists", false)
	.option("-r, --replace", "Replace the existing deck with the imported one", false)
	.action((input, options) => {
		try {
			if (!input.endsWith(".json")) {
				throw new Error("Input file must be a .json file.")
			}

			const name = input.split(".json")[0]
			const store = getStore()
			const deckData = JSON.parse(fs.readFileSync(input, "utf8"))

			store.importDeck(name, deckData, options.merge || false, options.replace || false)

			console.log(`Deck ${name} imported successfully from "${input}".`)
		} catch (err: any) {
			console.error(err.message)
		}
	})

