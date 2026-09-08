declare interface IPortalBiWebPartStrings {
  PropiedadesDescripcion: string;
  GrupoBasico: string;
  EtiquetaTitulo: string;
  EtiquetaLista: string;
  EtiquetaListaAreas: string;
  EtiquetaUrlSitio: string;
  AyudaUrlSitio: string;
  EtiquetaModo: string;
  AyudaModo: string;
  ModoInline: string;
  ModoBoton: string;
  EtiquetaTextoBoton: string;
  EtiquetaGrupoAdmin: string;
  AyudaGrupoAdmin: string;
  EtiquetaDepartamento: string;
  AyudaDepartamento: string;
  EtiquetaAdministracion: string;
}

declare module 'PortalBiWebPartStrings' {
  const strings: IPortalBiWebPartStrings;
  export = strings;
}
