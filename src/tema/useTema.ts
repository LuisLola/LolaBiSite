/*
 * Aplica el tema en el arranque y, si hay origen remoto, cuando llega.
 *
 * No hay contexto de React ni provider a proposito: nada en JS lee el tema, lo
 * lee el CSS. Un hook llamado una vez en PortalBI es todo lo que hace falta.
 */
import { useEffect, useState } from 'react';
import { aplicarTema, guardarCache, leerCache } from './aplicarTema';
import { resolverTema, type Tema } from './tema';

export type CargarMarca = () => Promise<Partial<Tema>>;

export function useTema(cargarMarca?: CargarMarca): void {
  // Sincrono, en el inicializador: se aplica antes del primer pintado.
  useState(() => {
    aplicarTema(resolverTema(leerCache()));
    return null;
  });

  useEffect(() => {
    if (!cargarMarca) return;
    let vivo = true;

    cargarMarca()
      .then((marca) => {
        if (!vivo) return;
        aplicarTema(resolverTema(marca));
        guardarCache(marca);
      })
      .catch((error) => {
        // Sin marca remota se usan los valores del paquete: degrada, no rompe.
        console.error('[Portal BI] No se ha podido leer la marca', error);
      });

    return () => {
      vivo = false;
    };
  }, [cargarMarca]);
}
