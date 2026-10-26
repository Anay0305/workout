# iOS support

Workout uses the same Expo Router screens, journal format and native SQLite storage on iPhone, iPad and Android. The iOS bundle identifier is `com.athrv47.workout`; the EAS project belongs to `athrv47`. Native projects are generated from `app.json`, not maintained by hand.

## Features

- Onboarding, personalized routines, live workouts, history, charts, themes and manual body measurements use the shared application code.
- Native JSON backup import/export uses the iOS document picker and share sheet. Backups can transfer the journal between Android and iOS.
- Rest alerts and weekly training reminders request iOS alert and sound permission when enabled. Only local notifications are used.
- Scrollable forms adjust for the iOS keyboard, including onboarding, workout sets, custom exercises and body measurements. Dragging dismisses the keyboard.
- Bluetooth scale scanning waits for CoreBluetooth initialization and reports denied permission, disabled Bluetooth, unsupported devices and initialization timeouts separately. The iOS Bluetooth purpose string is supplied by the existing BLE config plugin. Scanning is foreground-only and supports the standard Bluetooth Weight Scale service.
- On iPhone, **You → Scale & body data** offers Bluetooth and manual entry. The iOS health adapter contains no imports of Android Health Connect or Intent Launcher. Android-only health controls and Google Play links are hidden. Apple Health import is not implemented.

## Build and install

For the Linux/xtool installation workflow, see [XTOOL.md](XTOOL.md). Build and installation are being handled separately from the compatibility changes recorded here.

EAS-managed Apple signing is also configured:

```sh
npx eas-cli@latest device:create
npm run build:ios
```

This uses the `preview` profile, which creates a standalone internal-distribution app. The registered iPhone must be included in the provisioning profile. Apple Developer sign-in and suitable signing credentials are required. `npm run build:ios:simulator` uses the separate simulator profile; that artifact runs only in the iOS Simulator on a Mac. The production profile builds for App Store distribution and increments the iOS build number.

## Verification — 2026-10-26

Passed during the iOS compatibility work:

- Strict TypeScript check and Expo ESLint.
- All 17 unit tests, including Bluetooth initialization, permission failures, listener cleanup and timeouts.
- All 20 Expo Doctor checks.
- Production Hermes bundle exports for iOS and Android.
- iOS prebuild in an isolated temporary directory; generated Xcode project, Bluetooth permission description, build number and encryption declaration inspected. No generated native project was added to the repository.
- Existing mobile browser and recovery/editing regression flows, covering onboarding, workouts, reload recovery, measurements, backups and corrupt-storage recovery.

These checks do not establish a successful Xcode compile or an installed iPhone runtime. The attempted EAS-managed preview build stopped before compilation because this Expo project did not have Apple signing credentials or a registered Apple team. The separate build/install workflow should record its own result.

On the installed iPhone, verify cold launch and onboarding; workout logging and recovery after force quit; keyboard access to lower form fields; Files/share-sheet backup round trips; notification delivery with the screen locked; and Bluetooth permission, discovery and a confirmed scale reading. Physical scale compatibility remains unverified.
