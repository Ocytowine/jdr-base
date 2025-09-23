# Nuxt Minimal Starter

Look at the [Nuxt documentation](https://nuxt.com/docs/getting-started/introduction) to learn more.

## Setup

Make sure to install dependencies:

```bash
# npm
npm install

# pnpm
pnpm install

# yarn
yarn install

# bun
bun install
```

## Development Server

Start the development server on `http://localhost:3000`:

```bash
# npm
npm run dev

# pnpm
pnpm dev

# yarn
yarn dev

# bun
bun run dev
```

## Production

Build the application for production:

```bash
# npm
npm run build

# pnpm
pnpm build

# yarn
yarn build

# bun
bun run build
```

Locally preview production build:

```bash
# npm
npm run preview

# pnpm
pnpm preview

# yarn
yarn preview

# bun
bun run preview
```

Check out the [deployment documentation](https://nuxt.com/docs/getting-started/deployment) for more information.

## Creation adapter helper

When configuring server-side creation flows you can now leverage dynamic collections through the `auto_from` helper on choice
effects. This helper queries the underlying data adapter (for example the GitHub adapter) to populate available options without
hard-coding identifiers in the effect payload.

```jsonc
{
  "type": "choice",
  "payload": {
    "category": "spell",
    "ui_id": "wizard_level1_spell",
    "choose": 1,
    "auto_from": {
      "collection": "spells",
      "filters": {
        "level": 1,
        "tags": ["wizard"]
      }
    }
  }
}
```

Each entry returned by the adapter must expose the fields used by the filters (e.g. `level`, `school`, `tags`). The creation
adapter automatically resolves the matching entries, converts them into `{ id, label }` pairs, and stores them in the pending
choice descriptor (`from` / `from_labels`).
