// Display settings, contents panel, full screen and diagrams of the reading site.
// Loaded in <head> so the saved theme applies before the first paint. Documented in ../README.md.
(() => {
  const STORAGE_KEY = "doubting-thomas-reader-v1";
  const NARROW_SCREEN = "(max-width: 640px)";
  const DARK_THEMES = ["dark", "night"];
  const SLIDERS = ["fontSize", "lineHeight", "textWidth", "equationSpace"];
  const SMALLEST_EQUATION_SCALE = 0.7; // below this, formulas get hard to read; they scroll instead
  const EQUATION_FIT_MARGIN = 0.98; // leaves room for the formula's own rounding
  const BAR_SCROLL_THRESHOLD = 8; // pixels of scrolling that count as a direction
  const BAR_ALWAYS_SHOWN_ABOVE = 120; // pixels from the top where the bar never tucks away
  const RESIZE_DELAY = 100; // milliseconds

  const isNarrowScreen = matchMedia(NARROW_SCREEN).matches;
  const DEFAULTS = Object.freeze({
    theme: "auto", contrast: "normal", font: "sans",
    fontSize: isNarrowScreen ? 17 : 18, lineHeight: 1.7, textWidth: 68, equationSpace: 1,
    longEquations: "shrink",
  });
  const root = document.documentElement;
  let preferences = { ...DEFAULTS, ...loadPreferences() };
  applyToRoot();

  function loadPreferences() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
    } catch {
      return {};
    }
  }

  function savePreferences() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Private windows may refuse storage; the settings then last for this page only.
    }
  }

  function applyToRoot() {
    if (preferences.theme === "auto") delete root.dataset.theme;
    else root.dataset.theme = preferences.theme;
    root.dataset.contrast = preferences.contrast;
    root.dataset.font = preferences.font;
    root.style.setProperty("--font-size", `${preferences.fontSize}px`);
    root.style.setProperty("--line-height", preferences.lineHeight);
    root.style.setProperty("--text-width", `${preferences.textWidth}ch`);
    root.style.setProperty("--equation-space", `${preferences.equationSpace}em`);
  }

  const element = (id) => document.getElementById(id);

  function showPreferences() {
    for (const group of document.querySelectorAll(".choices")) {
      for (const button of group.querySelectorAll("button")) {
        button.setAttribute("aria-pressed", String(button.dataset.value === preferences[group.dataset.preference]));
      }
    }
    for (const slider of SLIDERS) element(slider).value = preferences[slider];
    element("fontSize-output").value = `${preferences.fontSize} px`;
    element("lineHeight-output").value = Number(preferences.lineHeight).toFixed(2);
    element("textWidth-output").value = `≈ ${preferences.textWidth} characters`;
    element("equationSpace-output").value = `${Number(preferences.equationSpace).toFixed(1)} lines`;
  }

  function changePreference(name, value) {
    const isThemeChange = name === "theme";
    preferences = { ...preferences, [name]: value };
    applyToRoot();
    showPreferences();
    fitEquations();
    savePreferences();
    if (isThemeChange) drawDiagrams();
  }

  // ---------- long equations ----------

  /** Shrinks each too-wide displayed formula down to SMALLEST_EQUATION_SCALE; what still does not fit scrolls. */
  function fitEquations() {
    for (const block of document.querySelectorAll(".math-block")) {
      block.style.fontSize = "";
      const formula = block.querySelector(".katex-display > .katex");
      const scale = formula ? block.clientWidth / formula.scrollWidth : 1;
      const isShrinking = preferences.longEquations === "shrink" && scale < 1;
      if (isShrinking) block.style.fontSize = `${Math.max(scale * EQUATION_FIT_MARGIN, SMALLEST_EQUATION_SCALE) * 100}%`;
      markScrollEdges(block);
    }
  }

  function markScrollEdges(block) {
    const hiddenWidth = block.scrollWidth - block.clientWidth;
    block.classList.toggle("is-scrollable", hiddenWidth > 1);
    block.classList.toggle("is-at-start", block.scrollLeft < 2);
    block.classList.toggle("is-at-end", block.scrollLeft >= hiddenWidth - 2);
  }

  // ---------- diagrams ----------

  function isDarkTheme() {
    if (DARK_THEMES.includes(preferences.theme)) return true;
    return preferences.theme === "auto" && matchMedia("(prefers-color-scheme: dark)").matches;
  }

  /** Draws the Mermaid diagrams in the current theme, from the source kept in data-source. */
  function drawDiagrams() {
    const diagrams = [...document.querySelectorAll("pre.mermaid")];
    if (!window.mermaid || diagrams.length === 0) return;
    for (const diagram of diagrams) {
      diagram.removeAttribute("data-processed");
      diagram.textContent = diagram.dataset.source;
    }
    window.mermaid.initialize({ startOnLoad: false, theme: isDarkTheme() ? "dark" : "neutral" });
    window.mermaid.run({ nodes: diagrams }).catch(() => {});
  }

  // ---------- panels, bar and full screen ----------

  const PANELS = [
    { button: "contents-button", panel: "contents-panel" },
    { button: "settings-button", panel: "settings-panel" },
  ];

  function closePanels(except) {
    for (const { button, panel } of PANELS) {
      if (panel === except) continue;
      element(panel).hidden = true;
      element(button).setAttribute("aria-expanded", "false");
    }
  }

  function togglePanel(event, { button, panel }) {
    event.stopPropagation();
    const isOpening = element(panel).hidden;
    closePanels(panel);
    element(panel).hidden = !isOpening;
    element(button).setAttribute("aria-expanded", String(isOpening));
  }

  function setUpFullscreen() {
    if (!document.fullscreenEnabled) return;
    const button = element("fullscreen-button");
    button.hidden = false;
    button.addEventListener("click", () => {
      const request = document.fullscreenElement ? document.exitFullscreen() : root.requestFullscreen({ navigationUI: "hide" });
      request.catch(() => {});
    });
  }

  /** The bar tucks away while the reader scrolls down and comes back on scrolling up. */
  function setUpTuckingBar() {
    const bar = element("bar");
    let lastScrollY = scrollY;
    addEventListener("scroll", () => {
      const distance = scrollY - lastScrollY;
      if (Math.abs(distance) < BAR_SCROLL_THRESHOLD) return;
      const isAnyPanelOpen = PANELS.some(({ panel }) => !element(panel).hidden);
      bar.classList.toggle("is-tucked", distance > 0 && scrollY > BAR_ALWAYS_SHOWN_ABOVE && !isAnyPanelOpen);
      lastScrollY = scrollY;
    }, { passive: true });
  }

  function setUpControls() {
    for (const group of document.querySelectorAll(".choices")) {
      group.addEventListener("click", (event) => {
        const button = event.target.closest("button");
        if (button) changePreference(group.dataset.preference, button.dataset.value);
      });
    }
    for (const slider of SLIDERS) {
      element(slider).addEventListener("input", (event) => changePreference(slider, Number(event.target.value)));
    }
    element("reset-button").addEventListener("click", () => {
      preferences = { ...DEFAULTS };
      changePreference("theme", DEFAULTS.theme);
    });
    for (const entry of PANELS) element(entry.button).addEventListener("click", (event) => togglePanel(event, entry));
    document.addEventListener("click", (event) => { if (!event.target.closest(".panel")) closePanels(); });
    document.addEventListener("keydown", (event) => { if (event.key === "Escape") closePanels(); });
    element("contents-panel").addEventListener("click", (event) => { if (event.target.closest("a")) closePanels(); });
  }

  function setUpEquations() {
    for (const block of document.querySelectorAll(".math-block")) {
      block.addEventListener("scroll", () => markScrollEdges(block), { passive: true });
    }
    let resizeTimer;
    addEventListener("resize", () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(fitEquations, RESIZE_DELAY);
    });
    document.fonts?.ready.then(fitEquations);
  }

  document.addEventListener("DOMContentLoaded", () => {
    showPreferences();
    setUpControls();
    setUpFullscreen();
    setUpTuckingBar();
    setUpEquations();
    fitEquations();
    drawDiagrams();
    matchMedia("(prefers-color-scheme: dark)").addEventListener("change", drawDiagrams);
  });
})();
