# Third-party dependencies

## Microsoft Edge WebView2

The Windows host uses the Microsoft Edge WebView2 SDK and WebView2 Runtime. The build script downloads the development library from NuGet. This repository does not commit SDK binaries.

- Package: `Microsoft.Web.WebView2`, build version `1.0.4191.47`.
- Package and license: https://www.nuget.org/packages/Microsoft.Web.WebView2/1.0.4191.47
- Documentation: https://learn.microsoft.com/microsoft-edge/webview2/

WebView2 and the Windows / .NET Framework components keep their own license terms. This project's GPL-3.0 license does not change those terms.

## NSIS

The Windows installer is built with NSIS 3.13. The portable compiler is downloaded only at build time and is not committed as project source. NSIS and its compression modules keep their own licenses; see https://nsis.sourceforge.io/License. The installer includes a ZIP of the matching project source.
