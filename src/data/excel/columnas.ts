import type { EstadoPanel } from '../../domain/types';

export type CampoPanel =
  | 'nombre'
  | 'areaTrabajo'
  | 'urlPanel'
  | 'urlDirecta'
  | 'departamento'
  | 'descripcion'
  | 'responsable'
  | 'grupoAcceso'
  | 'destacado'
  | 'orden'
  | 'estado'
  | 'horaActualizacion';

export interface DefinicionColumna {
  campo: CampoPanel;
  /** Cabecera que se escribe al exportar. */
  cabecera: string;
  /** Nombre interno de la columna en la lista de SharePoint. */
  interno: string;
  /** Cabeceras aceptadas al importar (además de cabecera e interno). */
  alias?: string[];
}

/**
 * Mapeo columna <-> campo de dominio. Cubre a la vez las cabeceras humanas del
 * export ("Título", "Area de Trabajo") y los nombres internos de SharePoint
 * ("Title", "Area_x0020_de_x0020_Trabajo").
 */
export const COLUMNAS: readonly DefinicionColumna[] = [
  { campo: 'nombre', cabecera: 'Título', interno: 'Title', alias: ['titulo', 'nombre', 'informe', 'panel'] },
  {
    campo: 'areaTrabajo',
    cabecera: 'Area de Trabajo',
    interno: 'Area_x0020_de_x0020_Trabajo',
    alias: ['area de trabajo', 'workspace', 'areatrabajo'],
  },
  {
    campo: 'urlPanel',
    cabecera: 'Url Panel',
    interno: 'Url_x0020_Panel',
    alias: ['url panel', 'url', 'urlpanel', 'url de incrustacion', 'embed'],
  },
  { campo: 'urlDirecta', cabecera: 'UrlDirecta', interno: 'UrlDirecta', alias: ['url directa', 'enlace', 'url de apertura'] },
  { campo: 'departamento', cabecera: 'Departamento', interno: 'Departamento', alias: ['area', 'dpto'] },
  { campo: 'descripcion', cabecera: 'Descripcion', interno: 'Descripcion', alias: ['descripcion', 'para que sirve', 'descripción'] },
  { campo: 'responsable', cabecera: 'Responsable', interno: 'Responsable', alias: ['propietario', 'owner'] },
  { campo: 'grupoAcceso', cabecera: 'GrupoAcceso', interno: 'GrupoAcceso', alias: ['grupo de acceso', 'grupo'] },
  { campo: 'destacado', cabecera: 'Destacado', interno: 'Destacado', alias: ['favorito'] },
  { campo: 'orden', cabecera: 'Orden', interno: 'Orden', alias: ['posicion'] },
  { campo: 'estado', cabecera: 'Estado', interno: 'Estado', alias: ['situacion'] },
  {
    campo: 'horaActualizacion',
    cabecera: 'HoraActualizacion',
    interno: 'HoraActualizacion',
    alias: ['hora de actualizacion', 'hora actualizacion', 'actualizado'],
  },
];

/** Columnas de ruido del export de SharePoint: se ignoran siempre. */
export const COLUMNAS_IGNORADAS = ['tipo de elemento', 'ruta de acceso', 'contenttype', 'id', 'itemchildcount', 'folderchildcount'];

/** Quita acentos, pasa a minúsculas y traduce el _x0020_ de SharePoint. */
export function normalizarCabecera(cabecera: string): string {
  return String(cabecera ?? '')
    .replace(/_x0020_/gi, ' ')
    .replace(/_x([0-9a-f]{4})_/gi, ' ')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase();
}

const INDICE_CAMPOS = new Map<string, CampoPanel>();
for (const columna of COLUMNAS) {
  for (const clave of [columna.cabecera, columna.interno, columna.campo, ...(columna.alias ?? [])]) {
    INDICE_CAMPOS.set(normalizarCabecera(clave), columna.campo);
  }
}

/** Campo de dominio al que corresponde una cabecera, o null si es ruido. */
export function campoDeCabecera(cabecera: string): CampoPanel | null {
  const clave = normalizarCabecera(cabecera);
  if (!clave || COLUMNAS_IGNORADAS.includes(clave)) return null;
  return INDICE_CAMPOS.get(clave) ?? null;
}

const VERDADEROS = ['si', 'sí', 'yes', 'true', 'verdadero', '1', 'x', 'destacado'];

export function aBooleano(valor: unknown): boolean {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor !== 0;
  const texto = normalizarCabecera(String(valor ?? ''));
  return VERDADEROS.includes(texto);
}

export function aNumero(valor: unknown, porDefecto = 0): number {
  if (typeof valor === 'number' && Number.isFinite(valor)) return valor;
  const texto = String(valor ?? '').replace(',', '.').trim();
  if (!texto) return porDefecto;
  const numero = Number(texto);
  return Number.isFinite(numero) ? numero : porDefecto;
}

export function aEstado(valor: unknown): EstadoPanel {
  const texto = normalizarCabecera(String(valor ?? ''));
  if (texto.startsWith('retir') || texto.startsWith('baja')) return 'Retirado';
  if (texto.startsWith('prueba') || texto.startsWith('en prueba') || texto.startsWith('borrador')) return 'En pruebas';
  return 'Activo';
}

export function aTexto(valor: unknown): string {
  if (valor === null || valor === undefined) return '';
  // Los hipervínculos de SheetJS llegan como { text, hyperlink } segun opciones.
  if (typeof valor === 'object') {
    const objeto = valor as Record<string, unknown>;
    const candidato = objeto['hyperlink'] ?? objeto['Target'] ?? objeto['text'] ?? objeto['Url'] ?? objeto['Description'];
    if (candidato !== undefined) return String(candidato).trim();
    return '';
  }
  return String(valor).trim();
}
