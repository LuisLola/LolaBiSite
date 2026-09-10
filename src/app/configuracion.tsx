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
  /**
   * App de gestion de proyectos donde se piden informes y se avisa de datos que
   * no cuadran. Se abre en un modal dentro del portal, igual que en la home de
   * la intranet. Vacia = la portada no ofrece pedir nada.
   */
  urlSolicitudes: string;
  /**
   * A quién se manda al usuario cuando algo no puede resolver él: un fallo de
   * carga, un informe que no ve, un dato que no cuadra. Sale tal cual en el
   * texto, así que es un nombre de equipo, no una dirección.
   */
  contactoSoporte: string;
}

const PREDETERMINADA: ConfiguracionPortal = {
  titulo: 'Portal de informes',
  subtitulo: 'Los paneles de Power BI de Lola Casademunt, por departamento.',
  mostrarAdministracion: true,
  origenDatos: 'Excel local',
  // Vacia hasta que exista un glosario de verdad: un enlace que no lleva a
  // ningun sitio es peor que no tener enlace.
  urlGlosario: '',
  urlSolicitudes:
    'https://apps.powerapps.com/play/e/eda9ebe4-4e7d-e3bb-afda-d3a6b7193b54/app/74987a06-6cbc-418a-8eb9-0d780a3cbe48?hideNavBar=true',
  contactoSoporte: 'Digitalización',
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
