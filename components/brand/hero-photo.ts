import photo from "@/assets/mis-nonos.jpg";

/**
 * Foto de la marca: el ingreso y la landing pública la comparten. Con
 * next/image, la posición va en clases (absolute inset-0): la CSP bloquea los
 * estilos en línea, así que "fill" y "placeholder" solos no alcanzan.
 */
export const HERO_PHOTO = photo;
export const HERO_PHOTO_ALT = "Una mano joven sostiene con cariño las manos de una persona mayor.";
