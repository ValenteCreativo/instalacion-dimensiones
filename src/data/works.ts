/**
 * DIMENSIONES — Works Data
 * Add your CodePen "full embed" URLs here.
 * Format: https://codepen.io/YOUR_USERNAME/full/XXXXX
 *
 * Each work will appear as a floating framed "dimension" around the body portal.
 * The `mood` field influences the frame glow color:
 *   "water"  → cyan
 *   "fire"   → orange-red
 *   "void"   → violet-purple
 *   "earth"  → green-teal
 *   "light"  → white-gold
 */

export interface Work {
  title: string;
  url: string;
  mood: "water" | "fire" | "void" | "earth" | "light";
}

export const works: Work[] = [
  {
    title: "Dimensión I",
    url: "https://codepen.io/USER/full/XXXXX", // ← Replace with your CodePen URL
    mood: "water",
  },
  {
    title: "Dimensión II",
    url: "https://codepen.io/USER/full/YYYYY", // ← Replace with your CodePen URL
    mood: "fire",
  },
  {
    title: "Dimensión III",
    url: "https://codepen.io/USER/full/ZZZZZ", // ← Replace with your CodePen URL
    mood: "void",
  },
  {
    title: "Dimensión IV",
    url: "https://codepen.io/USER/full/AAAAA", // ← Replace with your CodePen URL
    mood: "earth",
  },
];

export const moodColors: Record<Work["mood"], string> = {
  water: "#00d4ff",
  fire: "#ff6b35",
  void: "#c084fc",
  earth: "#34d399",
  light: "#fde68a",
};
