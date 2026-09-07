import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useIdentidad } from '../data/ServiciosProvider';
import { perteneceAGrupo, type UsuarioActual } from '../domain/acceso';
import { agruparPorInforme } from '../domain/paneles';
import type { Departamento, GrupoInforme, Panel } from '../domain/types';
import { useDepartamentos, usePanelesActivos } from './usePaneles';

interface EstadoUsuario {
  usuario: UsuarioActual | null;
  cargando: boolean;
  /** Fase 1: usuarios de prueba. Vacío cuando la identidad es la real. */
  usuariosDePrueba: UsuarioActual[];
  cambiarUsuario: (id: string) => void;
}

const Contexto = createContext<EstadoUsuario | null>(null);

export function AccesoProvider({ children }: { children: ReactNode }) {
  const identidad = useIdentidad();
  const [usuario, setUsuario] = useState<UsuarioActual | null>(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let vivo = true;
    const cargar = () => {
      void identidad
        .getUsuarioActual()
        .then((actual) => {
          if (vivo) setUsuario(actual);
        })
        .finally(() => {
          if (vivo) setCargando(false);
        });
    };
    cargar();
    const dejarDeEscuchar = identidad.alCambiar?.(cargar);
    return () => {
      vivo = false;
      dejarDeEscuchar?.();
    };
  }, [identidad]);

  const valor = useMemo<EstadoUsuario>(
    () => ({
      usuario,
      cargando,
      usuariosDePrueba: identidad.usuariosDePrueba?.() ?? [],
      cambiarUsuario: (id: string) => identidad.cambiarUsuario?.(id),
    }),
    [usuario, cargando, identidad],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

function useEstadoUsuario(): EstadoUsuario {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta <AccesoProvider> por encima de este componente');
  return contexto;
}

export interface Acceso extends EstadoUsuario {
  esAdministrador: boolean;
  /** Ve el área si está en su equipo de Teams. */
  puedeVerDepartamento: (departamento: Departamento) => boolean;
  /** Ve el panel si está en el equipo del área, o en el grupo del propio panel. */
  puedeVerPanel: (panel: Panel) => boolean;
}

/**
 * Quién ve qué. Lo decide la pertenencia al equipo de Teams del departamento.
 *
 * Un área sin equipo asignado se ve: no hay nada que aplicar todavía y dejarla
 * invisible haría parecer que el portal está roto. Administración lo avisa.
 *
 * Esto es cosmético: el permiso de verdad lo aplica Power BI al abrir.
 */
export function useAcceso(): Acceso {
  const estado = useEstadoUsuario();
  const { departamentos } = useDepartamentos();

  return useMemo(() => {
    const porNombre = new Map(departamentos.map((d) => [d.nombre, d]));
    const { usuario } = estado;

    const puedeVerDepartamento = (departamento: Departamento): boolean => {
      if (!departamento.grupo) return true;
      if (!usuario) return false;
      return perteneceAGrupo(usuario, departamento.grupo);
    };

    const puedeVerPanel = (panel: Panel): boolean => {
      if (panel.grupoAcceso) {
        return usuario ? perteneceAGrupo(usuario, panel.grupoAcceso) : false;
      }
      const departamento = porNombre.get(panel.departamento);
      if (!departamento) return true;
      return puedeVerDepartamento(departamento);
    };

    return {
      ...estado,
      esAdministrador: estado.usuario?.esAdministrador ?? false,
      puedeVerDepartamento,
      puedeVerPanel,
    };
  }, [estado, departamentos]);
}

/**
 * Lo que el portal de consulta enseña: activo y visible para quien mira.
 * Lo que no está asignado a tus equipos no aparece; no se atenúa ni se ofrece
 * pedirlo.
 */
export function usePanelesVisibles(): { paneles: Panel[]; cargando: boolean } {
  const { paneles, cargando } = usePanelesActivos();
  const { puedeVerPanel, cargando: cargandoUsuario } = useAcceso();
  const visibles = useMemo(() => paneles.filter(puedeVerPanel), [paneles, puedeVerPanel]);
  return { paneles: visibles, cargando: cargando || cargandoUsuario };
}

export function useDepartamentosVisibles(): { departamentos: Departamento[]; cargando: boolean } {
  const { departamentos, cargando } = useDepartamentos();
  const { puedeVerDepartamento, cargando: cargandoUsuario } = useAcceso();
  const visibles = useMemo(
    () => departamentos.filter(puedeVerDepartamento),
    [departamentos, puedeVerDepartamento],
  );
  return { departamentos: visibles, cargando: cargando || cargandoUsuario };
}

export function usePanelesVisiblesDeDepartamento(nombreDepartamento: string | undefined): {
  paneles: Panel[];
  informes: GrupoInforme[];
  cargando: boolean;
} {
  const { paneles, cargando } = usePanelesVisibles();
  const delDepartamento = useMemo(
    () => (nombreDepartamento ? paneles.filter((p) => p.departamento === nombreDepartamento) : []),
    [paneles, nombreDepartamento],
  );
  const informes = useMemo(() => agruparPorInforme(delDepartamento), [delDepartamento]);
  return { paneles: delDepartamento, informes, cargando };
}
