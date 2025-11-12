import { app, BrowserWindow, protocol, net, ipcMain } from "electron";
import path from "path";
import { pathToFileURL } from "url";
import fs from "fs-extra";
import settings from "@main/settings";
import log from "@main/logger";
import mainWindow from "@main/window";
import ElectronSquirrelStartup from "electron-squirrel-startup";
import contextMenu from "electron-context-menu";
import Bugsnag from "@bugsnag/electron";
import { t } from "i18next";
import { Client } from "./api";

const logger = log.scope("main");

// Monkey-patch ipcMain.handle to suppress errors from audiowaveform-generate
const originalHandle = ipcMain.handle;
// @ts-expect-error - Overwriting a readonly property
ipcMain.handle = (
  channel: string,
  listener: (event: Electron.IpcMainInvokeEvent, ...args: any[]) => any
) => {
  if (channel === "audiowaveform-generate") {
    const originalListener = listener;
    const wrappedListener = async (
      event: Electron.IpcMainInvokeEvent,
      ...args: any[]
    ) => {
      try {
        // It's crucial to await here in case the original listener is async
        return await originalListener(event, ...args);
      } catch (err) {
        logger.error(
          `Caught error in audiowaveform-generate, suppressing dialog: ${err}`
        );
        // Return a value that won't cause issues on the renderer side
        return null;
      }
    };
    // Call the original handle method with the wrapped listener
    return originalHandle.call(ipcMain, channel, wrappedListener);
  } else {
    // For all other channels, use the original handle method as is
    return originalHandle.call(ipcMain, channel, listener);
  }
};

const initBugsnag = async () => {
  if (!app.isPackaged) return;
  const webApi = new Client({
    baseUrl: settings.apiUrl(),
    logger,
  });
  try {
    const apiKey = await webApi.config("bugsnag_api_key");
    if (!apiKey) return;

    Bugsnag.start({ apiKey: apiKey.bugsnagApiKey });
  } catch (err) {
    logger.error(err);
  }
};

app.commandLine.appendSwitch("enable-features", "SharedArrayBuffer");

if (!app.isPackaged) {
  app.disableHardwareAcceleration();
  app.commandLine.appendSwitch("disable-software-rasterizer");
}

initBugsnag();

// Add context menu
contextMenu({
  showSearchWithGoogle: false,
  showInspectElement: false,
  showLookUpSelection: false,
  showLearnSpelling: false,
  showSelectAll: false,
  labels: {
    copy: t("copy"),
    cut: t("cut"),
    paste: t("paste"),
    selectAll: t("selectAll"),
  },
  shouldShowMenu: (_event, params) => {
    return params.isEditable || !!params.selectionText;
  },
  prepend: (
    _defaultActions,
    parameters,
    browserWindow: BrowserWindow,
    _event
  ) => [
    {
      label: t("lookup"),
      visible:
        parameters.selectionText.trim().length > 0 &&
        !parameters.selectionText.trim().includes(" "),
      click: () => {
        const { x, y, selectionText } = parameters;
        browserWindow.webContents.send("on-lookup", selectionText, "", {
          x,
          y,
        });
      },
    },
    {
      label: t("aiTranslate"),
      visible: parameters.selectionText.trim().length > 0,
      click: () => {
        const { x, y, selectionText } = parameters;
        browserWindow.webContents.send("on-translate", selectionText, { x, y });
      },
    },
  ],
});

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (ElectronSquirrelStartup) {
  app.quit();
}

protocol.registerSchemesAsPrivileged([
  {
    scheme: "enjoy",
    privileges: {
      standard: true,
      secure: true,
      bypassCSP: true,
      allowServiceWorkers: true,
      supportFetchAPI: true,
      stream: true,
      codeCache: true,
      corsEnabled: true,
    },
  },
]);

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", async () => {
  if (!app.isPackaged) {
    import("electron-devtools-installer")
      .then((mymodule: any) => {
        const installExtension = mymodule.default.default; // Default export
        installExtension(mymodule.default.REACT_DEVELOPER_TOOLS, {
          loadExtensionOptions: {
            allowFileAccess: true,
          },
        }); // replace param with the ext ID of your choice
      })
      .catch((err) => console.log("An error occurred: ", err));
  }

  protocol.handle("enjoy", async (request) => {
    const startTime = Date.now();
    const originalUrl = request.url;
    let url = request.url.replace("enjoy://", "");

    if (
      url.match(
        /library\/(audios|videos|recordings|speeches|segments|documents)/g
      )
    ) {
      url = url.replace("library/", "");
      url = path.join(settings.userDataPath(), url);
    } else if (url.startsWith("library")) {
      url = url.replace("library/", "");
      url = path.join(settings.libraryPath(), url);
    }

    // Use pathToFileURL to ensure correct file:// URL format
    const fileUrl = pathToFileURL(url).href;
    logger.debug(`[Protocol] Request: ${originalUrl} -> ${fileUrl}`);

    // File existence check
    if (!fs.existsSync(url)) {
      logger.error(`[Protocol] File not found: ${url}`);
      return new Response("File not found", { status: 404 });
    }

    // Get file stats for logging
    const stats = fs.statSync(url);
    logger.debug(`[Protocol] File size: ${stats.size} bytes`);

    try {
      const response = await net.fetch(fileUrl);

      if (!response.ok) {
        logger.error(`[Protocol] Fetch failed: ${response.status} ${response.statusText}`);
        return response;
      }

      // Add cache control headers to prevent stale/partial responses
      const headers = new Headers(response.headers);
      headers.set("Cache-Control", "no-cache, no-store, must-revalidate");
      headers.set("Pragma", "no-cache");
      headers.set("Accept-Ranges", "bytes");

      // Monitor stream to track bytes transferred
      let totalBytes = 0;
      const originalBody = response.body;

      if (!originalBody) {
        logger.error(`[Protocol] No response body for ${url}`);
        return new Response("No content", { status: 204 });
      }

      const monitoredBody = new ReadableStream({
        async start(controller) {
          const reader = originalBody.getReader();
          let isClosed = false;

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              totalBytes += value.length;

              // Only enqueue if controller is not closed
              if (!isClosed) {
                try {
                  controller.enqueue(value);
                } catch (enqueueError) {
                  // Controller was closed by consumer, stop reading
                  isClosed = true;
                  break;
                }
              }
            }

            const duration = Date.now() - startTime;
            logger.debug(
              `[Protocol] Transfer complete: ${totalBytes}/${stats.size} bytes in ${duration}ms for ${path.basename(url)}`
            );

            if (totalBytes !== stats.size) {
              logger.warn(
                `[Protocol] SIZE MISMATCH! Expected ${stats.size} bytes, got ${totalBytes} bytes for ${path.basename(url)}`
              );
            }

            // Only close if not already closed
            if (!isClosed) {
              try {
                controller.close();
              } catch (closeError) {
                // Controller already closed, ignore
              }
            }
          } catch (error) {
            logger.error(`[Protocol] Stream error for ${url}:`, error);
            if (!isClosed) {
              try {
                controller.error(error);
              } catch {
                // Controller already closed, ignore
              }
            }
          } finally {
            // Ensure reader is released
            try {
              reader.releaseLock();
            } catch {
              // Already released, ignore
            }
          }
        },
      });

      return new Response(monitoredBody, {
        status: response.status,
        statusText: response.statusText,
        headers: headers,
      });
    } catch (error) {
      logger.error(`[Protocol] Error handling ${originalUrl}:`, error);
      return new Response("Internal error", { status: 500 });
    }
  });

  mainWindow.init();
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  app.quit();
});

app.on("activate", () => {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) {
    mainWindow.init();
  }
});

// Clean up cache folder before quit
app.on("before-quit", () => {
  try {
    fs.emptyDirSync(settings.cachePath());
  } catch (err) {}
});
