# Smoke test — EDITORS.RACI

Is `EDITORS.RACI` deployed? Written by `.apk.scripts/smoke.py` from the module's own shape; what each check means is in that script's header.

← [Wiki home](../README.md)

**✅ PASS** — 3/3 checks, since 2026-11-12 00:27 EST

| Check | Target | Result | Detail |
|---|---|---|---|
| pushed | [APK.softapp.EDITORS.RACI](https://github.com/LikeDotAudio/APK.softapp.EDITORS.RACI.git) | ✅ | HEAD is on origin |
| web | [index.html](https://apk.audio/APK%3ASoftapps/EDITORS/EDITORS.RACI/index.html) | ✅ | HTTP 200 |
| app | `OS/RACI Matrix` → `PODS/POD.THIN/Softapps/EDITORS/EDITORS.RACI/index.html` | ✅ | present |

Re-run: `python3 .apk.scripts/smoke.py PODS/POD.THIN/Softapps/EDITORS/EDITORS.RACI`

<!-- smoke:sig b760dce8523a since 2026-11-12 00:27 EST -->
