import { VitePlugin } from "@electron-forge/plugin-vite";
import os from "os";
import { FusesPlugin } from "@electron-forge/plugin-fuses";
import { FuseV1Options, FuseVersion } from "@electron/fuses";
import pkg from "./package.json" with { type: "json" };

const config = {
  packagerConfig: {
    asar: {
      // Binary files won't work in asar, so we need to unpack them
      unpackDir: `{.vite/build/lib,.vite/build/samples,node_modules/ffmpeg-static,node_modules/@andrkrn/ffprobe-static,node_modules/onnxruntime-node/bin/napi-v3/${os.platform()}/${os.arch()},lib/dictionaries}`,
    },
    icon: "./assets/icon",
    name: "Enjoy-Ultimate",
    executableName: "enjoy-ultimate",
    protocols: [
      {
        name: "Enjoy-Ultimate",
        schemes: ["enjoy"],
      },
    ],
  },
  rebuildConfig: {},
  makers: [
    {
      name: "@electron-forge/maker-dmg",
      config: {
        icon: "./assets/icon.png",
      },
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["darwin", "linux"],
      config: (arch) => ({
        macUpdateManifestBaseUrl: `https://dl.enjoy.bot/app/darwin/${arch}`,
      }),
    },
    {
      name: "@electron-forge/maker-zip",
      platforms: ["win32"],
    },
    {
      name: "@electron-forge/maker-deb",
      config: () => ({
        options: {
          name: "enjoy-ultimate",
          productName: "Enjoy-Ultimate",
          icon: "./assets/icon.png",
          mimeType: ["x-scheme-handler/enjoy"],
        },
      }),
    },
    // new MakerRpm({
    //   options: {
    //     name: "enjoy",
    //     productName: "Enjoy-Ultimate",
    //     icon: "./assets/icon.png",
    //     mimeType: ["x-scheme-handler/enjoy"],
    //   },
    // }),
  ],
  publishers: [],
  plugins: [
    new VitePlugin({
      // `build` can specify multiple entry builds, which can be Main process, Preload scripts, Worker process, etc.
      // If you are familiar with Vite configuration, it will look really familiar.
      build: [
        {
          // `entry` is just an alias for `build.lib.entry` in the corresponding file of `config`.
          entry: "src/main.ts",
          config: "vite.main.config.ts",
          target: "main",
        },
        {
          entry: "src/preload.ts",
          config: "vite.preload.config.ts",
          target: "preload",
        },
      ],
      renderer: [
        {
          name: "main_window",
          config: "vite.renderer.config.ts",
        },
      ],
    }),
    {
      name: "@electron-forge/plugin-auto-unpack-natives",
      config: {},
    },
    // Fuses are used to enable/disable various Electron functionality
    // at package time, before code signing the application
    new FusesPlugin({
      version: FuseVersion.V1,
      [FuseV1Options.RunAsNode]: false,
      [FuseV1Options.EnableCookieEncryption]: true,
      [FuseV1Options.EnableNodeOptionsEnvironmentVariable]: false,
      [FuseV1Options.EnableNodeCliInspectArguments]: true,
      [FuseV1Options.EnableEmbeddedAsarIntegrityValidation]: true,
      [FuseV1Options.OnlyLoadAppFromAsar]: false,
    }),
    {
      name: "electron-forge-plugin-dependencies",
      config: {
        dependencies: Object.keys(pkg.dependencies),
      },
    },
  ],
};

const macOsCodesignConfig = {
  osxSign: {},
  osxNotarize: {
    tool: "notarytool",
    appleId: process.env.APPLE_ID,
    appleIdPassword: process.env.APPLE_APP_PASSWORD,
    teamId: process.env.APPLE_TEAM_ID,
  },
};

if (
  os.platform() === "darwin" &&
  process.env.APPLE_ID &&
  process.env.APPLE_APP_PASSWORD &&
  process.env.APPLE_TEAM_ID
) {
  config.packagerConfig = {
    ...config.packagerConfig,
    ...macOsCodesignConfig,
  };
}

if (process.env.GITHUB_TOKEN) {
  config.publishers = [
    ...config.publishers,
    {
      name: "@electron-forge/publisher-github",
      config: {
        repository: {
          owner: "ZuodaoTech",
          name: "everyone-can-use-english",
        },
        generateReleaseNotes: true,
        draft: true,
      },
    },
  ];
}

if (
  process.env.S3_ACCESS_KEY_ID &&
  process.env.S3_SECRET_ACCESS_KEY &&
  process.env.S3_ENDPOINT
) {
  config.publishers = [
    ...config.publishers,
    {
      name: "@electron-forge/publisher-s3",
      config: {
        accessKeyId: process.env.S3_ACCESS_KEY_ID,
        secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
        endpoint: process.env.S3_ENDPOINT,
        bucket: "download",
        folder: "app",
        region: "auto",
        public: true,
      },
    },
  ];
}

export default config;
