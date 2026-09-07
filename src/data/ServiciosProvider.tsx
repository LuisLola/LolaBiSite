import { createContext, useContext, type ReactNode } from 'react';
import type { DepartamentoRepository } from './DepartamentoRepository';
import type { PanelRepository } from './PanelRepository';
import type { ProveedorIdentidad } from './identidad/ProveedorIdentidad';

/**
 * Las tres piezas que cambian entre fases. Quien las elige es el arranque:
 * src/main.tsx en local y el web part de SPFx en la intranet. Ningún
 * componente pregunta nunca dónde está corriendo.
 */
export interface ServiciosPortal {
  paneles: PanelRepository;
  departamentos: DepartamentoRepository;
  identidad: ProveedorIdentidad;
}

const Contexto = createContext<ServiciosPortal | null>(null);

export function ServiciosProvider({
  servicios,
  children,
}: {
  servicios: ServiciosPortal;
  children: ReactNode;
}) {
  return <Contexto.Provider value={servicios}>{children}</Contexto.Provider>;
}

export function useServicios(): ServiciosPortal {
  const servicios = useContext(Contexto);
  if (!servicios) throw new Error('Falta <ServiciosProvider> por encima de este componente');
  return servicios;
}

export function useRepositorio(): PanelRepository {
  return useServicios().paneles;
}

export function useRepositorioDepartamentos(): DepartamentoRepository {
  return useServicios().departamentos;
}

export function useIdentidad(): ProveedorIdentidad {
  return useServicios().identidad;
}
