# Pollinations Chat

An open-source **Chat with AI** web app powered by the [Pollinations](https://pollinations.ai) unified API.

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-6-purple)
![License](https://img.shields.io/badge/License-Apache--2.0-green)

## Features

- Sign in with Pollinations (redirects to `enter.pollinations.ai` to log in with GitHub)
- Multi-model chat (text, image, and video)
- Streaming responses
- Local chat history (IndexedDB)
- Export / import chats

## Quick start

### Prerequisites

- Node.js 18+

### Install & run

```bash
npm install
npm run dev
```

Open http://localhost:5173.

### Login

- Click **Sign in with Pollinations** to log in using GitHub.
- Alternatively, you can paste a Pollinations API key and continue.

## Contributing

Contributions are welcome.

- Open an issue for bugs or feature requests
- Submit a pull request with a clear description
- Before opening a PR, run: `npm run lint`, `npx tsc --noEmit`, and `npm test`

## License

Apache License 2.0. See LICENSE.
