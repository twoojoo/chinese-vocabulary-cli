# Hanzi-CLI

This is a CLI tool to create and manage your personal knowledge of chinese characters and words.

## Main features

- Create decks of words
- Use LLM to enrich your Chinese knowledge
- Generate phrases from your deck
- Test your knowledge on words and phrases in different ways

## Introduction

Hanzi-CLI allows to handle these resources:

- `decks`: collection of words and/or phrases
- `words`: single chinese words inside a deck
- `phrases`: phrases generated from words inside a deck

## Installation

```bash
npm install -g hanzi-cli

# or usage through npx
npx hanzi-cli
```

## Usage

Type `hanzi-cli --help` to see the available commands and options.

### Show decks commands

```bash
hzcli decks --help
```

#### list

```bash
hzcli decks list
```

List all available decks.

#### add

```bash
hzcli decks add <deck-name>
```

Add a new deck with the specified name.

### Show words commands

> If no deck is specified, the default deck will be used.

```bash
hzcli words --help
```

#### list

```bash
hzcli words list -d <deck-name>
```

List all words in a specific deck.

#### add

```bash
hzcli words add -d <deck-name> <chinese-word>

# example: hzcli words add 中国
```

Add a new word to the specified deck.

### Show phrases commands

```bash
hzcli phrases --help
```
