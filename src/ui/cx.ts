/** Une clases ignorando lo que no sea una cadena con contenido. */
export function cx(...clases: Array<string | false | null | undefined>): string {
  return clases.filter((clase): clase is string => Boolean(clase)).join(' ');
}
