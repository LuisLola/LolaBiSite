import { createContext, useContext, useMemo, type ReactNode } from 'react';

export interface ConfiguracionPortal {
  /** Titulo del heroe. En SPFx llega como propiedad del web part. */
  titulo: string;
  subtitulo: string;
  /** Departamento que se resalta al entrar, si se indica. */
  departamentoPorDefecto?: string;
  /** El web part puede ocultar /admin para los lectores. */
  mostrarAdministracion: boolean;
  /** Etiqueta del origen de datos ("Excel local" / "Lista de SharePoint"). */
  origenDatos: string;
  urlGlosario: string;
}

const PREDETERMINADA: ConfiguracionPortal = {
  titulo: 'Portal BI',
  subtitulo: 'Los paneles de Power BI de Lola Casademunt, por departamento.',
  mostrarAdministracion: true,
  origenDatos: 'Excel local',
  urlGlosario: '#/glosario',
};

const Contexto = createContext<ConfiguracionPortal>(PREDETERMINADA);

export function ConfiguracionProvider({
  valor,
  children,
}: {
  valor: Partial<ConfiguracionPortal>;
  children: ReactNode;
}) {
  const configuracion = useMemo<ConfiguracionPortal>(() => ({ ...PREDETERMINADA, ...valor }), [valor]);
  return <Contexto.Provider value={configuracion}>{children}</Contexto.Provider>;
}

export function useConfiguracion(): ConfiguracionPortal {
  return useContext(Contexto);
}
