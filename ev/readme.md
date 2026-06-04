# EvMusic — Evanescence Discography Player

A clean, minimal web-based music player for your local Evanescence collection.

## File structure

```
ev/
├── index.html
├── database/
│   └── db.js              ← Album/track metadata
└── content/
    ├── style.css
    ├── main.js
    ├── player.js
    └── albums/
        ├── fallen/
        │   ├── cover.webp
        │   ├── Going Under.mp3
        │   └── ...
        ├── open-door/
        │   ├── cover.webp
        │   └── ...
        └── ...
```

## Setup

1. Place your `.mp3` (or `.flac`) files inside the matching album folder.
2. Add a `cover.webp` (square, recommended 300×300 px) to each album folder.
3. Open `index.html` in a browser — or serve with any static server:
   ```
   npx serve .
   # or
   python3 -m http.server
   ```

## Adding albums

Edit `database/db.js` and add an entry to the `data` array:

```js
{
    id: 8,                           // unique number
    name: "My New Album",
    type: "Studio",                  // Studio | Demo | Live | Compilation | Amy Lee
    date: 2024,
    path: "./content/albums/my-new-album/",
    format: "mp3",                   // mp3 | flac
    songs: [
        { albumId: 8, order: 1, name: "Track Name", duration: "3:45" },
        ...
    ]
}
```

The `name` field in each song **must match the audio filename** (without extension).

## Keyboard shortcuts

| Key | Action |
|-----|--------|
| Space | Play / Pause |
| → | Skip +5 seconds |
| ← | Skip −5 seconds |
