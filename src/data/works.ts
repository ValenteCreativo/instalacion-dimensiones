/**
 * DIMENSIONES JAMBOTEO — Obras de Valentín Martínez
 *
 * Cómo agregar o editar obras:
 *   - url: usa el formato embed de CodePen:
 *     https://codepen.io/ValenteCreativo/embed/SLUG?default-tab=result&theme-id=dark
 *   - year: año de creación
 *   - mood: controla el color del marco ("water"|"fire"|"void"|"earth"|"light")
 */

export interface Work {
  title: string;
  subtitle: string;
  url: string;
  year: number;
  author: string;
  mood: "water" | "fire" | "void" | "earth" | "light";
}

export const works: Work[] = [
  {
    title: "Primera Dimensión",
    subtitle: "Singularidad y Flujo",
    url: "https://codepen.io/ValenteCreativo/embed/jOjKbVK?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "water",
  },
  {
    title: "Segunda Dimensión",
    subtitle: "Reino Mental",
    url: "https://codepen.io/ValenteCreativo/embed/yLdEYVR?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "void",
  },
  {
    title: "Tercera Dimensión",
    subtitle: "Mundo Físico",
    url: "https://codepen.io/ValenteCreativo/embed/NWZzGXz?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "earth",
  },
  {
    title: "Cuarta Dimensión",
    subtitle: "Espacio-Tiempo",
    url: "https://codepen.io/ValenteCreativo/embed/NWZzGzB?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "fire",
  },
  {
    title: "Quinta Dimensión",
    subtitle: "Vibración y Energía",
    url: "https://codepen.io/ValenteCreativo/embed/PoraPbj?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "light",
  },
  {
    title: "Sexta Dimensión",
    subtitle: "Posibilidades",
    url: "https://codepen.io/ValenteCreativo/embed/yLdEYEw?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "water",
  },
  {
    title: "Séptima Dimensión",
    subtitle: "Universos Paralelos",
    url: "https://codepen.io/ValenteCreativo/embed/bGPKeaM?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "void",
  },
  {
    title: "Octava Dimensión",
    subtitle: "Armonía y Caos",
    url: "https://codepen.io/ValenteCreativo/embed/dPyNyKe?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
    mood: "fire",
  },
  {
    title: "Frecuencia",
    subtitle: "",
    url: "https://codepen.io/ValenteCreativo/embed/bNdBbRr?default-tab=result&theme-id=dark",
    year: 2025,
    author: "Valentín Martínez",
    mood: "light",
  },
  {
    title: "Realidad",
    subtitle: "",
    url: "https://codepen.io/ValenteCreativo/embed/NWZexVy?default-tab=result&theme-id=dark",
    year: 2024,
    author: "Valentín Martínez",
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
