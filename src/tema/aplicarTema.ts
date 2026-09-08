/*
 * Escribe el tema como variables CSS. Todo el DOM del sistema esta aqui.
 *
 * Detalles que importan:
 *  - Una sola hoja, reemplazada (no acumulada) en cada aplicacion.
 *  - Selector de clase repetido (.portalBiRaiz.portalBiRaiz) para ganar a
 *    tokens.css sin depender del orden de inyeccion: dentro de SPFx,
 *    style-loader tambien inyecta en runtime y ese orden no esta garantizado.
 *  - Si alguien monta un createPortal(..., document.body) nuevo, ese subarbol
 *    pierde las variables: tiene que llevar la clase portalBiTokens.
 */
import { TOKENS, type Tema } from './tema';

const CLAVE_CACHE = 'portalbi.marca';
const TTL_CACHE = 60 * 60 * 1000; // 1 h

let hoja: HTMLStyleElement | null = null;

export function aplicarTema(tema: Tema): void {
  if (typeof document === 'undefined') return;
  if (!hoja) {
    hoja = document.createElement('style');
    hoja.setAttribute('data-portal-bi-tema', '');
    document.head.appendChild(hoja);
  }
  const declaraciones = TOKENS.map((token) => `--${token}:${tema[token]}`).join(';');
  hoja.textContent = `.portalBiRaiz.portalBiRaiz,.portalBiTokens.portalBiTokens{${declaraciones}}`;
}

/**
 * Ultimo tema conocido. Se aplica de forma sincrona en el arranque, antes del
 * primer pintado, para que a partir de la segunda visita no haya parpadeo
 * mientras se lee la lista.
 */
export function leerCache(): Partial<Tema> | undefined {
  try {
    const crudo = window.localStorage.getItem(CLAVE_CACHE);
    if (!crudo) return undefined;
    const guardado = JSON.parse(crudo) as { fecha?: number; tema?: Partial<Tema> };
    if (!guardado.fecha || Date.now() - guardado.fecha > TTL_CACHE) return undefined;
    return guardado.tema;
  } catch {
    return undefined;
  }
}

export function guardarCache(tema: Partial<Tema>): void {
  try {
    window.localStorage.setItem(CLAVE_CACHE, JSON.stringify({ fecha: Date.now(), tema }));
  } catch {
    // Modo privado o almacenamiento lleno: el tema sigue funcionando sin cache.
  }
}
