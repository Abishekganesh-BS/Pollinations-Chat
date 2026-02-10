# Pollinations Chat

A production-ready, open-source **"Chat with AI"** web application powered by the [Pollinations](https://pollinations.ai) unified API.

![React](https://img.shields.io/badge/React-18-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.6-blue)
![Vite](https://img.shields.io/badge/Vite-6-purple)
![License](https://img.shields.io/badge/License-MIT-green)

## Features

- **Multi-model chat** — Select from 25+ text and image models (OpenAI, Claude, Gemini, Mistral, DeepSeek, Grok, and more)
- **Real-time streaming** — Server-Sent Events for instant token-by-token responses
- **Multi-modal generation** — Text, image, audio, and video generation modes
- **Pollen metering** — Live balance tracking with pre-generation cost estimation
- **Token meter** — Visual indicator of context window usage
- **Local-first storage** — All chats stored in IndexedDB (zero server dependency)
- **Export / Import** — JSON and Markdown export with full roundtrip support
- **Session management** — Create, switch, rename, and delete chat sessions
- **Markdown rendering** — Full GFM support with syntax highlighting
- **Responsive design** — Mobile-first with collapsible sidebar
- **Dark theme** — Custom design system with brand colors

## Quick Start

### Prerequisites
- Node.js ≥ 18
- npm ≥ 9
- A Pollinations API key (get one at [pollinations.ai](https://pollinations.ai))

### Installation

```bash
# Clone the repository
git clone https://github.com/pollinations/pollinations-chat.git
cd pollinations-chat

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) and enter your Pollinations API key.

### Getting an API Key

1. Visit [pollinations.ai](https://pollinations.ai)
2. Create an account and generate an API key
3. Keys starting with `pk_` are publishable (client-safe, rate-limited)
4. Keys starting with `sk_` are secret (server-side, no rate limits)

## Architecture

This application follows a **local-first, streaming-first** architecture.

### Data Flow

```
AuthScreen → App (validates key) → ChatPage (orchestrator)
  ├── Sidebar (session list)
  ├── ModelInfoPanel (model selection)
  ├── MessageList (rendered messages)
  └── Composer (user input)
      ↓
  streamGeneration() → SSE chunks → updateMessage() → re-render
```

### Key Design Decisions

1. **Local-first storage**: All data lives in IndexedDB using `idb`. No backend required.
2. **Streaming-first**: Uses `fetch` + `ReadableStream` with SSE parsing for real-time responses.
3. **Heuristic tokenizer**: Uses a 4-chars-per-token estimate instead of tiktoken to avoid huge WASM dependencies.
4. **Pollen math**: Cost estimation happens client-side before generation (min `0.00004` pollen/prompt).

### State Management

- **React Hooks**: No external state library. `useLocalSession` manages session CRUD.
- **IndexedDB**: Persistent storage for sessions, settings, and API keys.
- **Context-free**: Components receive required data via props for simpler testing and reusability.

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | React 18 + TypeScript 5.6 |
| Bundler | Vite 6 |
| Styling | Tailwind CSS 3.4 + Custom Theme |
| Storage | IndexedDB via `idb` |
| Streaming | `fetch` + `ReadableStream` (SSE) |
| Markdown | `react-markdown` + `remark-gfm` |
| Testing | Vitest |

## Project Structure

```
src/
├── types/          # TypeScript type definitions
│   └── index.ts
├── lib/            # Core libraries
│   ├── pollinations.ts   # API client (streaming, auth, models)
│   ├── tokenizer.ts      # Token estimation & truncation
│   ├── pollenMath.ts     # Pollen cost calculations
│   ├── storage.ts        # IndexedDB persistence
│   └── exportImport.ts   # JSON/Markdown export & import
├── hooks/          # React hooks
│   ├── useLocalSession.ts    # Session CRUD & auto-restore
│   ├── useTokenMeter.ts      # Live token counting
│   └── useNotifications.ts   # Toast notification system
├── components/     # UI components
│   ├── AuthScreen.tsx        # API key entry & validation
│   ├── ChatPage.tsx          # Main orchestrator
│   ├── MessageList.tsx       # Message rendering with markdown
│   ├── Composer.tsx          # Input with mode switching
│   ├── ModelInfoPanel.tsx    # Model selector & info
│   ├── UsageIcon.tsx         # Pollen balance display
│   ├── Notifications.tsx     # Toast notifications
│   └── Settings.tsx          # App settings panel
├── App.tsx         # Root component (auth gate)
├── main.tsx        # Entry point
└── index.css       # Tailwind + custom styles

tests/
├── pollenMath.test.ts       # Pollen cost & math tests
├── tokenizer.test.ts        # Token estimation tests
├── exportImport.test.ts     # Export/import roundtrip tests
└── modelCapability.test.ts  # Model capability inference tests
```

## Testing

```bash
# Run all tests
npm test

# Run with verbose output
npm test -- --reporter=verbose
```

| File | Coverage |
|------|----------|
| `pollenMath.test.ts` | Pollen cost calculations, balance checks, formatting |
| `tokenizer.test.ts` | Token estimation, message truncation, color thresholds |
| `exportImport.test.ts` | JSON/Markdown export, import, roundtrip validation |
| `modelCapability.test.ts` | Model capability inference from name and type |

## NPM Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server on port 5173 |
| `npm run build` | Production build to `dist/` |
| `npm run preview` | Preview production build |
| `npm test` | Run unit tests with Vitest |
| `npm run lint` | Lint with ESLint |

## API Reference

This application uses the **Pollinations unified API** at `https://gen.pollinations.ai`.
Review `src/lib/pollinations.ts` for implementation details.

## Troubleshooting

| Issue | Solution |
|-------|---------|
| "Invalid API key" | Re-enter your key; ensure it starts with `pk_` or `sk_` |
| "Pollen exhausted" | Top up your balance at pollinations.ai |
| Models not loading | Check your network connection; the app fetches models on auth |
| Chat history gone | Browser data was cleared; use Export to backup regularly |

## License

MIT
