# Deskland Preview

**Adaptive Windows wallpaper that makes your desktop icons part of the scenery.**

Deskland turns the space around your icons into a living landscape. Move, add or remove an icon and the scenery quietly reshapes around it — in real time, without AI, an account or an API key.

This is the **free, open-source Preview**, not a time-limited trial. It includes eight free themes — Beach, Night Beach, Meadow, Night Meadow, Forest, Night Forest, Old Map, and Dark Map — plus the Windows host, settings, and sharing tools.

[Official website](https://deskland.app) · [Features](#features) · [Build from source](#build-from-source)

![Meadow — included in Deskland Preview](docs/images/meadow.webp)

![Beach — included in Deskland Preview](docs/images/beach.webp)

![Maldives — locked-theme preview](docs/images/maldives.webp)

Meadow and Beach are included in Preview. Maldives is shown as a locked-theme preview.

## Included themes

| Beach | Meadow |
| --- | --- |
| ![Beach theme](prototype/thumbs/beach.webp) | ![Meadow theme](prototype/thumbs/meadow.webp) |
| Turquoise waves, kayaks, seabirds and coconut palms. | Drifting clouds and shadows, a boy flying a kite and a little black cat. |

Night Beach and Night Meadow are the night palettes of those two themes. Forest is the same gouache woods as the [forest prototype](https://deskland.app/demo/forest): icons sit in a clearing, trees sway around it, and birds stay in the woods. Night Forest is that same woods after dark, with no moon. Old Map is a parchment map, the same scene as the [worldmap prototype](https://deskland.app/demo/worldmap): icons become sea, towns are linked by dotted roads, and wagons and ships travel between the towns. Dark Map is that same chart on dark paper with pale ink.

The settings list hides locked themes. **Their page code, parameters, and implementation are not included.**

## Features

- **Adaptive scenery:** uses the real positions of desktop icons and transitions smoothly when they move.
- **Eight free themes:** Beach, Night Beach, Meadow, Night Meadow, Forest, Night Forest, Old Map, and Dark Map. Their settings are included and saved between sessions. Locked themes stay out of the settings list.
- **Made for the desktop:** tray controls, startup on sign-in and automatic pause when a window is maximized or full-screen.
- **Private sharing:** image and animation exports use sample icons and color blocks, never a screenshot of your desktop or real file names.
- **Independent installation:** Preview uses its own install directory, settings, startup entry and instance identity, so it can coexist with other Deskland builds.
- **English only:** no zh-CN locale, sign-in, purchase restoration, update service or store API is included.

## Requirements

- Windows 10 or Windows 11, 64-bit.
- Microsoft Edge WebView2 Runtime.
- PowerShell and the .NET Framework C# compiler included with Windows; no .NET SDK installation is required.
- An internet connection for the first build, which downloads the WebView2 development library.
- Node.js only if you want to run the browser preview.

Currently, Deskland renders on the **primary monitor** and targets 30 fps on integrated graphics.

## Build from source

Open PowerShell in the repository root:

```powershell
powershell -ExecutionPolicy Bypass -File host\build.ps1
host\bin\Deskland.exe
```

Keep `host/` and `prototype/` together. Build output is written to `host/bin/`.

Run the program again or double-click its tray icon to open Settings. To exit and restore the original Windows wallpaper, use the tray menu or run:

```powershell
host\bin\Deskland.exe --exit
```

Preview settings and logs are stored separately in `%LOCALAPPDATA%\DesklandPreview`.

## Browser preview

```powershell
node prototype\serve.mjs
```

Open **http://localhost:5178/settings.html**. The browser uses sample icons; adaptation to real desktop icons requires the Windows host.

## Windows installer

Build the NSIS installer without installing global development tools:

```powershell
powershell -ExecutionPolicy Bypass -File tools\build-installer.ps1
```

The first build downloads portable NSIS and Microsoft's WebView2 bootstrapper. Artifacts are written to `dist/` with SHA256 checksums and a matching source ZIP.

The installer targets the current user's `Programs\Deskland Preview` directory and does not require administrator rights. If WebView2 is missing, its bootstrapper requires an internet connection. Uninstalling preserves user settings.

[Download Deskland Preview for Windows](https://github.com/BLEZZ0102/Deskland/releases/latest). The installer is unsigned, so Windows SmartScreen may show a warning.

## Project layout

| Path | Contents |
| --- | --- |
| `host/` | Windows host, build scripts and application manifest |
| `prototype/flat.html` | Beach theme |
| `prototype/beach-night.html` | Night Beach; redirects to `flat.html` with `night=1` |
| `prototype/meadow.html` | Meadow theme |
| `prototype/meadow-night.html` | Night Meadow; redirects to `meadow.html` with `night=1` |
| `prototype/worldmap.html` | Old Map theme. `worldmap-dark.html` adds `dark=1` |
| `prototype/forest.html` | Forest theme. `forest-night.html` adds `night=1` |
| `prototype/settings.html` | Settings interface |
| `prototype/themes.json` | English free-theme definitions and locked-theme display metadata |
| `prototype/share.js` | Privacy-preserving image and animation sharing |
| `prototype/assets/` | Images used by the included themes |
| `tools/` | Installer build tooling |

## Known limitations

- Only the primary monitor is supported.
- Windows Spotlight or a wallpaper slideshow can briefly flash when Windows changes the background image.
- Preview does not include account sign-in, entitlement restoration, automatic updates or the locked themes' implementation.

## Credits and license

Source code and included theme assets are released under [GPL-3.0](LICENSE). Third-party dependencies are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

The Deskland name and icon are not licensed as trademarks; modified distributions should use their own name and icon. See [TRADEMARKS.md](TRADEMARKS.md).

Issues and suggestions are welcome through GitHub Issues. This is an independent project, so immediate responses are not guaranteed.
