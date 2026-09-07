import { NOMBRES_INFORME } from '../config/workspaces.config';
import type { GrupoInforme, Panel } from './types';
import { workspaceDeInforme } from './panelUrls';

/** destacado desc, luego orden asc, luego nombre. */
export function ordenarPaneles(paneles: readonly Panel[]): Panel[] {
  return [...paneles].sort((a, b) => {
    if (a.destacado !== b.destacado) return a.destacado ? -1 : 1;
    if (a.orden !== b.orden) return a.orden - b.orden;
    return a.nombre.localeCompare(b.nombre, 'es');
  });
}

/** Los que se ven en el portal de consulta. */
export function soloActivos(paneles: readonly Panel[]): Panel[] {
  return paneles.filter((p) => p.estado === 'Activo');
}

/**
 * Prefijo común de una lista de títulos, cortado en el último separador
 * razonable. ["LC - Ranking por Temporada", "LC - Análisis Temporada"] -> "LC".
 */
export function prefijoComun(titulos: readonly string[]): string {
  if (titulos.length === 0) return '';
  const primero = titulos[0]!;
  if (titulos.length === 1) return primero;
  let corte = 0;
  while (corte < primero.length) {
    const caracter = primero[corte]!;
    if (!titulos.every((t) => t[corte] === caracter)) break;
    corte += 1;
  }
  const comun = primero.slice(0, corte);
  const limpio = comun.replace(/[\s\-–—:·,/]+$/u, '').trim();
  return limpio;
}

/** Título legible del informe: config > prefijo común > primer título. */
export function tituloInforme(reportId: string, paneles: readonly Panel[]): string {
  const deConfig = NOMBRES_INFORME[reportId];
  if (deConfig) return deConfig;
  const prefijo = prefijoComun(paneles.map((p) => p.nombre));
  if (prefijo.length >= 4) return prefijo;
  return paneles[0]?.nombre ?? reportId;
}

/**
 * Agrupa por reportId: nueve filas son en realidad cinco informes.
 * Los grupos salen en el orden del primer panel de cada uno.
 */
export function agruparPorInforme(paneles: readonly Panel[]): GrupoInforme[] {
  const ordenados = ordenarPaneles(paneles);
  const mapa = new Map<string, Panel[]>();
  for (const panel of ordenados) {
    const clave = panel.reportId || `sin-informe:${panel.id}`;
    const lista = mapa.get(clave);
    if (lista) lista.push(panel);
    else mapa.set(clave, [panel]);
  }
  return [...mapa.entries()].map(([reportId, grupo]) => {
    const informe: GrupoInforme = {
      reportId,
      titulo: tituloInforme(reportId, grupo),
      paneles: grupo,
    };
    const ws = workspaceDeInforme(reportId);
    if (ws) informe.workspaceId = ws;
    return informe;
  });
}

/** Texto normalizado (sin acentos, minúsculas) para buscar. */
export function normalizar(texto: string | undefined | null): string {
  return (texto ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

/** Buscador global: nombre, descripción, departamento y área de trabajo. */
export function filtrarPorTexto(paneles: readonly Panel[], consulta: string): Panel[] {
  const terminos = normalizar(consulta).split(/\s+/).filter(Boolean);
  if (terminos.length === 0) return [...paneles];
  return paneles.filter((panel) => {
    const heno = normalizar(
      [panel.nombre, panel.descripcion, panel.departamento, panel.areaTrabajo, panel.responsable]
        .filter(Boolean)
        .join(' '),
    );
    return terminos.every((t) => heno.includes(t));
  });
}

/** Siguiente valor de orden dentro de un departamento. */
export function siguienteOrden(paneles: readonly Panel[], departamento: string): number {
  const delDepartamento = paneles.filter((p) => p.departamento === departamento);
  if (delDepartamento.length === 0) return 10;
  return Math.max(...delDepartamento.map((p) => p.orden || 0)) + 10;
}
