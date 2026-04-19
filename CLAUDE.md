# CLAUDE.md

> Context for AI assistants working on this codebase.

## Monorepo Structure

This repo contains two packages managed as a Bun workspace:

| Path | Package | Role |
|------|---------|------|
| `src/` | `@photon-ai/imessage-kit` | iMessage SDK — the library |
| `app/` | `healthspan-os` | Multi-user wellness assistant app |

The SDK exports a `"bun"` condition (`"bun": "./src/index.ts"`) so Bun resolves TypeScript source directly — no build step needed to run the app. `app/package.json` declares `"@photon-ai/imessage-kit": "workspace:*"`.

---

## SDK — @photon-ai/imessage-kit

Type-safe macOS iMessage SDK (TypeScript). Reads from `~/Library/Messages/chat.db` via SQLite, sends via AppleScript.

### Commands (SDK)

```bash
bun test                          # Run all tests
npx tsc --noEmit                  # Type-check
npx biome check --write src/      # Format + lint
npm run build                     # Build via tsup → dist/
```

### SDK Architecture

```
src/
├── index.ts                    # Public API barrel
├── sdk.ts                      # SDK class — composition root
├── sdk-bounds.ts               # Runtime config bounds (standalone, zero deps)
├── config.ts                   # Compat facade: re-exports BOUNDS + LIMITS
├── domain/                     # Pure business logic — zero I/O, zero external deps
│   ├── attachment.ts           # Attachment interface + TransferStatus
│   ├── chat.ts                 # Chat interface + ChatKind + style constants
│   ├── chat-id.ts              # ChatId value object (parsing, normalization, matching)
│   ├── errors.ts               # IMessageError class + named factories
│   ├── message.ts              # Message interface + enums (Kind, Expire, Share, Schedule)
│   ├── reaction.ts             # Reaction interface + ReactionKind + resolveReactionMeta
│   ├── routing.ts              # MessageTarget + resolveTarget (DM vs group routing)
│   ├── service.ts              # Service type + resolveService
│   ├── timestamp.ts            # MAC_EPOCH + timestamp conversion
│   └── validate.ts             # Recipient, URL, content validation + SEND_LIMITS
├── application/                # Application orchestration — depends on domain + types only
│   ├── send-port.ts            # SendPort interface (implemented by SDK + Sender)
│   ├── message-chain.ts        # Fluent message processing API
│   ├── message-dispatcher.ts   # Incoming event routing (watch → callbacks + plugins)
│   ├── message-scheduler.ts    # Scheduled message delivery (once + recurring)
│   ├── reminders.ts            # Natural language reminder facade
│   └── reminder-time.ts        # Duration + time expression parsing
├── infra/                      # External system adapters
│   ├── platform.ts             # Platform detection, default paths, Darwin version
│   ├── attachments.ts          # Read-only file ops on existing attachments
│   ├── db/                     # SQLite read + watch
│   │   ├── sqlite-adapter.ts   # Runtime-agnostic SQLite (bun:sqlite / better-sqlite3)
│   │   ├── contract.ts         # Query contract + ChatId SQL match helper
│   │   ├── macos26.ts          # macOS 26 query builder (MESSAGE/CHAT/ATTACHMENT fields)
│   │   ├── mapper.ts           # Row → Message/Chat/Attachment conversion
│   │   ├── reader.ts           # High-level database reader facade
│   │   ├── body-decoder.ts     # attributedBody BLOB decoding
│   │   └── watcher.ts          # WAL-based real-time message monitor
│   ├── outgoing/               # Send pipeline
│   │   ├── sender.ts           # Send orchestrator (buddy vs chat method)
│   │   ├── tracker.ts          # MessagePromise + OutgoingMessageManager
│   │   ├── applescript-transport.ts  # AppleScript generation + stdin execution
│   │   ├── downloader.ts       # URL download + format conversion (AVIF/WebP → JPEG)
│   │   └── temp-files.ts       # Temp file lifecycle management
│   └── plugin/                 # Plugin system
│       ├── manager.ts          # Plugin lifecycle + hook dispatch
│       └── logger.ts           # Built-in logger plugin
├── utils/                      # Shared pure utilities (importable by any layer)
│   └── async.ts                # delay, retry, Semaphore
└── types/                      # Type definitions only — no logic
    ├── config.ts               # IMessageConfig
    ├── query.ts                # MessageQuery, ChatQuery
    ├── send.ts                 # SendContent, SendRequest, SendResult
    └── plugin.ts               # Plugin, PluginHooks, hook contexts
```

### SDK Layer Dependency Rules

Enforced by `__tests__/25-architecture-boundaries.test.ts`:

| Layer | May import from |
|-------|----------------|
| `types/` | `types/`, `domain/` types only |
| `domain/` | `domain/`, `types/` |
| `application/` | `application/`, `domain/`, `types/` |
| `infra/` | `infra/`, `domain/`, `types/`, `utils/`, `application/send-port.ts` |
| `utils/` | nothing (pure, zero deps) |
| `sdk.ts` | everything except `index.ts` and `config.ts` |
| `config.ts` | `sdk-bounds.ts`, `domain/validate.ts` |
| `sdk-bounds.ts` | nothing |
| `index.ts` | anything (public API barrel) |

### SDK Code Style

- Biome: 4-space indent, single quotes, trailing commas, semicolons as needed, 120 line width
- Section headers: `// -----------------------------------------------`
- Errors: `SendError(msg)` returns `IMessageError` (not `new SendError()`). Use `instanceof IMessageError` in catch.
- 1 production dependency: `@parseaple/typedstream` (for attributedBody BLOB parsing)
- Dual runtime: `bun:sqlite` (Bun) / `better-sqlite3` (Node.js)

### SDK Key Patterns

- **ChatId value object** (`domain/chat-id.ts`): All chatId parsing/normalization in one place.
- **Port/Adapter**: `application/send-port.ts` defines `SendPort`; infra implements it.
- **Schema versioning**: `infra/db/contract.ts` defines the query contract; `infra/db/macos26.ts` implements it.
- **WAL watcher**: `infra/db/watcher.ts` monitors the SQLite WAL file for real-time message detection.
- **Shared retry**: `utils/async.ts` provides `retry()` with exponential backoff + jitter, `Semaphore` for concurrency.

### SDK Testing

- Tests in `__tests__/`, run with `bun test`
- `setup.ts` provides `createMockDatabase()`, `insertTestMessage()`, `createSpy()`
- Mock database mirrors macOS Messages schema (includes macOS 26 columns)
- No real macOS or iMessage needed for tests
- Architecture boundaries enforced in `25-architecture-boundaries.test.ts`

---

## App — healthspan-os

Multi-user iMessage wellness assistant. Manages supplement + peptide protocols for registered users. Powered by Claude (Anthropic) with prompt caching.

### Commands (App)

```bash
cd app
bun start        # Run the assistant
bun dev          # Run with file watching
bun type-check   # Type-check app only
```

### App Architecture

```
app/src/
├── config/
│   ├── index.ts              # Env config (ANTHROPIC_API_KEY, DB_PATH, etc.)
│   ├── supplements.ts        # 17-entry supplement database with interactions
│   └── peptides.ts           # 10-entry peptide database with protocols
├── domain/                   # Pure business logic — zero I/O
│   ├── user-profile.ts       # UserProfile, Supplement, PeptideProtocol types
│   ├── protocols/
│   │   ├── vitamin-protocol.ts   # Daily reminder schedule builder
│   │   └── peptide-protocol.ts   # Injection schedule, reconstitution, cycle math
│   ├── compliance/
│   │   └── tracker.ts            # Streak calculation, time-of-day detection
│   └── safety/
│       └── interaction-checker.ts # 18 known supplement/peptide interactions
├── infrastructure/
│   ├── storage/
│   │   ├── db-schema.ts          # SQLite schema + openDatabase()
│   │   ├── user-repository.ts    # User CRUD (JSON columns for complex fields)
│   │   └── compliance-store.ts   # Compliance log + peptide injection tracking
│   └── ai/
│       ├── claude-client.ts      # Anthropic SDK, prompt caching (system + template layers)
│       └── prompt-templates/
│           ├── reconstitution.ts
│           ├── progress-analysis.ts
│           └── side-effect.ts
└── application/
    ├── services/
    │   └── reminder-service.ts   # scheduleRecurring() for supplements, schedule() for peptides
    ├── command-router.ts         # Text → CommandType dispatch (regex pattern table)
    └── healthspan-os.ts          # Main facade — HealthspanOS.create() entry point
```

### App Key Patterns

- **Prompt caching**: `generateWithTemplate()` sends two cached blocks — base system prompt + domain template. Both are marked `cache_control: { type: 'ephemeral' }`. Repeated identical calls hit cache, cutting costs ~80%.
- **Supplement reminders**: `scheduleRecurring({ interval: 'daily' })` — SDK handles recurrence; no cron needed.
- **Peptide injections**: `schedule()` called once per event (pre-reminder, injection, post-check-in, cycle-end) across the full cycle.
- **User lookup**: Inbound message `msg.participant` is looked up against `users.phone` in SQLite. Unknown senders are silently ignored.
- **Interaction safety**: `checkInteractions()` runs on every `registerUser()` call. Critical/warning interactions are sent to the user immediately after the welcome message.
- **Side effect escalation**: `isSevereSymptom()` pattern-matches before any AI call — severe keywords trigger an immediate 911 directive, bypassing LLM latency.
- **Storage**: Users stored as a single SQLite row with JSON columns for goals/preferences/stack/peptides. Compliance and injections are normalized tables with indexes on `(user_id, logged_at)`.

### App Environment

```
ANTHROPIC_API_KEY=  # Required
DB_PATH=            # Optional, defaults to app/data/healthspan.db
DEBUG=              # Optional, enables SDK verbose logging
ADMIN_PHONE=        # Optional, receives system alerts
DEFAULT_TIMEZONE=   # Optional, defaults to America/New_York
```
