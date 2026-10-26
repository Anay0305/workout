# Native iPhone build and installation from Linux

Workout remains an Expo/React Native app. EAS compiles a native ARM64 release on
macOS; `xtool install` provisions, signs and installs that IPA locally. There is
no web wrapper, Expo Go dependency or development server in the installed app.
`xtool dev` is for SwiftPM projects and is not used here.

The EAS project is https://expo.dev/accounts/athrv47/projects/workout. The original
Android build linked in the main README belongs to the previous Expo project.
The iOS bundle identifier is `com.athrv47.workout`.

## Latest installation — 2026-10-26

[EAS build 51527e24-0db1-4d15-b9ee-80d868d37918](https://expo.dev/accounts/athrv47/projects/workout/builds/51527e24-0db1-4d15-b9ee-80d868d37918)
includes the floating mobile dock, light and dark appearance, and the detailed
muscle map. The unsigned IPA is `artifacts/workout-unsigned-build-3.ipa` (SHA-256
`2420ee583be2ebe15f7bde52797eb160da819ffe0cd2134c968f507e05e09a2d`).
ZIP integrity, version 1.0.0 (build 3), and the embedded JavaScript bundle were
verified. `xtool install --usb` signed and successfully installed it on Athrv’s
connected iPhone. Remote launch still returns `DebugserverClient.Error.unknown`,
so open Workout on the phone to check its on-device behavior.

## Previous installation — 2026-10-26

[EAS build 1b866509-ad63-4cdb-83ef-4bcb629e8371](https://expo.dev/accounts/athrv47/projects/workout/builds/1b866509-ad63-4cdb-83ef-4bcb629e8371)
completed with the BHIM-derived muscle map and the latest UI changes. The unsigned
IPA is `artifacts/workout-unsigned-build-2.ipa` (SHA-256
`66287bc21132693a78f0649e89fb13e403e04e6871d704def1292ce20ea790a5`).
Its ZIP integrity, embedded JavaScript bundle, and version 1.0.0 (build 2) were
verified. `xtool install --usb` signed and successfully installed it on Athrv’s
connected iPhone. Remote launch still returns `DebugserverClient.Error.unknown`,
so open Workout on the phone to check its on-device behavior.

## Verified installation — 2026-10-26

[EAS build 795859aa-9607-4840-8f47-f97e3c57d304](https://expo.dev/accounts/athrv47/projects/workout/builds/795859aa-9607-4840-8f47-f97e3c57d304)
completed successfully with Xcode 27.1. The IPA's ZIP integrity, ARM64 executable
and embedded JavaScript bundle were checked before signing. xtool signed and
installed version 1.0.0 (build 1) on the connected iPhone running iOS 27.0.
The phone's installation service independently confirmed the installed identifier
`XTL-TJ3GUJC2YK.com.athrv47.workout` and Apple Development signer.

The unsigned IPA and SHA-256 checksum are in `artifacts/`. Lint, typecheck and all
17 unit tests passed before upload. The source hashes captured at upload are in
`artifacts/ios-build-source-hashes.json`; later workspace edits are not in this
build. Remote launch returned `DebugserverClient.Error.unknown`, so launch and
on-device app behavior still need checking by opening Workout on the phone.

## Build

```sh
npm ci
npm run lint
npm run typecheck
npm test
npx --yes eas-cli@latest whoami
npm run ios:build:xtool
```

The `xtool` profile in `eas.json` runs `.eas/build/ios-xtool.yml`. Expo generates
the native project and installs its CocoaPods dependencies. Xcode archives a
Release build with signing disabled, then the workflow packages and uploads
`workout-unsigned.ipa`. It checks that the app contains its JavaScript bundle.
Apple credentials are not needed by or uploaded to this build workflow.

Download the application archive from the completed build's Expo page and save
it as `artifacts/workout-unsigned.ipa`. The artifacts directory is ignored by Git
and excluded from future EAS uploads.

## Install or renew the signature

Connect and unlock the iPhone, trust this computer, and enable Developer Mode.
On this machine, xtool is already installed and authenticated. If setting up a
different machine, follow https://xtool.sh/documentation/xtooldocs/installation-linux
and log in privately with `xtool auth login`.

```sh
xtool auth status
xtool devices --usb --no-wait
npm run ios:install -- artifacts/workout-unsigned.ipa
```

Open **Workout** on the phone. If iOS requests developer trust, use Settings →
General → VPN & Device Management. A free Apple account typically signs apps for
seven days; repeat the install command to renew without uninstalling the app.
Uninstalling removes the local workout journal, so export a backup first if you
intend to remove the app.

xtool may prefix the installed bundle ID with the signing team, for example
`XTL-TJ3GUJC2YK.com.athrv47.workout`. Use the installed identifier for any
`xtool launch` command; remote launch also depends on the phone's developer
services being available. Manual launch works independently of those services.

## iPhone features

The release includes native SQLite journal storage, Bluetooth scale support,
backup import/export, haptics, rest notifications and training reminders. Scale
support depends on the device exposing the standard Bluetooth weight service;
physical scale compatibility still needs testing. Health Connect is Android-only
and this app does not currently import Apple Health measurements.

Only local notifications are used. `enableRemoteNotifications: false` keeps the
unused APNs entitlement out of the generated iOS project while retaining local
reminders. Do not edit the generated `ios/` directory; change Expo configuration
or config plugins instead.
