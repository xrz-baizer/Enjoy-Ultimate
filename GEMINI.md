# Enjoy English App

This is an Electron-based audio learning application for English learners. It is a fork of the original [everyone-can-use-english](https://github.com/ZuodaoTech/everyone-can-use-english) project, with a focus on core audio features and some custom additions.

## Project Overview

*   **Core Functionality:** Audio learning, with features like transcription, translation, and pronunciation assessment.
*   **Technologies:**
    *   **Framework:** Electron
    *   **Frontend:** React, TypeScript, Vite, Tailwind CSS
    *   **Backend:** Node.js
    *   **Testing:** Playwright
*   **Architecture:** The application is structured as a typical Electron project with a main process and a renderer process.
    *   The **main process** (`src/main.ts`) handles window creation, application lifecycle events, and communication with the renderer process.
    *   The **renderer process** (`src/renderer/`) is a React application that provides the user interface.
    *   **Vite** is used for bundling both the main and renderer processes.
    *   **Electron Forge** is used for packaging and distributing the application.

## Building and Running

### Prerequisites

*   Node.js and Yarn are required.

### Development

To run the application in development mode:

```bash
yarn install
yarn dev
```

### Production

To build and package the application for production:

```bash
# Package for your current OS
yarn package

# Create an installer for your current OS
yarn make
```

To build for a specific platform:

```bash
# Package for Windows (64-bit)
yarn package --platform=win32 --arch=x64

# Create an installer for Windows (64-bit)
yarn make --platform=win32 --arch=x64
```

### Testing

To run the end-to-end tests:

```bash
yarn test
```

## Development Conventions

*   **Linting:** ESLint is used for code linting. Run `yarn lint` to check for issues.
*   **Styling:** Tailwind CSS is used for styling.
*   **State Management:** The application uses a combination of React hooks and context for state management.
*   **IPC:** Communication between the main and renderer processes is handled through Electron's IPC modules.
*   **Database:** The application uses `sequelize` and `sqlite3` for its database.
*   **Icons:** Application icons are located in the `/assets` directory. To change the icon, replace the files in this directory and rebuild the application.
