# Motor Simulator

Motor, reducer, ball screw, LM guide, encoder recommendation and load calculation workflows are bundled into one app.

## Web Development

- Dev server: `node scripts/electron-dev.mjs` for desktop mode after Electron packages are installed
- Web dev only: `vite --configLoader native`
- Web build: `vite build --configLoader native`

## Desktop Packaging

This project is prepared for an offline-capable Windows desktop app using Electron.

### Added Desktop Entry Points

- Electron main process: [electron/main.cjs](./electron/main.cjs)
- Electron preload bridge: [electron/preload.cjs](./electron/preload.cjs)
- Desktop dev runner: [scripts/electron-dev.mjs](./scripts/electron-dev.mjs)
- Desktop packaged launch runner: [scripts/desktop-start.mjs](./scripts/desktop-start.mjs)
- Desktop installer build runner: [scripts/desktop-dist.mjs](./scripts/desktop-dist.mjs)

### Intended Commands

- `npm install`
- `npm run desktop:dev`
- `npm run desktop:build`
- `make_installer.cmd`

### Build Output

Electron Builder is configured to generate these Windows artifacts into `release/`:

- NSIS installer
- Portable executable

## Offline Use

- The desktop app runs fully offline after installation.
- Current product database persistence uses local app storage in the Chromium profile, so uploaded LM guide and encoder entries remain on the same PC after restart.
- External web links still require internet when opened.

## Update Strategy

Two update paths are supported operationally:

1. Connected environment
- Distribute a newer installer through a network share, internal web server, or release channel.
- Users install the newer version over the current one.

2. Offline field environment
- Deliver the new installer or portable build by USB or internal closed network.
- Run the newer installer on top of the existing installation.

At this stage, the app is installer-ready and update-friendly, but fully automatic online update delivery still needs a real release source such as:

- internal HTTP file server
- GitHub Releases
- shared folder distribution process

## Notes

- `package.json` now includes Electron and Electron Builder configuration.
- If this machine does not have `npm` available in `PATH`, install Node.js with npm first, then run the desktop packaging commands.
