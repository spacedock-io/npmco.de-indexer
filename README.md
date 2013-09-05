# npm-code-search
Code search feature for npm.

## Installation

You need ElasticSearch installed first.

```bash
git clone https://github.com/nodejitsu/npm-code-search.git
cd npm-code-search
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
