import { useMemo } from 'react';
import { crearMutacion, useEstadoPaneles } from '../data/estadoPaneles';
import { useAjustesDepartamento } from '../data/estadoDepartamentos';
import { useRepositorio } from '../data/ServiciosProvider';
import { derivarDepartamentos } from '../domain/departamentos';
import { agruparPorInforme, ordenarPaneles, soloActivos } from '../domain/paneles';
import type { Departamento, GrupoInforme, Panel, PanelInput } from '../domain/types';

/** Todos los paneles, en cualquier estado. */
export function usePaneles(): { data: Panel[]; isPending: boolean; error: Error | null } {
  const { paneles, cargando, error } = useEstadoPaneles();
  return { data: paneles, isPending: cargando, error };
}

/**
 * Departamentos derivados de los paneles ya cargados: el repositorio tambien
 * sabe calcularlos (getDepartamentos), pero derivarlos aqui evita una segunda
 * lectura de la lista en fase 2.
 */
export function useDepartamentos(): { departamentos: Departamento[]; cargando: boolean } {
  const { data, isPending } = usePaneles();
  const { ajustes, cargando: cargandoAjustes } = useAjustesDepartamento();
  const departamentos = useMemo(() => derivarDepartamentos(data, ajustes), [data, ajustes]);
  return { departamentos, cargando: isPending || cargandoAjustes };
}

/** Paneles visibles en el portal de consulta (solo Activo). */
export function usePanelesActivos(): { paneles: Panel[]; cargando: boolean } {
  const { data, isPending } = usePaneles();
  const paneles = useMemo(() => ordenarPaneles(soloActivos(data)), [data]);
  return { paneles, cargando: isPending };
}

export function usePanelesDeDepartamento(nombreDepartamento: string | undefined): {
  paneles: Panel[];
  informes: GrupoInforme[];
  cargando: boolean;
} {
  const { paneles, cargando } = usePanelesActivos();
  const delDepartamento = useMemo(
    () => (nombreDepartamento ? paneles.filter((p) => p.departamento === nombreDepartamento) : []),
    [paneles, nombreDepartamento],
  );
  const informes = useMemo(() => agruparPorInforme(delDepartamento), [delDepartamento]);
  return { paneles: delDepartamento, informes, cargando };
}

export function usePanel(id: string | undefined): { panel: Panel | undefined; cargando: boolean } {
  const { data, isPending } = usePaneles();
  const panel = useMemo(() => (id ? data.find((p) => p.id === id) : undefined), [data, id]);
  return { panel, cargando: isPending };
}

export function useMutacionesPanel() {
  const repositorio = useRepositorio();
  const { ejecutar, escribiendo } = useEstadoPaneles();

  return useMemo(() => {
    const crear = crearMutacion<PanelInput, Panel>(
      ejecutar,
      (entrada) => repositorio.createPanel(entrada),
      escribiendo,
    );
    const actualizar = crearMutacion<{ id: string; cambios: Partial<PanelInput> }, Panel>(
      ejecutar,
      ({ id, cambios }) => repositorio.updatePanel(id, cambios),
      escribiendo,
    );
    const retirar = crearMutacion<string, void>(ejecutar, (id) => repositorio.deletePanel(id), escribiendo);
    const reemplazarTodo = crearMutacion<readonly Panel[], Panel[]>(
      ejecutar,
      (paneles) => {
        if (!repositorio.reemplazarTodo) return Promise.reject(new Error('Este origen no admite importar'));
        return repositorio.reemplazarTodo(paneles);
      },
      escribiendo,
    );
    const restablecer = crearMutacion<void, Panel[]>(
      ejecutar,
      () => {
        if (!repositorio.restablecer) return Promise.reject(new Error('Este origen no admite restablecer'));
        return repositorio.restablecer();
      },
      escribiendo,
    );

    return {
      crear,
      actualizar,
      retirar,
      reemplazarTodo,
      restablecer,
      admiteImportar: Boolean(repositorio.reemplazarTodo),
    };
  }, [repositorio, ejecutar, escribiendo]);
}
