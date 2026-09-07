import { configDepartamento, slugDepartamento } from '../config/departamentos.config';
import type { AjustesDepartamento } from '../data/DepartamentoRepository';
import type { Departamento, Panel } from './types';

/**
 * Los departamentos no son una tabla: se derivan de los valores distintos de la
 * columna "Departamento" y se decoran con lo que haya en departamentos.config.ts
 * y encima con lo editado en Administración.
 */
export function derivarDepartamentos(
  paneles: readonly Panel[],
  ajustes: readonly AjustesDepartamento[] = [],
): Departamento[] {
  const porNombreAjustes = new Map(ajustes.map((a) => [a.nombre, a]));

  const porNombre = new Map<string, Panel[]>();
  for (const panel of paneles) {
    const nombre = panel.departamento?.trim() || 'Sin departamento';
    const lista = porNombre.get(nombre);
    if (lista) lista.push(panel);
    else porNombre.set(nombre, [panel]);
  }

  const departamentos = [...porNombre.entries()].map(([nombre, grupo]) => {
    const { config, huerfano } = configDepartamento(nombre);
    const editado = porNombreAjustes.get(nombre);
    const activos = grupo.filter((p) => p.estado === 'Activo');
    const informes = new Set(activos.map((p) => p.reportId).filter(Boolean));

    const departamento: Departamento = {
      id: slugDepartamento(nombre) || 'sin-departamento',
      nombre,
      iniciales: editado?.iniciales || config.iniciales,
      color: editado?.color || config.color,
      colorTexto: editado?.colorTexto || config.colorTexto,
      huerfano: huerfano && !editado,
      totalPaneles: activos.length,
      totalPanelesTodos: grupo.length,
      totalInformes: informes.size,
    };

    const descripcion = editado?.descripcion ?? config.descripcion;
    if (descripcion) departamento.descripcion = descripcion;

    const responsable = editado?.responsable ?? config.responsable;
    if (responsable) departamento.responsable = responsable;

    const equipo = editado?.grupo ?? config.grupo;
    if (equipo) departamento.grupo = equipo;

    const workspaceId = editado?.workspaceId ?? config.workspaceId;
    if (workspaceId) departamento.workspaceId = workspaceId;

    const hora =
      editado?.horaActualizacion ??
      config.horaActualizacion ??
      activos.find((p) => p.horaActualizacion)?.horaActualizacion;
    if (hora) departamento.horaActualizacion = hora;

    return departamento;
  });

  return departamentos.sort(
    (a, b) => b.totalPaneles - a.totalPaneles || a.nombre.localeCompare(b.nombre, 'es'),
  );
}

export function buscarDepartamento(
  departamentos: readonly Departamento[],
  idOnombre: string | undefined,
): Departamento | undefined {
  if (!idOnombre) return undefined;
  const clave = idOnombre.toLowerCase();
  return departamentos.find((d) => d.id === clave || d.nombre.toLowerCase() === clave);
}
