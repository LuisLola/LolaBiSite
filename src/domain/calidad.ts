import type { AvisoCalidad, Departamento, Panel } from './types';
import { esUrlEmbed, faltaAreaDeTrabajo } from './panelUrls';
import { DEPARTAMENTOS_CONFIG } from '../config/departamentos.config';

/** Valores de "Área de Trabajo" que no son áreas de trabajo de Power BI. */
const AREAS_SOSPECHOSAS = [/integrantes/i, /^\s*luis\b/i, /^\s*$/];

/**
 * Contexto del departamento del panel. Sin esto, dos avisos salen siempre y no
 * hay forma de resolverlos, y un panel de calidad permanentemente en rojo es un
 * panel que nadie lee.
 */
export interface OpcionesCalidad {
  /** Área de trabajo del departamento (lista "Departamentos BI"). */
  workspaceDelArea?: string;
  /** Si el departamento existe en la config o en la lista de áreas. */
  departamentoConocido?: boolean;
}

/**
 * Avisos de calidad de datos que muestra administración. No bloquean nada:
 * los datos de hoy tienen exactamente estos problemas y hay que verlos.
 */
export function avisosDePanel(panel: Panel, opciones: OpcionesCalidad = {}): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];

  if (esUrlEmbed(panel.urlDirecta)) {
    avisos.push({
      tipo: 'url-embed-como-enlace',
      gravedad: 'media',
      mensaje:
        'El campo UrlDirecta lleva una URL de incrustación. Ahí se espera el enlace al ' +
        'portal de Power BI; la de incrustación ya se coge de Url Panel.',
    });
  }

  if (!panel.reportId) {
    avisos.push({
      tipo: 'url-no-parseable',
      gravedad: 'alta',
      mensaje: 'No se ha podido extraer el reportId de la URL del panel.',
    });
  }

  if (faltaAreaDeTrabajo(panel, opciones.workspaceDelArea)) {
    avisos.push({
      tipo: 'falta-area-de-trabajo',
      gravedad: 'baja',
      mensaje:
        'Sin área de trabajo. No afecta al enlace normal (que usa la URL de la lista), ' +
        'solo a «Abrir en Power BI»: rellena WorkspaceId del área en Administración → Accesos.',
    });
  }

  const departamentoConocido =
    opciones.departamentoConocido ?? Boolean(DEPARTAMENTOS_CONFIG[panel.departamento]);
  if (!departamentoConocido) {
    avisos.push({
      tipo: 'departamento-huerfano',
      gravedad: 'media',
      mensaje: `El departamento "${panel.departamento || '(vacío)'}" no está descrito: sale con el estilo neutro.`,
    });
  }

  if (!panel.descripcion?.trim()) {
    avisos.push({
      tipo: 'sin-descripcion',
      gravedad: 'baja',
      mensaje: 'Sin descripción: en la tabla del área no se explica para qué sirve.',
    });
  }

  if (!panel.responsable?.trim()) {
    avisos.push({
      tipo: 'sin-responsable',
      gravedad: 'baja',
      mensaje: 'Sin responsable asignado.',
    });
  }

  if (!panel.horaActualizacion?.trim()) {
    avisos.push({
      tipo: 'sin-hora',
      gravedad: 'baja',
      mensaje: 'Sin hora de actualización declarada.',
    });
  }

  if (AREAS_SOSPECHOSAS.some((re) => re.test(panel.areaTrabajo ?? ''))) {
    avisos.push({
      tipo: 'area-trabajo-sucia',
      gravedad: 'baja',
      mensaje: `"Área de Trabajo" contiene "${panel.areaTrabajo}", que es una persona o un grupo, no un área de trabajo. Dato a limpiar.`,
    });
  }

  return avisos;
}

/**
 * Contexto de calidad a partir de los departamentos ya derivados: de ahi salen
 * el área de trabajo y si el departamento está descrito, tanto si viene de la
 * config como de la lista "Departamentos BI".
 */
export function contextoDeCalidad(
  departamentos: readonly Departamento[] = [],
): (panel: Panel) => OpcionesCalidad {
  const porNombre = new Map(departamentos.map((departamento) => [departamento.nombre, departamento]));
  return (panel) => {
    const departamento = porNombre.get(panel.departamento);
    if (!departamento) return {};
    const opciones: OpcionesCalidad = { departamentoConocido: !departamento.huerfano };
    if (departamento.workspaceId) opciones.workspaceDelArea = departamento.workspaceId;
    return opciones;
  };
}

export function avisosDeTodos(
  paneles: readonly Panel[],
  departamentos?: readonly Departamento[],
): Map<string, AvisoCalidad[]> {
  const contexto = contextoDeCalidad(departamentos);
  const mapa = new Map<string, AvisoCalidad[]>();
  for (const panel of paneles) {
    const avisos = avisosDePanel(panel, contexto(panel));
    if (avisos.length > 0) mapa.set(panel.id, avisos);
  }
  return mapa;
}

export function resumenAvisos(
  paneles: readonly Panel[],
  departamentos?: readonly Departamento[],
): Array<{ tipo: string; total: number; mensaje: string; gravedad: string }> {
  const contexto = contextoDeCalidad(departamentos);
  const conteo = new Map<string, { total: number; mensaje: string; gravedad: string }>();
  for (const panel of paneles) {
    for (const aviso of avisosDePanel(panel, contexto(panel))) {
      const previo = conteo.get(aviso.tipo);
      if (previo) previo.total += 1;
      else conteo.set(aviso.tipo, { total: 1, mensaje: aviso.mensaje, gravedad: aviso.gravedad });
    }
  }
  const peso = { alta: 0, media: 1, baja: 2 } as const;
  return [...conteo.entries()]
    .map(([tipo, datos]) => ({ tipo, ...datos }))
    .sort((a, b) => {
      const pa = peso[a.gravedad as keyof typeof peso] ?? 3;
      const pb = peso[b.gravedad as keyof typeof peso] ?? 3;
      return pa - pb || b.total - a.total;
    });
}

/**
 * Lo que le falta a un area para funcionar del todo: el equipo de Teams que da
 * el acceso y el area de trabajo de Power BI donde viven sus informes.
 */
export function avisosDeDepartamento(departamento: Departamento): AvisoCalidad[] {
  const avisos: AvisoCalidad[] = [];

  if (!departamento.grupo) {
    avisos.push({
      tipo: 'departamento-sin-equipo',
      gravedad: 'alta',
      mensaje: 'Sin equipo de Teams asignado: el área la ve todo el mundo.',
    });
  } else if (!departamento.grupo.id) {
    avisos.push({
      tipo: 'departamento-sin-equipo',
      gravedad: 'media',
      mensaje:
        `El área se empareja con "${departamento.grupo.nombre}" por el nombre. Filtra, pero se ` +
        'rompe si alguien renombra el equipo: enlázalo con su objectId de M365.',
    });
  }

  if (!departamento.workspaceId) {
    avisos.push({
      tipo: 'falta-area-de-trabajo',
      gravedad: 'baja',
      mensaje:
        'Sin área de trabajo de Power BI. No afecta al enlace normal, solo a «Abrir en Power BI».',
    });
  }

  if (departamento.huerfano) {
    avisos.push({
      tipo: 'departamento-huerfano',
      gravedad: 'media',
      mensaje: 'Departamento sin configurar: sale con el estilo neutro.',
    });
  }

  return avisos;
}
