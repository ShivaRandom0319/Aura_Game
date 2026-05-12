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
VITE_DEFAULT_ROOM_CODE=ABC123
```

## Firebase

Aura uses Firebase Realtime Database.

- Room path: `rooms/ABC123`
- Words path: `words`
- Word rotation path: `wordRotation`

For testing only, Firebase rules can be:

```json
{
  "rules": {
    ".read": true,
    ".write": true
  }
}
```

These open rules are only for testing with friends. They should be improved later.

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
VITE_DEFAULT_ROOM_CODE
```

Use preview deploys first, then deploy to production when ready.
