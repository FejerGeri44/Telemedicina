export const STAR_COUNT = 5;
export type StarIcon = 'star' | 'star-half' | 'star-outline';

export function roundToHalf(r: number | null | undefined): number {
  const safe = Math.max(0, Math.min(5, r ?? 0));
  return Math.round(safe * 2) / 2;
}

export function buildStarIcons(roundedRating: number): StarIcon[] {
  return Array.from({ length: STAR_COUNT }, (_, i) => {
    const pos = i + 1;
    if (roundedRating >= pos) return 'star';
    if (roundedRating >= pos - 0.5) return 'star-half';
    return 'star-outline';
  });
}

export function getRatingView(rating: number): {
  rounded: number;
  icons: StarIcon[];
} {
  const rounded = roundToHalf(rating);
  const icons = buildStarIcons(rounded);
  return { rounded, icons };
}
