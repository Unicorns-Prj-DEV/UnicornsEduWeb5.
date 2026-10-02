/** Bộ mascot kỳ lân pastel đã tách nền + cắt sát, nằm trong `public/mascots/unicorn-<id>.webp`. */
const CLASS_MASCOT_IDS = [
  2795, 2796, 2797, 2798, 2799, 2800, 2801, 2802, 2803, 2804, 2805, 2806, 2863,
  2864, 2865, 2866, 2867, 2868, 2869, 2870, 2871,
] as const;

/** Nền nhạt theo token theme để mascot nổi trên cả light/dark/pink. */
const CLASS_MASCOT_TINTS = [
  "bg-primary/10",
  "bg-info/10",
  "bg-success/10",
  "bg-warning/10",
  "bg-secondary/10",
] as const;

/** FNV-1a 32-bit: hash ổn định, cùng ID lớp luôn ra cùng số trên mọi máy. */
function hashClassId(classId: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < classId.length; index += 1) {
    hash ^= classId.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

export function getClassMascot(classId: string): {
  src: string;
  tintClassName: string;
} {
  const hash = hashClassId(classId);
  const mascotId = CLASS_MASCOT_IDS[hash % CLASS_MASCOT_IDS.length];
  const tintClassName =
    CLASS_MASCOT_TINTS[Math.floor(hash / CLASS_MASCOT_IDS.length) % CLASS_MASCOT_TINTS.length];
  return { src: `/mascots/unicorn-${mascotId}.webp`, tintClassName };
}
