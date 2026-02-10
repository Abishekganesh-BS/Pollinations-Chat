# Pollinations Chat

An open-source **Chat with AI** web app powered by the [Pollinations](https://pollinations.ai) unified API.

[![Built with Pollinations](https://img.shields.io/badge/Built%20with-Pollinations-8a2be2?style=for-the-badge&logo=data:image/svg+xml,%3Csvg%20xmlns%3D%22http://www.w3.org/2000/svg%22%20viewBox%3D%220%200%20124%20124%22%3E%3Ccircle%20cx%3D%2262%22%20cy%3D%2262%22%20r%3D%2262%22%20fill%3D%22%23ffffff%22/%3E%3C/svg%3E&logoColor=white&labelColor=6a0dad)](https://pollinations.ai)

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

## Credits

- Built with the [pollinations.ai](https://pollinations.ai) API
