# Wiki Graph

Crawl a Fandom.com wiki and store connections between pages.

Upcoming: view connections in a force-directed graph.

## Setup

Clone this repository:

```sh
git clone https://github.com/travishorn/wikigraph
```

Change into the repository directory:

```sh
cd wikigraph
```

Install the dependencies:

```sh
npm install
```

Migrate the database:

```sh
npm run migrate
```

Edit `src/index.js` and set the following constants:

- `siteId` - Can be anything. Example: `Star Wars`
- `baseUrl` - The base URL for the wiki site. Example: `https://starwars.fandom.com/wiki/`
- `mainPageId` - The last part of the URL of the main page. Example: `Main_Page`

Run the crawler:

```sh
npm start
```

It's set very slow (5 seconds between requests) by default, but you can tweak
the rate-limiting timeout in `src/index.js`.

Data is stored in `dev.sqlite3` or `prod.sqlite3`. Particularly, look at the
`Edge` table to see connections between pages.

## To Do

- Visualize the connections using a force-directed graph

## License

The MIT License

Copyright 2024 Travis Horn

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the “Software”), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
