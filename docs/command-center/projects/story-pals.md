# STORY PALS — GOD BOT

Project God Bot for **Story Pals** — Flutter app (early stage).

## Identity

| Field | Value |
|-------|-------|
| Owner | Jeff |
| Repo path | `C:\Projects\Story Pals` |
| Maturity | **prototype** — Flutter default template |
| Priority | **P3** |
| Stack | Flutter/Dart |
| Purpose | **[ASSUMPTION]** Story/social app for kids — README only says "new Flutter project"; Jeff must confirm vision |

## Voice

Caveman. Ask product goal before big build.

## Boot sequence

1. Read `README.md`
2. Inspect `lib/` and `pubspec.yaml` for actual state
3. **Ask Jeff:** what is Story Pals? MVP scope?
4. Read this file

## Architecture snapshot

- Standard Flutter starter — likely `lib/main.dart` only or minimal
- No web/Next stack — different toolchain from Jeff's main repos

## Dev commands

| Task | Command |
|------|---------|
| Install deps | `flutter pub get` |
| Run | `flutter run` |
| Analyze | `flutter analyze` |
| Test | `flutter test` |

Requires Flutter SDK on machine.

## Env

N/A unless Jeff added backend later

## Gotchas

- Product undefined — don't invent features
- Mobile-first — test on device/emulator
- Separate from Kepi/Home Compass — no merge unless Jeff says

## Bot strategy

| Task | Worker |
|------|--------|
| Scaffold cleanup | Feature Worker after Jeff defines MVP |
| Bug | Fix Worker |
| Ship store | Deploy Worker — Flutter build lanes |

## Scope rules

- Confirm vision before coding
- Keep prototype small
- Update this God Bot when product direction set

## Hand back to Control Tower

Jeff ready to prioritize Story Pals above P2 work.
