# Aura

Aura is a React + Vite multiplayer word game using Firebase Realtime Database and Netlify hosting.

## Local Run

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

The production build is generated in `dist`.

## Environment

Copy `.env.example` to `.env` for local development and fill in your Firebase web app values.

Do not commit real `.env` values. Netlify reads the same `VITE_*` variables from its site environment settings during `npm run build`.

Required variables:

```bash
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_DATABASE_URL=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=
```

## Firebase

Aura uses Firebase Realtime Database.

- Room paths: `rooms/biriyani`, `rooms/dosa`, `rooms/ice-cream`, `rooms/chocolate`, `rooms/pizza`
- Words path: `words`
- Word rotation path: `wordRotation`

Use `database.rules.json` as the safer Realtime Database rules baseline. It limits reads and writes to Aura's five allowed rooms, blocks writes to unknown rooms, blocks client writes to `words`, validates player usernames/colors/roles, validates clue length, and keeps each lobby capped at 11 players.

To apply the rules, open Firebase Console, go to Realtime Database, open the Rules tab, and paste the contents of `database.rules.json`. If your Firebase CLI is configured for this project, you can also deploy the rules from this repo.

Do not use fully open rules like `{ ".read": true, ".write": true }` outside quick private testing. Aura currently has no Firebase Auth, so database rules can validate data shape but cannot prove which browser owns a player. For a stronger public release, add Firebase Auth or App Check and tighten per-player writes.

Firebase web config values using `VITE_*` are included in the browser bundle by design. Treat Realtime Database rules as the security boundary, and keep real `.env` files uncommitted.

## Firebase Words

Words are stored under `words`. Words should be simple, single-word entries with no spaces.

Example:

```json
{
  "words": {
    "word_001": {
      "id": 1,
      "text": "Biryani",
      "category": "Food",
      "active": true
    },
    "word_002": {
      "id": 2,
      "text": "Tiger",
      "category": "Animals",
      "active": true
    }
  }
}
```

To upload words:

1. Open Firebase Console.
2. Go to Realtime Database.
3. Open the Data tab.
4. Add or import JSON under the root `words` node.
5. Use keys like `word_001`, `word_002`, and keep `text` single-word.

To add a word:

```json
"word_003": {
  "id": 3,
  "text": "Cricket",
  "category": "Sports",
  "active": true
}
```

To disable a word without deleting it:

```json
"word_003": {
  "id": 3,
  "text": "Cricket",
  "category": "Sports",
  "active": false
}
```

Only words with `active: true` and no spaces in `text` are eligible.

## Netlify Deployment

`netlify.toml` is already configured:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Deploy steps:

1. Push the project to GitHub.
2. Connect the GitHub repo to Netlify.
3. Set build command to `npm run build`.
4. Set publish directory to `dist`.
5. Add these environment variables in Netlify:

```bash
VITE_FIREBASE_API_KEY
VITE_FIREBASE_AUTH_DOMAIN
VITE_FIREBASE_DATABASE_URL
VITE_FIREBASE_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID
VITE_FIREBASE_APP_ID
```

Use preview deploys first, then deploy to production when ready.
