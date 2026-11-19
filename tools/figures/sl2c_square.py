"""Draw the commutative square of the note topics/qft/sl2c-double-cover-of-the-lorentz-group.md.

Writes a light and a dark SVG into topics/qft/figures/. The note shows the one
that matches the reader's colour scheme. Run it after changing the labels or the
layout, then commit the SVGs with the script:

    python -m pip install matplotlib
    python tools/figures/sl2c_square.py
"""

from pathlib import Path

import matplotlib

matplotlib.use("svg")
import matplotlib.pyplot as plt  # noqa: E402

OUTPUT_DIR = Path(__file__).resolve().parents[2] / "topics" / "qft" / "figures"
NAME = "sl2c-commutative-square"

# Text colours of GitHub's light and dark themes, so the figure reads like the page around it.
COLOURS = {"light": "#1f2328", "dark": "#e6edf3"}

FONT_SIZE = 15
LABEL_SIZE = 13
LEFT, RIGHT, TOP, BOTTOM = 0.0, 1.0, 1.0, 0.0
# Arrows stop short of the corner labels by these gaps, in axis units.
HORIZONTAL_GAP = 0.2
VERTICAL_GAP = 0.17

CORNERS = {
    (LEFT, TOP): r"$\mathbb{R}^{1,3}$",
    (RIGHT, TOP): r"$\mathbb{R}^{1,3}$",
    (LEFT, BOTTOM): r"$\mathrm{Herm}(2)$",
    (RIGHT, BOTTOM): r"$\mathrm{Herm}(2)$",
}

# (start, end, label, label offset from the arrow's midpoint)
ARROWS = [
    ((LEFT + HORIZONTAL_GAP, TOP), (RIGHT - HORIZONTAL_GAP, TOP), r"$\Lambda_A$", (0.0, 0.1)),
    ((LEFT + 0.26, BOTTOM), (RIGHT - 0.26, BOTTOM), r"$T_A$", (0.0, 0.1)),
    ((LEFT, TOP - VERTICAL_GAP), (LEFT, BOTTOM + VERTICAL_GAP), r"$\Phi$", (-0.07, 0.0)),
    ((RIGHT, TOP - VERTICAL_GAP), (RIGHT, BOTTOM + VERTICAL_GAP), r"$\Phi$", (0.07, 0.0)),
]


def draw(colour):
    figure, axes = plt.subplots(figsize=(3.6, 2.2))
    axes.set_xlim(-0.25, 1.25)
    axes.set_ylim(-0.2, 1.2)
    axes.axis("off")
    for (x, y), text in CORNERS.items():
        axes.text(x, y, text, ha="center", va="center", fontsize=FONT_SIZE, color=colour)
    for start, end, label, (dx, dy) in ARROWS:
        axes.annotate("", xy=end, xytext=start,
                      arrowprops={"arrowstyle": "->", "color": colour, "linewidth": 1.1})
        middle_x, middle_y = (start[0] + end[0]) / 2, (start[1] + end[1]) / 2
        axes.text(middle_x + dx, middle_y + dy, label, ha="center", va="center",
                  fontsize=LABEL_SIZE, color=colour)
    return figure


def main():
    plt.rcParams["svg.fonttype"] = "path"
    plt.rcParams["svg.hashsalt"] = NAME
    plt.rcParams["mathtext.fontset"] = "cm"
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    for theme, colour in COLOURS.items():
        figure = draw(colour)
        path = OUTPUT_DIR / f"{NAME}-{theme}.svg"
        figure.savefig(path, transparent=True, bbox_inches="tight", metadata={"Date": None})
        plt.close(figure)
        print(path)


if __name__ == "__main__":
    main()
