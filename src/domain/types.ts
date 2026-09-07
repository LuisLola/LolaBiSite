import type { GrupoM365 } from './acceso';

/** Estados posibles de un panel. Solo "Activo" se ve en el portal de consulta. */
export type EstadoPanel = 'Activo' | 'En pruebas' | 'Retirado';

export const ESTADOS: readonly EstadoPanel[] = ['Activo', 'En pruebas', 'Retirado'];

/**
 * Un "panel" no es un informe: es una pagina concreta de un informe de Power BI.
 * Varias filas pueden compartir reportId y diferenciarse solo por pageName.
 */
export interface Panel {
  /** Id de la lista de SharePoint, o id generado en fase 1. */
  id: string;
  nombre: string;
  /** Texto libre e informativo. Nunca clave. Hoy viene sucio del export. */
  areaTrabajo: string;
  /** URL de incrustacion (reportEmbed...autoAuth=true). Solo para <iframe>. */
  urlPanel: string;
  /** Derivado de urlPanel al importar. */
  reportId: string;
  /** Derivado de urlPanel al importar. */
  pageName: string;
  /** Tenant, derivado de urlPanel. Normalmente el de config. */
  ctid?: string;
  /** Override manual de la URL de apertura. Vacio = se deriva. */
  urlDirecta?: string;
  departamento: string;
  descripcion?: string;
  responsable?: string;
  /** Override: restringe el panel a un grupo mas estrecho que el del area. */
  grupoAcceso?: string;
  destacado: boolean;
  orden: number;
  estado: EstadoPanel;
  /** Hora de refresco declarada, texto libre ("08:15"). */
  horaActualizacion?: string;
  creado?: string;
  modificado?: string;
}

/** Campos editables desde administracion. */
export type PanelInput = Omit<Panel, 'id' | 'reportId' | 'pageName' | 'ctid' | 'creado' | 'modificado'> & {
  reportId?: string;
  pageName?: string;
  ctid?: string;
};

export interface Departamento {
  /** Slug estable para rutas. */
  id: string;
  /** Valor tal cual aparece en los datos. */
  nombre: string;
  iniciales: string;
  color: string;
  colorTexto: string;
  descripcion?: string;
  responsable?: string;
  /** Equipo de Teams (grupo de M365) que da acceso al area. */
  grupo?: GrupoM365;
  /** Area de trabajo de Power BI del departamento. */
  workspaceId?: string;
  horaActualizacion?: string;
  /** true si el departamento no esta en departamentos.config.ts. */
  huerfano: boolean;
  /** Paneles activos. */
  totalPaneles: number;
  /** Paneles en cualquier estado. */
  totalPanelesTodos: number;
  /** Informes distintos (reportId) que agrupan esos paneles. */
  totalInformes: number;
}

/** Grupo de paneles que comparten reportId: "3 paginas de LC Retail". */
export interface GrupoInforme {
  reportId: string;
  /** Nombre comun deducido de los titulos de sus paginas. */
  titulo: string;
  paneles: Panel[];
  workspaceId?: string;
}

export type TipoAvisoCalidad =
  | 'url-embed-como-enlace'
  | 'sin-descripcion'
  | 'sin-responsable'
  | 'sin-hora'
  | 'departamento-huerfano'
  | 'departamento-sin-equipo'
  | 'falta-area-de-trabajo'
  | 'area-trabajo-sucia'
  | 'url-no-parseable';

export interface AvisoCalidad {
  tipo: TipoAvisoCalidad;
  gravedad: 'alta' | 'media' | 'baja';
  mensaje: string;
}
