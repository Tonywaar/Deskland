# Deskland theme engine — knowledge base

Scanned 2026-11-11 from this Preview repo. Use this before adding a theme.

Deskland is a Windows adaptive wallpaper. A WebView2 window sits under the real desktop icons. The theme page paints scenery that reshapes when icons move. No AI, no account, no network at runtime.

This repo is **Deskland Preview**. The app UI, comments, and docs are English only. There is no zh-CN locale. Strings in `themes.json` are English.

Free ready themes: `beach`, `meadow`, `meadow-night`, `beach-night`, `worldmap`, `worldmap-dark`, `forest`, and `forest-night`. Locked catalog entries stay in `themes.json` with no `page` and no `groups`, and the settings list does not show them.

## Layout

| Path | Role |
| --- | --- |
| `host/DesktopHost.cs` | Tray, wallpaper window, icon poll, pause, settings save, share |
| `host/Themes.cs` | Loads `themes.json`; only `status: "ready"` plus `product: "free"` may run |
| `prototype/themes.json` | Theme catalog. Settings UI is generated from this file. Display strings are English |
| `prototype/flat.html` | Beach theme (complete). `?night=1` is the night palette |
| `prototype/beach-night.html` | Night Beach. Redirects to `flat.html` with `night=1`, keeping `wallpaper` or `preview` |
| `prototype/meadow.html` | Meadow theme (complete). `?night=1` is the night palette |
| `prototype/meadow-night.html` | Night Meadow. Redirects to `meadow.html` with `night=1`, keeping `wallpaper` or `preview` |
| `prototype/worldmap.html` | Old Map (free, ready) |
| `prototype/forest.html` | Forest (free, ready) |
| `prototype/beach-palms.js` | Beach palms, local layer |
| `prototype/meadow-boy.js` | Boy + kite, local textures |
| `prototype/meadow-cat.js` | Cat, scissor-limited redraw |
| `prototype/settings.html` | Settings UI and live preview iframe |
| `prototype/share.js` | Privacy share. Loaded at the end of every theme page |
| `prototype/i18n/en.json` | English UI strings. No zh-CN locale |
| `prototype/serve.mjs` | Browser preview on port 5178 |
| `prototype/thumbs/` | Hand-made thumbnails. Do not regenerate or overwrite |

Product display name is `Deskland Preview`. Data lives in `%LOCALAPPDATA%\DesklandPreview`. Do not point it back at a shared Deskland identity.

## How a frame gets on the desktop

1. Host builds a borderless `WallpaperForm` (`Text = "DesklandWindow"`).
2. WebView2 maps folder `prototype/` to `https://app.local/`.
3. Wallpaper URL is `https://app.local/{page}?wallpaper=1`.
4. Win11 24H2+ attaches under Progman. Older Windows uses WorkerW. Primary monitor only.
5. Z-order stays just below the icon list. System wallpaper WorkerW is pushed to the bottom.
6. Icon positions are polled every 400 ms. A message is sent only when the JSON changes.
7. Foreground is polled every 500 ms. Maximized or fullscreen windows pause the wallpaper. Own window, invisible windows, and cloaked windows do not.
8. HTML/JS edits do not need a host rebuild. Tray **Reload** reloads the page. C# edits need `powershell -ExecutionPolicy Bypass -File host\build.ps1`.

Browser preview: `node prototype/serve.mjs`, then `http://localhost:5178/settings.html`. Sample icons only. Real icon positions need the host.

## Who may load

`Themes.Allowed` requires:

- `status` exactly `"ready"`
- a `page` file name
- `product` exactly `"free"`

Preview's ownership callback always returns false. A ready theme without `product: "free"` will not load. Missing or unknown theme falls back to beach, then meadow.

Locked catalog entries have `status: "locked"` and `locked: true`. They have no `page` and no `groups`. Clicking one opens the purchase note. It must not switch the wallpaper.

## themes.json entry

Free theme shape (meadow is the fuller example):

```json
{
  "id": "meadow",
  "adaptive": true,
  "name": "Meadow",
  "desc": "A pen-and-wash meadow where your icons hide in white clouds that cast dark green shadows",
  "page": "meadow.html",
  "status": "ready",
  "product": "free",
  "thumb": "url(thumbs/meadow.webp?v=…) center / cover no-repeat, <css fallback>",
  "thumbSource": "custom",
  "groups": [
    {
      "name": "Clouds",
      "params": [
        {
          "key": "cover",
          "label": "Clouds over the meadow",
          "hint": "…",
          "min": 0,
          "max": 1,
          "step": 0.01,
          "default": 0.3,
          "format": "percent"
        }
      ]
    }
  ]
}
```

Rules:

- `id` is the settings key. Saved under `settings.json` → `params[id]`.
- `name`, `desc`, group `name`, and param `label` / `hint` / `options` / `unit` are English. `themes.json` is the source of truth. There is no zh-CN locale.
- UI chrome strings live in `prototype/i18n/en.json`. Do not add `zh-CN.json` or any other locale.
- `adaptive: true` shows the settings toggle that sends `adaptive` as `0` or `1`. Omit it if the theme has no such switch. Meadow has it. Beach does not.
- Slider param: `key`, `label`, `min`, `max`, `step`, `default`, optional `hint`, `unit`, `format`.
- `format`: `"percent"` prints `Math.round(v * 100) + '%'`. `"times"` prints `×` plus two decimals. Otherwise integer step prints a rounded number, fractional step prints two decimals, then optional `unit`.
- Choice param: `options` is a string array. `default` is the index (`0` or `1` in meadow). Settings sends that index.
- `seed` is not listed in `groups`. Settings injects it on first select and on Refresh. The page must honor `settings.v.seed`.
- Defaults in the page `P` object must match `themes.json` defaults. Comment in both theme pages says this explicitly.
- Internal knobs (beach `speed`, `runup`, `wave`, `grain`, `quality`; meadow `warp`, `edge`, `grain`, `quality`) may live in `P` and stay off the public groups.
- `thumb` is a CSS `background` value: custom webp first, gradient fallback second. Settings also extracts the `url(...)` into a real `<img>`. Do not replace files in `prototype/thumbs/`.

## Old Map (`worldmap`)

Free and ready. Page `worldmap.html`. Same parchment map as the [worldmap prototype](https://deskland.app/demo/worldmap).

- Icons become sea.
- Towns are linked by dotted roads.
- Wagons and ships travel on the map.
- Public params:
  - `sigma`: sea size, 50–200, default 80
  - `ships`: 0–3, default 2
  - `wagons`: 0–8, default 5

## Forest (`forest`)

Free and ready. Page `forest.html`. Same gouache woods as the [forest prototype](https://deskland.app/demo/forest).

- Icons sit in a clearing.
- Pines, round crowns, and shrubs fill the rest and sway in the wind.
- Birds perch on treetops and sometimes fly to a nearby tree.
- Public params:
  - `sigma`: clearing size, 40–200, default 85
  - `wind`: 0–3, default 1
  - `birds`: 0–12, default 5

## Page modes

Beach and Meadow read the query string the same way. Night Beach and Night Meadow redirect onto those pages with `night=1`.

- no flag: standalone prototype. Fake desktop, taskbar, debug panel, draggable sample icons.
- `?wallpaper=1`: host. Add class `wall`. Hide panel, taskbar, fake desktop. Real icons stay Windows-drawn.
- `?preview=1`: settings iframe. Add classes `wall` and `preview`. Draw ghost rectangles at icon rects. Canvas scale is `0.45`. Ignore pause so the settings preview keeps moving.

Settings sets `iframe.src` to `{page}?preview=1`, sizes the iframe to the real screen CSS pixels, then CSS-scales it into the preview box.

## Message contract

Theme → host (WebView2), once, after listeners exist:

```text
ready
```

Plain string, not JSON.

Theme → settings parent (preview only):

```json
{"t":"ready"}
```

Host / parent → theme, JSON strings:

| `t` | Payload | Meaning |
| --- | --- | --- |
| `settings` | `v` object, partial | Apply known params. Includes full defaults on preview ready, and `{seed}` on reseed |
| `reset` | optional `v` | Apply `Object.assign({}, DEFAULTS, v)` |
| `icons` | `vis` bool, `r` array of `[l,t,r,b]` | Icon rects in **physical pixels**, origin at the wallpaper screen. `vis: false` means no icons |
| `pause` | `v` bool | Wallpaper only. Preview forces `paused = false` |
| `snapshot` | none | From host via `share.js`. Reply `snapshot\|thumbDataUrl\|pngDataUrl` or `snapshot\|error\|message` |
| `record` | none | From host via `share.js`. Progress `recprogress\|0.00`. Done `record\|mime\|poster\|video` |

Order after `ready`: settings first, then icons, then pause. Shore / cloud radius must use the settings values before the first field build. Beach and Meadow call `commit(true)` once before any icons so the first scene exists, then morph in when icons arrive.

Icon conversion used by Beach and Meadow:

```js
const k = window.devicePixelRatio || 1;
icons = m.vis ? m.r.map(([l, t, r, b]) => ({
  x: l / k, y: t / k, w: (r - l) / k, h: (b - t) / k
})) : [];
```

`icons` entries are `{x, y, w, h}` in CSS pixels. Wallpaper mode does not create DOM icons. Preview draws `.ghost` boxes. Standalone mode creates `.icon` DOM nodes.

Settings → host (for orientation, not implemented inside the theme page):

- `hello`, `set` `{theme, key, value}`, `reset` `{theme}`, `theme` `{id}`, `lang`, `autostart`
- Host answers settings with `init` and later `themeChanged`
- One param change becomes one `set`, then the host forwards `{t:"settings", v:{key:value}}` to the live wallpaper and the preview iframe

`applySettings` must ignore unknown keys and reject type mismatches against `P`. Old settings files may still contain removed keys (`grain`, `quality`).

## Rendering pattern Beach and Meadow share

- One fullscreen canvas `#art`. WebGL2. A single triangle covers the view.
- `cv` is the canvas. `draw(now)` paints one frame. `W`, `H` are CSS pixel viewport size.
- Canvas backing store uses `getBoundingClientRect()` times scale, then `Math.round`. Do not use integer `innerWidth` alone. A 2560 px screen at 150% is 1706.67 CSS px; rounding the viewport and not the canvas blurs the image.
- Wallpaper scale: `min(devicePixelRatio, P.quality)` with `quality: 2` so 150% is not upscaled. Preview scale: `0.45`.
- `cap30: true` skips frames closer than 31 ms. Target is 30 fps on integrated graphics.
- `paused` skips the animation loop. Beach `settlePaused` still finishes the first terrain and icon layout if pause arrives beside the first icon message. Copy that if the first frame depends on a field morph.
- Icon influence is a CPU field, grid step `STEP = 5` CSS px, stored as `R16F` textures. Two fields (`FA` → `FB`) morph over `MORPH_MS = 1800` (first reveal 2600). Shader samples the mix. Recompute the field when icons or field params change, not every frame.
- Noise is a baked texture. Static paper, sand, or grass belongs in a cache. Do not evaluate hundreds of objects inside the fullscreen shader.
- Small actors (cat, boy, palms, kayaks, birds) update on the CPU or in a small texture and composite locally. Meadow cat uses `gl.SCISSOR_TEST` around the cat bounds for the second pass.
- `requestAnimationFrame` always stays scheduled. Pause returns early and zeros `lastT` so the next resume does not take a huge `dt`.

Meadow public params: `sigma` (cloud radius, rebuilds field), `cover`, `flow`, `showBoy`, `showCat`, plus `adaptive`. Boy and cat scripts are separate files and are skipped when hidden; route state for the boy is kept so the cat can still avoid it.

Beach public params: `sigma`, `warp` (both rebuild field), `shoal`, `shallow`, `palms`, `kayaks`, `birds`.

## Share contract (`share.js`)

Append `<script src="share.js"></script>` after the theme script. It expects these globals:

- `cv`, `draw`, `icons`, `W`, `H`, `WALL`
- `paused` (optional but should exist)
- `TASKBAR` (used when recording a demo with no icons)
- optional `renderLabels()`, `cacheOK` if the theme caches 2D labels or land art that must rebuild when canvas size changes
- `commit()` if recording moves icons and the scene must follow

Share never screenshots. It replays `draw()` at device pixels and paints sample glyphs plus white name pills at icon positions. Kind and name length are hashed from position. Expose `window.desklandSnapshot` and `window.desklandRecord` (share.js does this).

After a theme change, check icon motion, preview, pause, and share.

## Performance rules (project)

- Resident wallpaper. 30 fps on iGPU.
- Static drawing goes into a cache.
- Small objects use a local layer.
- Do not walk large object lists inside the fullscreen shader.
- Upload only what changed (field on icon move, circle atlas per frame for meadow clouds, actor textures when the actor moves).

## Adding a new free theme — checklist

1. New page `prototype/<id>.html`. Copy the host bridge from `flat.html` or `meadow.html` (`WALL`, `PREVIEW`, `startHostedMode`, ghosts, `applySettings`, canvas sizing, `cap30`, pause).
2. Keep `P` defaults identical to `themes.json`.
3. Add the theme object: `id`, `page`, `status: "ready"`, `product: "free"`, English `name` / `desc` / `groups`, thumb CSS. Set `adaptive: true` only if the page honors `P.adaptive`.
4. Keep those strings English in `themes.json`. Do not add a zh-CN locale.
5. Load `share.js`. Keep `cv`, `draw`, `icons`, `W`, `H`, `WALL`, `paused`.
6. First icon message must complete the scene even if `pause` is already true.
7. Field / layout work happens when icons or field params change. Animate the cheap part every frame.
8. Do not invent implementation for locked ids (`beach-turquoise`, `lake`, `sky`, `ocean`, `pinkforest`, `map`, `citymap`, `nauticalmap`, `lotus`). They have no `page` and no `groups`.
9. Do not touch `prototype/thumbs/` unless asked.
10. Verify in the browser (`settings.html` preview: change params, reseed, switch theme) and, if the host is running, tray reload: move icons, pause, share.

## Locked catalog (display only)

Name, description, and thumbnail only. No `page`. No `groups`.

| id | Name |
| --- | --- |
| beach-turquoise | Maldives |
| lake | Lake |
| sky | Sky |
| ocean | Ocean |
| pinkforest | Pink Forest |
| map | Hand-drawn City |
| citymap | Colorful City |
| nauticalmap | Nautical Chart |
| lotus | Lotus Pond |

## Out of scope for a theme page

Account login, purchase restore, update checks, extra languages, installer identity, host wallpaper attachment. Theme work stays in `prototype/` plus `themes.json`. UI strings stay in `prototype/i18n/en.json`. There is no zh-CN locale.
