import type { Panel } from '../../domain/types';
import { CABECERAS_EXPORT, panelesAFilas, type FilaExcel } from './mapeo';

const NOMBRE_HOJA = 'Paneles';

/**
 * SheetJS pesa mas que el resto de la aplicacion junta, asi que se carga bajo
 * demanda: no entra en el primer paquete ni en el bundle del web part.
 */
async function cargarSheetJs() {
  return import('xlsx');
}

/** Primera hoja del libro -> filas con las cabeceras como claves. */
export async function filasDeLibro(datos: ArrayBuffer | Uint8Array): Promise<FilaExcel[]> {
  const XLSX = await cargarSheetJs();
  const libro = XLSX.read(datos, { type: 'array' });
  const nombreHoja = libro.SheetNames[0];
  if (!nombreHoja) return [];
  const hoja = libro.Sheets[nombreHoja];
  if (!hoja) return [];
  return XLSX.utils.sheet_to_json<FilaExcel>(hoja, { defval: '', raw: false });
}

export async function filasDeFichero(fichero: File): Promise<FilaExcel[]> {
  return filasDeLibro(await fichero.arrayBuffer());
}

/** Descarga el Excel actualizado para volver a subirlo a SharePoint. */
export async function descargarExcel(paneles: readonly Panel[], nombreFichero?: string): Promise<void> {
  const XLSX = await cargarSheetJs();
  const filas = panelesAFilas(paneles);
  const hoja = XLSX.utils.json_to_sheet(filas, { header: CABECERAS_EXPORT });
  hoja['!cols'] = CABECERAS_EXPORT.map((cabecera) => {
    if (cabecera === 'Url Panel' || cabecera === 'UrlDirecta') return { wch: 60 };
    if (cabecera === 'Título' || cabecera === 'Descripcion') return { wch: 40 };
    return { wch: 20 };
  });
  const libro = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(libro, hoja, NOMBRE_HOJA);
  const fecha = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(libro, nombreFichero ?? `PanelesBI-${fecha}.xlsx`);
}
