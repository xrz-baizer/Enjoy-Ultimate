# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Enjoy-Ultimate is an Electron-based desktop application for English language learning through audio analysis. It's a customized fork of "everyone-can-use-english" that focuses on core audio features with additional custom functionality.

**Tech Stack:**
- Electron 34 with Vite build system
- React 18 with TypeScript
- Sequelize ORM with SQLite database
- Echogarden for speech recognition and alignment
- WaveSurfer.js for audio visualization
- TailwindCSS + shadcn/ui components

## Development Commands

### Running the App
```bash
# Install dependencies
yarn install

# Development with custom library path (uses enjoy/tmp for data)
yarn dev

# Standard development mode
yarn start
```

### Building & Packaging
```bash
# Package application (outputs to /out)
yarn package

# Create installer/distributable
yarn make

# Package with specific version
yarn package --version=1.0.0
yarn make --version=1.0.0

# Windows builds
yarn package --platform=win32 --arch=x64
yarn make --platform=win32 --arch=x64
```

### Code Quality & Testing
```bash
# Lint TypeScript/TSX files
yarn lint

# Run Playwright e2e tests
yarn test

# Run specific test suites
yarn test:main      # Main process tests
yarn test:renderer  # Renderer process tests
```

### Database & Utilities
```bash
# Create new database migration
yarn create-migration <migration-name>

# Download dictionary files (runs automatically with dev/start)
yarn download
```

## Architecture

### Electron Process Model

**Main Process** (`src/main/`):
- Entry point: `src/main.ts`
- Database layer: `src/main/db/` with Sequelize models and Umzug migrations
- Audio processing: `src/main/echogarden.ts` (Whisper integration)
- FFmpeg operations: `src/main/ffmpeg.ts`
- Settings management: `src/main/settings.ts`
- Window management: `src/main/window.ts`

**Renderer Process** (`src/renderer/`):
- Entry point: `src/renderer/index.tsx`
- App component: `src/renderer/app.tsx` with nested context providers
- Router: `src/renderer/router.tsx` (React Router with hash routing)

**Preload Script** (`src/preload.ts`):
- Exposes `__ENJOY_APP__` API to renderer via `contextBridge`
- Bridges IPC communication between main and renderer

### Key Components Structure

**Audio Player System** (primary feature):
- `src/renderer/components/medias/media-shadow-player.tsx` - Main audio player
- `src/renderer/components/medias/media-bottom-panel/` - Player controls and recording
- `src/renderer/components/medias/media-left-panel/` - Transcription display
- `src/renderer/components/medias/media-right-panel/` - Translation, notes, analysis tabs
- Context: `src/renderer/context/media-shadow-provider.tsx` (manages player state, regions, transcription)

**Layout Components**:
- `src/renderer/components/layouts/sidebar.tsx` - App navigation
- `src/renderer/components/layouts/title-bar.tsx` - Window title bar

**Pages** (`src/renderer/pages/`):
- `/` - Audios list (default route, protected)
- `/audios/:id` - Audio detail with player
- `/videos/:id` - Video player
- `/conversations` - Conversation practice
- `/chats` - AI chat sessions
- `/documents` - Document viewer
- `/vocabulary` - Vocabulary review
- `/notes` - User notes
- `/courses` - Course material

### Context Providers (Nested Order)

1. `ThemeProvider` - Theme management
2. `DbProvider` - Database connection state
3. `AppSettingsProvider` - Application settings
4. `HotKeysSettingsProvider` - Keyboard shortcuts
5. `AISettingsProvider` - AI/LLM configuration
6. `DictProvider` - Dictionary integration
7. `CopilotProvider` - AI copilot features

**Media-specific**: `MediaShadowProvider` wraps audio/video pages for player state, waveform, regions, transcription, and recordings.

### Database Models

Core models in `src/main/db/models/`:
- `Audio` - Audio files with metadata
- `Video` - Video files with metadata
- `Transcription` - Generated transcripts
- `Recording` - User voice recordings
- `Segment` - Audio segments for practice
- `Note` - User notes on content
- `Conversation` - Conversation practice sessions
- `Message` - Chat messages
- `Document` - Documents and articles
- `Speech` - TTS audio
- `PronunciationAssessment` - Pronunciation scores
- `Category` - Content categorization
- `CacheObject` - Generic cache storage
- `UserSetting` - User preferences

**Database Operations**:
- Migrations: `src/main/db/migrations/`
- Handlers: `src/main/db/handlers/` (IPC handlers for CRUD operations)
- Connection: `src/main/db/index.ts`

### IPC Communication Pattern

**Commands** (`src/commands/`):
- AI-powered text processing commands
- Examples: `analyze.command.ts`, `translate.command.ts`, `ipa.command.ts`, `lookup.command.ts`

**Handlers**: Main process handlers in `src/main/db/handlers/` for database operations, registered via IPC

**API**: `src/api/client.ts` - HTTP client for backend communication

### Audio Processing Pipeline

1. **Import**: File added to database (Audio model)
2. **Waveform**: Generated via `src/main/waveform.ts`
3. **Transcription**:
   - Echogarden (Whisper) in `src/main/echogarden.ts`
   - Azure Speech SDK option in `src/main/azure-speech-sdk.ts`
4. **Alignment**: Word-level timeline alignment
5. **Regions**: User-defined practice segments
6. **Recording**: Voice recording with pitch analysis
7. **Assessment**: Pronunciation scoring

### TypeScript Configuration

**Path Aliases** (tsconfig.json):
- `@/*` → `./src/*`
- `@renderer/*` → `./src/renderer/*`
- `@main/*` → `./src/main/*`
- `@commands` → `./src/commands`

### Build Configuration

**Electron Forge** (`forge.config.js`):
- Vite plugin for bundling
- Makers: DMG (macOS), ZIP (cross-platform), DEB (Linux)
- Asset unpacking: FFmpeg binaries, ONNX runtime, dictionaries
- Protocol handler: `enjoy://` URLs

**Important**: Binary files (FFmpeg, Whisper) are unpacked from asar to ensure they're executable.

### Content Providers

External content importers in `src/main/providers/`:
- `youtube-provider.ts` - YouTube video/audio import
- `ted-provider.ts` - TED talks import
- `audible-provider.ts` - Audible audiobook import

### i18n

Internationalization:
- Main: `src/main/i18n.ts`
- Renderer: `src/renderer/i18n.ts`
- Translation files in `src/i18n/`

## Development Notes

### Environment Setup

The app uses custom paths during development:
- `SETTINGS_PATH=${PWD}/enjoy/tmp` - Settings storage
- `LIBRARY_PATH=${PWD}/enjoy/tmp` - Media library location
- Configure library path in `enjoy/tmp/settings.json`

### Database Migrations

Create migrations with sequential timestamps:
```bash
yarn create-migration add-field-name
# Creates: src/main/db/migrations/{timestamp}-add-field-name.js
```

Template structure:
```javascript
import { DataTypes } from "sequelize";

async function up({ context: queryInterface }) {
  // migration code
}

async function down({ context: queryInterface }) {
  // rollback code
}

export { up, down };
```

### Testing

Playwright tests in `e2e/`:
- `main.spec.ts` - Main process tests
- `renderer.spec.ts` - Renderer process tests
- Tests require packaging first: `yarn package`

### Icon Customization

App icons in `/assets/`:
- `icon.png` - Base icon (1024x1024 recommended)
- `icon.ico` - Windows icon
- `icon.icns` - macOS icon

Update all three formats when changing icons, then rebuild.

### Common Gotchas

1. **Binary paths**: FFmpeg/Whisper paths need `.replace("app.asar", "app.asar.unpacked")` for packaged apps
2. **IPC handlers**: Register in `src/main/db/index.ts` handlers array
3. **Context nesting**: Provider order in `app.tsx` matters - DB before Settings before AI
4. **Protected routes**: Wrap with `<ProtectedPage>` in router for auth
5. **Audio player state**: Use `MediaShadowProvider` context, not local state, for media playback
6. **Migrations**: Always test `up` and `down` functions before committing
