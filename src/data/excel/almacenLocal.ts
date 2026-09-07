import type { Panel } from '../../domain/types';

const CLAVE = 'portal-bi:paneles:v1';
const CLAVE_RECIENTES = 'portal-bi:recientes:v1';
const CLAVE_USUARIO = 'portal-bi:usuario-simulado:v1';

function almacen(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return window.localStorage;
  } catch {
    return null;
  }
}

/** Paneles guardados tras editar en administración, o null si nunca se editó. */
export function leerPanelesGuardados(): Panel[] | null {
  const memoria = almacen();
  if (!memoria) return null;
  try {
    const bruto = memoria.getItem(CLAVE);
    if (!bruto) return null;
    const datos = JSON.parse(bruto) as unknown;
    if (!Array.isArray(datos)) return null;
    return datos as Panel[];
  } catch {
    return null;
  }
}

export function guardarPaneles(paneles: readonly Panel[]): void {
  const memoria = almacen();
  if (!memoria) return;
  try {
    memoria.setItem(CLAVE, JSON.stringify(paneles));
  } catch {
    // Cuota llena o almacenamiento bloqueado: la sesión sigue en memoria.
  }
}

export function borrarPanelesGuardados(): void {
  const memoria = almacen();
  if (!memoria) return;
  try {
    memoria.removeItem(CLAVE);
  } catch {
    // sin efecto
  }
}

/** "Mis paneles": últimos abiertos por este navegador. */
export function leerRecientes(): string[] {
  const memoria = almacen();
  if (!memoria) return [];
  try {
    const datos = JSON.parse(memoria.getItem(CLAVE_RECIENTES) ?? '[]') as unknown;
    return Array.isArray(datos) ? (datos as string[]).filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function guardarRecientes(ids: readonly string[]): void {
  const memoria = almacen();
  if (!memoria) return;
  try {
    memoria.setItem(CLAVE_RECIENTES, JSON.stringify(ids.slice(0, 8)));
  } catch {
    // sin efecto
  }
}

export function leerUsuarioSimulado(): string | null {
  const memoria = almacen();
  if (!memoria) return null;
  try {
    return memoria.getItem(CLAVE_USUARIO);
  } catch {
    return null;
  }
}

export function guardarUsuarioSimulado(id: string): void {
  const memoria = almacen();
  if (!memoria) return;
  try {
    memoria.setItem(CLAVE_USUARIO, id);
  } catch {
    // sin efecto
  }
}
