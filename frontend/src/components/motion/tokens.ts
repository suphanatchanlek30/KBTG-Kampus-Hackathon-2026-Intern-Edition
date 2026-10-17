
export const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;
/** count-up "ease-out (cubic)" */
export const EASE_OUT_CUBIC = [0.33, 1, 0.68, 1] as const;

export const SPRING_HERO = { type: "spring", stiffness: 260, damping: 18 } as const;
export const SPRING_CARD = { type: "spring", stiffness: 200, damping: 24 } as const;
export const SPRING_DOT = { type: "spring", stiffness: 400, damping: 22 } as const;

export const REDUCED_FADE = { duration: 0.15 } as const;
