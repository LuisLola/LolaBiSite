/*
 * Que ensena una pantalla que depende de la lista de paneles.
 *
 * Existe porque las cuatro situaciones se veian igual: un portal vacio que
 * parece funcionar. "No tienes nada asignado" y "la lista no ha cargado" son
 * problemas de personas distintas y llevan a acciones distintas, asi que la
 * decision se toma en un solo sitio y se puede probar sin DOM.
 */
export type EstadoDeCarga = 'cargando' | 'error' | 'vacio' | 'con-datos';

export function estadoDeCarga(entrada: {
  cargando: boolean;
  error: Error | null;
  total: number;
}): EstadoDeCarga {
  // El error manda sobre el vacio: una lectura fallida deja la lista a cero, y
  // sin esta linea el fallo se anunciaria como "no tienes nada asignado".
  if (entrada.error) return 'error';
  if (entrada.cargando) return 'cargando';
  return entrada.total === 0 ? 'vacio' : 'con-datos';
}
