---
title: Ways to show a website in an Android app
area: android
created: 2026-11-08
updated: 2026-11-08
prerequisites: []
related: [android/app-signing]
projects: [skip-the-fluff]
tags: [android, webview, custom-tabs, trusted-web-activity, geckoview, sign-in]
---

# Ways to show a website in an Android app

## TL;DR

- An Android app can show a website in four ways: a **WebView**, a **Custom Tab**, a **Trusted Web Activity**, or a **browser engine of its own**, such as GeckoView.
- Only a WebView or an engine of the app's own lets the app **change the page**: run its own CSS and JavaScript, and decide where links go.
- A Custom Tab is the phone's **browser** wearing the app's colours. It shares the browser's sign-ins, but the app cannot touch the page.
- A Trusted Web Activity is a Custom Tab without the address bar, and only for a site whose **owner** has named the app.
- Google refuses its sign-in inside a WebView. That is the main cost of choosing one.

## Key claims

- <a id="c1"></a>**C1.** An Android app can show a website in a WebView, in a Custom Tab, in a Trusted Web Activity, or in a browser engine it bundles, such as Mozilla's GeckoView.
- <a id="c2"></a>**C2.** In a WebView, the app can run its own CSS and JavaScript in the page and decide, for each navigation, whether to follow it or open it elsewhere. Windows' counterpart is the WebView2 control.
- <a id="c3"></a>**C3.** In a Custom Tab, the phone's browser shows the page with a toolbar that displays the address. The app cannot read or change the page.
- <a id="c4"></a>**C4.** A Custom Tab shares the browser's cookies and sign-ins. A WebView keeps its own, so a user signed in in the browser must sign in again in the app.
- <a id="c5"></a>**C5.** A Trusted Web Activity shows a site full screen without an address bar only if the site publishes a Digital Asset Links file that names the app. Without it, the browser shows the address bar. Like a Custom Tab, it does not let the app change the page.
- <a id="c6"></a>**C6.** Google refuses sign-in with a Google account inside an embedded WebView. The same sign-in works in a Custom Tab, because that is the real browser.
- <a id="c7"></a>**C7.** Android's System WebView is updated through the Play Store, independently of the apps that use it. A browser engine bundled in an app is updated only when the app's developer ships a new release.

## Explanation

### Two questions decide it

Two questions decide which option fits. Does the app need to **change the page**? And who **owns the site**?

- If the app only needs to *show* a site, such as a help page or a sign-in, a **Custom Tab** is the simple choice ([C3](#c3)). The user gets their real browser, with saved passwords and sign-ins ([C4](#c4)). It is like `Process.Start(url)` opening Edge, except that the tab looks like part of the app.
- If the app is a **site's own** app, a **Trusted Web Activity** shows it full screen ([C5](#c5)). The site proves that it agrees by publishing a small file that names the app. Nobody else can use it for that site.
- If the app must **change** the page, only a **WebView** ([C2](#c2)) or a **bundled engine** ([C1](#c1)) will do. Examples are hiding parts of it, or keeping it inside the app when links point elsewhere.

### WebView compared with a bundled engine

Both let the app run its own code in the page. They differ in who keeps the engine up to date. Android updates the System WebView through the Play Store, so security fixes arrive without a release of the app ([C7](#c7)). A bundled engine such as GeckoView makes the app tens of megabytes larger. Its security fixes reach users only when the developer releases a new version of the app.

### The price of a WebView: sign-in

A WebView is inside the app, so the app *could* read what the user types there. Google therefore refuses its account sign-in in embedded WebViews ([C6](#c6)). Apps that need Google sign-in open it in a Custom Tab instead. A WebView also does not share the browser's sign-ins ([C4](#c4)), so users sign in once more inside the app.

## Examples

[Skip the Fluff](https://github.com/thomaswening/skip-the-fluff) shows duolingo.com with its distracting screens hidden ([ADR-0001](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0001-android-webview.md)). Walking through the two questions:

| Option | Can it hide parts of the page? | Verdict |
|---|---|---|
| Custom Tab | no ([C3](#c3)) | rejected: nothing could be hidden |
| Trusted Web Activity | no, and Duolingo would have to name the app ([C5](#c5)) | rejected |
| GeckoView | yes | set aside: a larger app and engine updates to ship by hand ([C7](#c7)) |
| WebView | yes ([C2](#c2)) | chosen. Google sign-in goes to the browser ([C6](#c6)). Users sign in once with email and password ([C4](#c4)) |

## Pitfalls

- **Expecting a Custom Tab to let the app hide or change things.** It is the browser. The app only chooses the colours ([C3](#c3)).
- **Planning a Trusted Web Activity for someone else's site.** Only the site's owner can publish the file that removes the address bar ([C5](#c5)).
- **Assuming a WebView user is signed in because they are signed in in Chrome.** The cookies are separate ([C4](#c4)).
- **Building Google sign-in inside a WebView.** Google rejects it ([C6](#c6)).

## Exercises

1. **Decide.** A bank wants its own website shown full screen in its Android app, without changing anything on the page. Which option fits, and what must the bank do on its website?

   <details><summary>Solution</summary>

   A Trusted Web Activity. The bank publishes a Digital Asset Links file on its site that names the app, so the browser shows the site without the address bar ([C5](#c5)).

   </details>

2. **Explain.** Why can an app that uses a Custom Tab offer "Sign in with Google", while an app that uses a WebView cannot?

   <details><summary>Solution</summary>

   A Custom Tab is the user's real browser, which Google trusts and which may already be signed in ([C4](#c4)). A WebView is embedded in the app, which could read the password, so Google refuses its sign-in there ([C6](#c6)).

   </details>

## Sources

- Claude session on Skip the Fluff, 2026-11-08: [ADR-0001](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0001-android-webview.md) and its spike, [PR #5](https://github.com/thomaswening/skip-the-fluff/pull/5).
- Android Developers: [Build web apps in WebView](https://developer.android.com/develop/ui/views/layout/webapps/webview).
- Chrome for Developers: [Overview of Android Custom Tabs](https://developer.chrome.com/docs/android/custom-tabs).
- Android Developers: [Trusted Web Activity](https://developer.android.com/develop/ui/views/layout/webapps/trusted-web-activities).
- Google for Developers: [Upcoming security changes to Google's OAuth 2.0 authorization endpoint in embedded webviews](https://developers.googleblog.com/2021/06/upcoming-security-changes-to-googles-oauth-2.0-authorization-endpoint.html).
