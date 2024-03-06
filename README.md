# Torn Scripts

Various scripts I use for [Torn City](https://www.torn.com/1605235), an online text based MMO. Note not all scripts are maintained equally, and some may become out of date due to various API changes. Also of note is there are many rate limits in place in the code using a helper sleep function. These limits are what work for my own uses to avoid Torn rate limiting, and may be different for you.

## Setup
These scripts requires Node.js

1. Download / Clone the project
2. Copy `settings-template.json` to `settings.json` and fill in the required information
3. Navigate to `/node/scripts/` and run `node [script]` where `[script]` is the name of a file, ex. `node bazaarWatcher.js`

You can also run it in a docker container (example using bazaar watcher):
`docker run -it --rm --name torn-bazaar-watcher -v "$PWD":/usr/src/app -w /usr/src/app node:8 node src/scripts/bazaarWatcher.js`

## Scripts

- [Bazaar Watcher](/src/scripts/bazaarWatcher.js) - Monitors active bazaars, and notifies if a configured item is listed for less than a configured threshold.  
- [Chain Targets](/src/scripts/chainTargets.js) - Goes through your most recent attacks and notifies if the fair fight value was greater than a configured value.  
- [Get All Users](/src/scripts/getAllUsers.js) - Traverses through a range of IDs, and if the user is active, adds them to a JSON file.