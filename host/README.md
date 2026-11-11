# Deskland Windows host

C# / .NET Framework and WebView2 attach theme pages under the Windows desktop icon layer.

## Build and run

```powershell
powershell -ExecutionPolicy Bypass -File host\build.ps1
host\bin\Deskland.exe
```

The build script uses the C# compiler shipped with Windows and downloads a pinned WebView2 SDK from NuGet on first run. Dependencies stay in `host/lib/` and output stays in `host/bin/`. Neither directory is committed.

## Common arguments

| Argument | Behavior |
| --- | --- |
| (none) | Start the wallpaper and open settings; if already running, open settings |
| `--autostart` | Start in the background without opening settings |
| `--settings` | Open settings |
| `--menu` | Open the tray menu |
| `--exit` | Exit normally and restore the system wallpaper |
| `--exit-installed` | Used by the installer: exit only the instance whose executable path matches |

## Behavior and data

- Themes come from `prototype/themes.json`. Only themes with status `ready` are loaded.
- Desktop icon positions are checked every 400ms. The theme page is notified only when they change.
- Animation pauses when a foreground window is maximized or full screen. Starting the wallpaper does not steal focus. The host window itself, invisible windows, and cloaked windows do not trigger pause. The tray can pause and resume manually. The settings page refreshes its cache by program version. Thumbnails use embedded images and real `<img>` tags.
- Windows 11 24H2 and later use a layered Progman child window. Earlier systems use WorkerW.
- Coverage is the primary monitor only. A system wallpaper slideshow or Windows Spotlight change can flash briefly.
- Settings are saved to `%LOCALAPPDATA%\DesklandPreview\settings.json`. The log is `host.log` in the same directory.
- There is no account login, purchase restore, or automatic update check. The host does not contact the network for a new version at startup or when settings open.
- Sharing uses icon positions only. The theme page draws sample icons and name blocks. It does not capture desktop windows.
- After a theme page change, use tray "Reload". After a host C# change, exit and rebuild.

Installation tests can set the absolute-path environment variable `DESKLAND_PROFILE_DIR` to isolate settings, the WebView2 cache, and single-instance events. That mode skips old-data migration and does not write startup entries. A normal launch leaves this variable unset and keeps using the regular data directory.

## Page messages

The settings page sends `hello`, `set`, `reset`, `theme`, `lang`, `autostart`, and share-related messages. The host sends the initial settings, icon rectangles, and share results.

After the theme page sends `ready`, the host sends settings, then icon positions. Later it sends parameter changes, icon changes, and pause state. Settings and theme pages both load from a local virtual host.
