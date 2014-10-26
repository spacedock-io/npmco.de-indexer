# npm-code-search
Code search feature for npm.

## Installation

You need ElasticSearch installed first.

```bash
git clone https://github.com/spacedock-io/npmco.de-indexer.git
cd npmco.de-indexer
npm install
bin/seed
```

This will seed ElasticSearch cluster with indexes and one package.

## Usage

### Importing new packages
```bash
bin/import <package>@<version>
```

### Searching
```
bin/search JSON.stringify
bin/search 'res.statusCode AND 401'
```
