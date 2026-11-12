---
title: Testing page scripts with Playwright Test
area: testing
created: 2026-11-12
updated: 2026-11-12
prerequisites: [web/dom-and-selectors, web/element-visibility, web/event-loop-and-mutation-observer]
related: []
projects: [skip-the-fluff]
tags: [playwright, end-to-end-testing, headless-browser, javascript, xunit]
---

# Testing page scripts with Playwright Test

## TL;DR

- **Playwright** remote-controls a real browser engine (Chromium, Firefox or WebKit) from a test program. **Headless** means without a window. Style and [layout](../web/element-visibility.md) still run, so visibility can be tested.
- **Playwright Test** is its test runner for JavaScript: `test("name", async ({ page }) => { ... })` is a test, like an xUnit `[Fact]`. Each test gets a fresh `page`.
- `await expect(locator).toBeVisible()` **retries** until it holds or 5 seconds pass. That suits pages that change on their own.
- `page.goto` loads a page, `page.setContent` swaps in HTML, `page.addInitScript` registers a script that runs **before the page's scripts** on every navigation, `page.evaluate` runs a function inside the page and returns its result.
- The .NET package **Microsoft.Playwright** has the same API in C#: `page.GotoAsync`, `Expect(locator).ToBeVisibleAsync()`.

## Key claims

- <a id="c1"></a>**C1.** Playwright controls a real browser engine (Chromium, Firefox or WebKit) from a separate test process. In headless mode the browser shows no window but still computes style and layout, so visibility and box sizes are real.
- <a id="c2"></a>**C2.** In Playwright Test, `test(name, async ({ page }) => { ... })` declares one test. Each test receives a new `page` in a new browser context, with its own cookies and storage, so tests do not affect each other.
- <a id="c3"></a>**C3.** An assertion on a locator, such as `await expect(locator).toBeVisible()`, is retried until it passes or its timeout runs out (5 seconds by default). An assertion on a plain value, such as `expect(count).toBe(2)`, is checked once.
- <a id="c4"></a>**C4.** `page.locator(selector)` returns a locator: a description of how to find elements, not the elements. Each action or assertion runs the search again, so a locator also finds elements the page added later.
- <a id="c5"></a>**C5.** `page.addInitScript(fn)` makes `fn` run in every later navigation of the page, after the document is created and before any of the page's scripts. `page.goto` and `page.reload` navigate. `page.setContent(html)` does not, so init scripts do not run for it.
- <a id="c6"></a>**C6.** `page.evaluate(fn, arg)` runs `fn` inside the page and returns its result to the test, copied as data. `fn` cannot use the test's variables: Playwright sends its source text to the browser. Values it needs are passed as `arg`.
- <a id="c7"></a>**C7.** Playwright counts an element as visible when its bounding box is not empty and its computed `visibility` is not `hidden`. An element with `opacity: 0` counts as visible. A zero-size element counts as hidden.
- <a id="c8"></a>**C8.** The NuGet package Microsoft.Playwright offers the same API to C#, with `Async` names: `page.GotoAsync`, `page.AddInitScriptAsync`, `page.EvaluateAsync<T>`, `Expect(locator).ToBeVisibleAsync()`. Packages such as Microsoft.Playwright.Xunit add base classes that hand each test a fresh page.

## Explanation

### A real browser, driven from outside

The [visibility note](../web/element-visibility.md#c7) showed why a script that asks "is this on screen?" must be tested in a browser engine: jsdom has no layout. Playwright starts a real browser and steers it from the test program over a control connection ([C1](#c1)). It is like UI Automation driving a WPF app, except that Playwright also can run code inside the page.

**Headless** means the browser draws into memory instead of a window. Everything else runs: the parser, style, layout, the [event loop](../web/event-loop-and-mutation-observer.md). Headless Chromium is the same engine as Chrome and as Android's WebView, without the window.

### Tests, like xUnit

Playwright Test is the test runner, as xUnit is for .NET. A test file calls `test` once per test ([C2](#c2)):

| Playwright Test (JavaScript) | xUnit (C#) |
|---|---|
| `test("name", async ({ page }) => { ... })` | `[Fact] public async Task Name() { ... }` |
| a `for` loop that calls `test` once per case | `[Theory]` with one `[InlineData]` per case |
| `test.describe("group", () => { ... })` | a test class |
| `test.beforeEach(...)` | the test class's constructor |
| `{ page }`, a **fixture** handed to each test | a constructor parameter or class fixture |
| `npx playwright test` | `dotnet test` |

`async` and `await` mean what they mean in C#. Every Playwright call talks to the browser, so nearly every call is awaited.

### Assertions that wait

A page changes by itself: a timer fires, a script adds an element, an observer hides it. An assertion that checks once, right now, would be flaky. **Locator assertions retry** instead ([C3](#c3)). `await expect(locator).toBeHidden()` keeps checking until the element is hidden, or fails after 5 seconds. This works because a locator is a recipe, not a result ([C4](#c4)). Each retry runs the selector again.

"Visible" follows Playwright's own definition ([C7](#c7)). It differs from `checkVisibility()` on zero-size boxes and on `visibility: hidden`. See the [visibility note](../web/element-visibility.md#c6).

### Getting a page and a script into the browser

- `page.goto(url)` navigates and waits until the page has loaded. A `data:text/html,...` URL lets a test supply the HTML inline.
- `page.setContent(html)` replaces the current page's HTML **without** a navigation.
- `page.addInitScript(fn)` registers code that runs at **document start** on every later navigation ([C5](#c5)). This is how a test injects a script under test the way an app would: before the page's own scripts, when the document is still [empty](../web/event-loop-and-mutation-observer.md#c8). Because `setContent` is no navigation, a test of an init script uses `goto`.
- `page.evaluate(fn, arg)` runs `fn` in the page and hands back the result ([C6](#c6)). The function travels to the browser as text, so it is like a lambda compiled to an expression tree and executed elsewhere: it cannot capture local variables. Inputs go in as `arg`. Results come back as data, like JSON: numbers, strings, arrays, plain objects.

### The same in .NET

Microsoft.Playwright is the same library for C# ([C8](#c8)). The names follow .NET conventions:

```csharp
await page.AddInitScriptAsync(script: hiderSource);
await page.GotoAsync(url);
await Expect(page.Locator("[data-test='banner']")).ToBeHiddenAsync();
int count = await page.EvaluateAsync<int>("s => document.querySelectorAll(s).length", "[data-test]");
```

In C#, the function for `EvaluateAsync` is a string of JavaScript, which makes [C6](#c6) obvious: it is source text sent to the browser.

## Examples

A test that loads a made-up page whose script adds a banner after 100 milliseconds, injects a hider at document start, and checks the result. In JavaScript, text in backticks is an interpolated string, like C#'s `$"..."`. `require` loads a package.

```javascript
const { test, expect } = require("@playwright/test");

const pageHtml = `
  <div data-test="tip">A tip</div>
  <script>
    setTimeout(() => {
      const banner = document.createElement("div");
      banner.setAttribute("data-test", "banner");
      banner.textContent = "Buy now";
      document.body.appendChild(banner);
    }, 100);
  </script>`;

const hider = () => {
  new MutationObserver(() => {
    for (const el of document.querySelectorAll("[data-test='banner']"))
      if (el.style.display !== "none") el.style.display = "none";
  }).observe(document, { childList: true, subtree: true });
};

test("hides the banner the page adds later", async ({ page }) => {
  await page.addInitScript(hider);
  await page.goto("data:text/html," + encodeURIComponent(pageHtml));

  const banner = page.locator("[data-test='banner']");
  await expect(banner).toBeAttached(); // waits until the page has added it
  await expect(banner).toBeHidden();
  await expect(page.locator("[data-test='tip']")).toBeVisible();
});
```

Result: the test passes. `toBeAttached` waits up to 5 seconds for the banner to exist ([C3](#c3)), so the test does not need to know about the 100 milliseconds.

The same test idea as a `[Theory]`: one `test` call per case, with the case in the name. `page.evaluate` gets the selector as `arg` ([C6](#c6)):

```javascript
const cases = [
  ["[data-test^='chall']", 2],
  ["[data-test='challenge']", 1],
];

for (const [selector, expected] of cases) {
  test(`counts ${selector}`, async ({ page }) => {
    await page.setContent(`<i data-test="challenge"></i><i data-test="challenge-x"></i>`);
    const count = await page.evaluate((s) => document.querySelectorAll(s).length, selector);
    expect(count).toBe(expected);
  });
}
```

Result: two tests, both pass.

## Pitfalls

- **Testing an init script with `setContent`.** The script never runs, because `setContent` is no navigation ([C5](#c5)). Use `goto`, for example with a `data:` URL.
- **Using a test variable inside `evaluate`.** `page.evaluate(() => selector)` fails with `ReferenceError: selector is not defined` in the page. Pass it as the second argument ([C6](#c6)).
- **Forgetting `await` on a locator assertion.** The test goes on without waiting for it ([C3](#c3)). Playwright 1.64 then fails the test with "Test ended". The failure points at the assertion, not at the missing `await`.
- **Checking a changing page once.** `expect(await locator.isVisible()).toBe(false)` reads the state once and does not retry. Prefer `await expect(locator).toBeHidden()`.
- **Assuming Playwright's "visible" is `checkVisibility()`.** They disagree on zero-size elements and on `visibility: hidden` ([C7](#c7)).

## Exercises

1. **Explain.** A test calls `page.addInitScript(hider)`, then `page.setContent(html)`, then asserts that an element is hidden. The assertion fails after 5 seconds. Why?

   <details><summary>Solution</summary>

   `setContent` does not navigate, so the init script never runs ([C5](#c5)). Nothing hides the element. The assertion retries for 5 seconds and fails ([C3](#c3)). Use `page.goto` with the HTML instead.

   </details>

2. **Translate.** Write the C# for `const n = await page.evaluate(() => document.querySelectorAll("p").length);` with Microsoft.Playwright.

   <details><summary>Solution</summary>

   `int n = await page.EvaluateAsync<int>("() => document.querySelectorAll('p').length");` The function is JavaScript source in a string ([C6](#c6), [C8](#c8)).

   </details>

## Sources

- Claude session on [Skip the Fluff](https://github.com/thomaswening/skip-the-fluff), 2026-11-12: primer before reviewing the fix engine, which is tested with Playwright Test in headless Chromium on hand-written test pages ([ADR-0007](https://github.com/thomaswening/skip-the-fluff/blob/main/docs/adr/0007-testing-fixes.md)). Both examples ran with Playwright 1.64 and headless Chrome 157. [C5](#c5) was also measured with Playwright 1.48.
- Playwright: [Writing tests](https://playwright.dev/docs/writing-tests), [Assertions](https://playwright.dev/docs/test-assertions), [Locators](https://playwright.dev/docs/locators), [`page.addInitScript`](https://playwright.dev/docs/api/class-page#page-add-init-script), [Evaluating JavaScript](https://playwright.dev/docs/evaluating), [Actionability, "Visible"](https://playwright.dev/docs/actionability#visible), [Parameterize tests](https://playwright.dev/docs/test-parameterize).
- Playwright for .NET: [Getting started](https://playwright.dev/dotnet/docs/intro), [Test runners](https://playwright.dev/dotnet/docs/test-runners).
