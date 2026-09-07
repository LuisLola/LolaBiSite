import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import type { AjustesDepartamento } from './DepartamentoRepository';
import { useRepositorioDepartamentos } from './ServiciosProvider';

interface EstadoAjustes {
  ajustes: AjustesDepartamento[];
  cargando: boolean;
  guardar: (ajustes: AjustesDepartamento) => Promise<void>;
  restablecer: () => Promise<void>;
  admiteRestablecer: boolean;
}

const Contexto = createContext<EstadoAjustes | null>(null);

/** Ajustes de departamento (equipo, área de trabajo, cara) cargados una vez. */
export function AjustesDepartamentoProvider({ children }: { children: ReactNode }) {
  const repositorio = useRepositorioDepartamentos();
  const [ajustes, setAjustes] = useState<AjustesDepartamento[]>([]);
  const [cargando, setCargando] = useState(true);

  const recargar = useCallback(async () => {
    try {
      setAjustes(await repositorio.getAjustes());
    } finally {
      setCargando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    void recargar();
  }, [recargar]);

  const guardar = useCallback(
    async (nuevos: AjustesDepartamento) => {
      await repositorio.guardarAjustes(nuevos);
      await recargar();
    },
    [repositorio, recargar],
  );

  const restablecer = useCallback(async () => {
    if (!repositorio.restablecer) return;
    await repositorio.restablecer();
    await recargar();
  }, [repositorio, recargar]);

  const valor = useMemo<EstadoAjustes>(
    () => ({ ajustes, cargando, guardar, restablecer, admiteRestablecer: Boolean(repositorio.restablecer) }),
    [ajustes, cargando, guardar, restablecer, repositorio],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useAjustesDepartamento(): EstadoAjustes {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta <AjustesDepartamentoProvider> por encima de este componente');
  return contexto;
}
