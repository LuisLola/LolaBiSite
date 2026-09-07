import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import type { Panel, PanelInput } from '../domain/types';
import { useRepositorio } from './ServiciosProvider';

/**
 * Estado de servidor con hooks propios: una sola lectura del repositorio,
 * compartida por todas las pantallas, y recarga despues de cada escritura.
 * Sin Redux y sin dependencias que exijan React 18 (SPFx todavia va con 17).
 */
interface EstadoPaneles {
  paneles: Panel[];
  cargando: boolean;
  error: Error | null;
  recargar: () => Promise<void>;
  ejecutar: <T>(operacion: () => Promise<T>) => Promise<T>;
  escribiendo: boolean;
}

const Contexto = createContext<EstadoPaneles | null>(null);

export function EstadoPanelesProvider({ children }: { children: ReactNode }) {
  const repositorio = useRepositorio();
  const [paneles, setPaneles] = useState<Panel[]>([]);
  const [cargando, setCargando] = useState(true);
  const [escribiendo, setEscribiendo] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const montado = useRef(true);

  useEffect(() => {
    montado.current = true;
    return () => {
      montado.current = false;
    };
  }, []);

  const recargar = useCallback(async () => {
    try {
      const lista = await repositorio.getPaneles();
      if (montado.current) {
        setPaneles(lista);
        setError(null);
      }
    } catch (fallo) {
      if (montado.current) setError(fallo instanceof Error ? fallo : new Error(String(fallo)));
    } finally {
      if (montado.current) setCargando(false);
    }
  }, [repositorio]);

  useEffect(() => {
    setCargando(true);
    void recargar();
  }, [recargar]);

  const ejecutar = useCallback(
    async <T,>(operacion: () => Promise<T>): Promise<T> => {
      setEscribiendo(true);
      try {
        const resultado = await operacion();
        await recargar();
        return resultado;
      } finally {
        if (montado.current) setEscribiendo(false);
      }
    },
    [recargar],
  );

  const valor = useMemo<EstadoPaneles>(
    () => ({ paneles, cargando, error, recargar, ejecutar, escribiendo }),
    [paneles, cargando, error, recargar, ejecutar, escribiendo],
  );

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useEstadoPaneles(): EstadoPaneles {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta <EstadoPanelesProvider> por encima de este componente');
  return contexto;
}

/** Adaptador minimo con la forma de una mutacion: mutate / mutateAsync / isPending. */
export interface Mutacion<TEntrada, TSalida> {
  mutate: (entrada: TEntrada) => void;
  mutateAsync: (entrada: TEntrada) => Promise<TSalida>;
  isPending: boolean;
}

export function crearMutacion<TEntrada, TSalida>(
  ejecutar: EstadoPaneles['ejecutar'],
  operacion: (entrada: TEntrada) => Promise<TSalida>,
  escribiendo: boolean,
): Mutacion<TEntrada, TSalida> {
  const mutateAsync = (entrada: TEntrada) => ejecutar(() => operacion(entrada));
  return {
    mutateAsync,
    mutate: (entrada: TEntrada) => {
      void mutateAsync(entrada);
    },
    isPending: escribiendo,
  };
}

export type { Panel, PanelInput };
