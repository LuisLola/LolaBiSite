/*
 * Aplica el tema y deja cambiarlo desde Administracion.
 *
 * El tema activo es un DATO compartido (una fila de la lista "Marca LC"), no
 * una preferencia del navegador: lo elige quien administra y lo ve todo el
 * mundo. Por eso vive aqui y no en localStorage; la cache local solo evita el
 * parpadeo del primer pintado.
 */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { aplicarTema, guardarCache, leerCache } from './aplicarTema';
import {
  MARCA_VACIA,
  resolverMarca,
  resolverTema,
  TEMA_BASE,
  temasDisponibles,
  type Marca,
  type ServicioMarca,
  type Tema,
} from './tema';

export interface EstadoTema {
  /** Nombres de tema disponibles, Base primero. */
  temas: string[];
  activo: string;
  /** false en local: sin origen remoto no hay nada que cambiar. */
  puedeCambiar: boolean;
  guardando: boolean;
  cambiar: (tema: string) => Promise<void>;
  /**
   * Los valores ya resueltos. Casi todo el portal los consume como variables
   * CSS, pero `logo` decide qué se renderiza, no solo cómo se pinta, así que
   * hace falta leerlo desde React.
   */
  tokens: Tema;
}

const Contexto = createContext<EstadoTema | null>(null);

export function TemaProvider({ marca, children }: { marca?: ServicioMarca; children: ReactNode }) {
  const [estado, setEstado] = useState<Marca>(MARCA_VACIA);
  const [guardando, setGuardando] = useState(false);

  // Sincrono, en el inicializador: se aplica antes del primer pintado.
  const [tokens, setTokens] = useState<Tema>(() => {
    const inicial = resolverTema(leerCache());
    aplicarTema(inicial);
    return inicial;
  });

  useEffect(() => {
    if (!marca) return;
    let vivo = true;

    marca
      .leer()
      .then((leida) => {
        if (!vivo) return;
        setEstado(leida);
        const resuelto = resolverMarca(leida);
        aplicarTema(resuelto);
        setTokens(resuelto);
        guardarCache(resuelto);
      })
      .catch((error) => {
        // Sin marca remota se usan los valores del paquete: degrada, no rompe.
        console.error('[Portal BI] No se ha podido leer la marca', error);
      });

    return () => {
      vivo = false;
    };
  }, [marca]);

  const cambiar = useCallback(
    async (tema: string) => {
      if (!marca) return;
      setGuardando(true);
      try {
        await marca.guardarTemaActivo(tema);
        const siguiente: Marca = { ...estado, activo: tema };
        setEstado(siguiente);
        const resuelto = resolverMarca(siguiente);
        aplicarTema(resuelto);
        setTokens(resuelto);
        guardarCache(resuelto);
      } finally {
        setGuardando(false);
      }
    },
    [marca, estado],
  );

  const valor: EstadoTema = {
    temas: temasDisponibles(estado),
    activo: estado.activo || TEMA_BASE,
    puedeCambiar: Boolean(marca),
    guardando,
    cambiar,
    tokens,
  };

  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export function useTema(): EstadoTema {
  const contexto = useContext(Contexto);
  if (!contexto) throw new Error('Falta <TemaProvider> por encima de este componente');
  return contexto;
}
