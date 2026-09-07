import { DEPARTAMENTOS_CONFIG } from '../../config/departamentos.config';
import { parsearUrlPanel } from '../../domain/panelUrls';
import type { Panel, PanelInput } from '../../domain/types';
import { COLUMNAS, aBooleano, aEstado, aNumero, aTexto, campoDeCabecera, type CampoPanel } from './columnas';

export type FilaExcel = Record<string, unknown>;

export interface ResultadoImportacion {
  paneles: Panel[];
  /** Cabeceras del fichero que no se han usado. */
  columnasIgnoradas: string[];
  /** Filas descartadas por no tener ni título ni URL. */
  filasVacias: number;
}

/** Hash estable (djb2) para que el id de un panel no cambie entre recargas. */
function hashEstable(texto: string): string {
  let hash = 5381;
  for (let i = 0; i < texto.length; i += 1) {
    hash = ((hash << 5) + hash + texto.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

export function idDePanel(nombre: string, urlPanel: string, reportId: string, pageName: string): string {
  return `p-${hashEstable([nombre, reportId, pageName, urlPanel].join('|'))}`;
}

export function nuevoId(): string {
  return `n-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

/** Convierte una fila cruda del Excel en un campo -> valor de dominio. */
function valoresDeFila(fila: FilaExcel): { valores: Partial<Record<CampoPanel, unknown>>; ignoradas: string[] } {
  const valores: Partial<Record<CampoPanel, unknown>> = {};
  const ignoradas: string[] = [];
  for (const [cabecera, valor] of Object.entries(fila)) {
    const campo = campoDeCabecera(cabecera);
    if (!campo) {
      ignoradas.push(cabecera);
      continue;
    }
    if (valores[campo] === undefined || aTexto(valores[campo]) === '') valores[campo] = valor;
  }
  return { valores, ignoradas };
}

/**
 * Completa un panel: deriva reportId/pageName/ctid de la URL de incrustación y
 * rellena lo que la lista todavía no tiene (grupo de acceso, estado, orden).
 */
export function completarPanel(parcial: Partial<Panel> & { nombre: string }, indice = 0): Panel {
  const urlPanel = parcial.urlPanel ?? '';
  const datosUrl = parsearUrlPanel(urlPanel) ?? parsearUrlPanel(parcial.urlDirecta);
  const departamento = parcial.departamento?.trim() ?? '';
  const configDepartamento = DEPARTAMENTOS_CONFIG[departamento];

  const reportId = parcial.reportId ?? datosUrl?.reportId ?? '';
  const pageName = parcial.pageName ?? datosUrl?.pageName ?? '';

  const panel: Panel = {
    id: parcial.id ?? idDePanel(parcial.nombre, urlPanel, reportId, pageName),
    nombre: parcial.nombre.trim(),
    areaTrabajo: parcial.areaTrabajo?.trim() ?? '',
    urlPanel,
    reportId,
    pageName,
    departamento,
    destacado: parcial.destacado ?? false,
    orden: parcial.orden ?? (indice + 1) * 10,
    estado: parcial.estado ?? 'Activo',
  };

  const ctid = parcial.ctid ?? datosUrl?.ctid;
  if (ctid) panel.ctid = ctid;
  if (parcial.urlDirecta?.trim()) panel.urlDirecta = parcial.urlDirecta.trim();
  if (parcial.descripcion?.trim()) panel.descripcion = parcial.descripcion.trim();
  if (parcial.responsable?.trim()) panel.responsable = parcial.responsable.trim();

  // El grupo de acceso solo se guarda si la fila lo trae: vacio = hereda el
  // equipo del departamento.
  const grupo = parcial.grupoAcceso?.trim();
  if (grupo) panel.grupoAcceso = grupo;

  const hora = parcial.horaActualizacion?.trim() || configDepartamento?.horaActualizacion;
  if (hora) panel.horaActualizacion = hora;

  if (parcial.creado) panel.creado = parcial.creado;
  if (parcial.modificado) panel.modificado = parcial.modificado;

  return panel;
}

/** Filas del Excel -> paneles de dominio. */
export function filasAPaneles(filas: readonly FilaExcel[]): ResultadoImportacion {
  const paneles: Panel[] = [];
  const ignoradas = new Set<string>();
  let filasVacias = 0;

  filas.forEach((fila, indice) => {
    const { valores, ignoradas: sinUsar } = valoresDeFila(fila);
    sinUsar.forEach((cabecera) => ignoradas.add(cabecera));

    const nombre = aTexto(valores.nombre);
    const urlPanel = aTexto(valores.urlPanel);
    if (!nombre && !urlPanel) {
      filasVacias += 1;
      return;
    }

    paneles.push(
      completarPanel(
        {
          nombre: nombre || '(sin título)',
          areaTrabajo: aTexto(valores.areaTrabajo),
          urlPanel,
          urlDirecta: aTexto(valores.urlDirecta),
          departamento: aTexto(valores.departamento),
          descripcion: aTexto(valores.descripcion),
          responsable: aTexto(valores.responsable),
          grupoAcceso: aTexto(valores.grupoAcceso),
          destacado: aBooleano(valores.destacado),
          orden: valores.orden === undefined || aTexto(valores.orden) === '' ? undefined : aNumero(valores.orden),
          estado: valores.estado === undefined || aTexto(valores.estado) === '' ? 'Activo' : aEstado(valores.estado),
          horaActualizacion: aTexto(valores.horaActualizacion),
        },
        indice,
      ),
    );
  });

  return { paneles, columnasIgnoradas: [...ignoradas], filasVacias };
}

/** Paneles -> filas listas para escribir el Excel de vuelta. */
export function panelesAFilas(paneles: readonly Panel[]): FilaExcel[] {
  return paneles.map((panel) => {
    const fila: FilaExcel = {};
    for (const columna of COLUMNAS) {
      switch (columna.campo) {
        case 'destacado':
          fila[columna.cabecera] = panel.destacado ? 'Sí' : 'No';
          break;
        case 'orden':
          fila[columna.cabecera] = panel.orden;
          break;
        default:
          fila[columna.cabecera] = panel[columna.campo] ?? '';
      }
    }
    return fila;
  });
}

export const CABECERAS_EXPORT: string[] = COLUMNAS.map((c) => c.cabecera);

/** Aplica una edición parcial de administración sobre un panel existente. */
export function aplicarEdicion(panel: Panel, cambios: Partial<PanelInput>): Panel {
  const fusionado: Partial<Panel> & { nombre: string } = {
    ...panel,
    ...cambios,
    nombre: (cambios.nombre ?? panel.nombre) || panel.nombre,
  };

  // Si cambia la URL de incrustación, se vuelven a derivar reportId y pageName.
  if (cambios.urlPanel !== undefined && cambios.urlPanel !== panel.urlPanel) {
    const datos = parsearUrlPanel(cambios.urlPanel);
    fusionado.reportId = cambios.reportId ?? datos?.reportId ?? '';
    fusionado.pageName = cambios.pageName ?? datos?.pageName ?? '';
    fusionado.ctid = cambios.ctid ?? datos?.ctid;
  }

  fusionado.id = panel.id;
  fusionado.modificado = new Date().toISOString();
  return completarPanel(fusionado);
}
