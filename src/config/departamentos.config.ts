import type { GrupoM365 } from '../domain/acceso';

export interface DepartamentoConfig {
  /** Dos letras. */
  iniciales: string;
  /** Fondo del cuadrado de área. Solo colores de la paleta. */
  color: string;
  /** Texto sobre ese fondo. El rosa exige texto oscuro. */
  colorTexto: string;
  descripcion?: string;
  responsable?: string;
  horaActualizacion?: string;
  /**
   * Área de trabajo de Power BI del departamento. Un departamento, un área.
   * Se rellena desde Administración → Accesos.
   */
  workspaceId?: string;
  /**
   * Equipo de Teams (grupo de M365) que da acceso al área. La pertenencia a
   * este grupo es lo único que decide qué ve cada persona.
   */
  grupo?: GrupoM365;
}

/**
 * Valores de arranque de cada departamento. Los departamentos NO son una tabla:
 * se derivan de los valores distintos de la columna "Departamento". Esto solo
 * les pone cara y los ata a su equipo y a su área de trabajo.
 *
 * Lo que se edite en Administración → Accesos manda sobre esto.
 *
 * Añadir un departamento nuevo a los datos no rompe nada: cae en
 * DEPARTAMENTO_NEUTRO hasta que alguien lo describa.
 */
export const DEPARTAMENTOS_CONFIG: Record<string, DepartamentoConfig> = {
  'Retail-Online': {
    iniciales: 'RO',
    color: '#6F263D',
    colorTexto: '#FFF6ED',
    descripcion:
      'Venta en tienda propia y canal online: desempeño diario, ranking por temporada y comparativa entre temporadas.',
    responsable: 'Dirección de Operaciones',
    horaActualizacion: '08:15',
    // id vacío: pendiente de enlazar con el equipo real desde Administración.
    grupo: { id: '', nombre: 'BI-RetailOnline', esEquipoTeams: true },
  },
  Multimarca: {
    iniciales: 'MM',
    color: '#BA1C43',
    colorTexto: '#FFF6ED',
    descripcion:
      'Canal mayorista y multimarca: servicio de temporada, ranking de producto y plan de servicio B2B.',
    responsable: 'Dirección Comercial',
    horaActualizacion: '08:30',
    grupo: { id: '', nombre: 'BI-Multimarca', esEquipoTeams: true },
  },
  Logistica: {
    iniciales: 'LG',
    color: '#DFA0C9',
    colorTexto: '#1A1416',
    descripcion:
      'Almacén y transporte: análisis de transportes y previsión de entradas y salidas de almacén.',
    responsable: 'Dirección de Logística',
    horaActualizacion: '07:45',
    grupo: { id: '', nombre: 'BI-Logistica', esEquipoTeams: true },
  },
};

/** Estilo de reserva para cualquier departamento que aparezca sin configurar. */
export const DEPARTAMENTO_NEUTRO: DepartamentoConfig = {
  iniciales: '--',
  color: '#F3ECE4',
  colorTexto: '#6B5C60',
};

/** Iniciales de 2 letras a partir del nombre, para departamentos sin config. */
export function inicialesDe(nombre: string): string {
  const limpio = nombre.replace(/[^\p{L}\p{N}\s-]/gu, ' ').trim();
  if (!limpio) return DEPARTAMENTO_NEUTRO.iniciales;
  const trozos = limpio.split(/[\s-]+/).filter(Boolean);
  if (trozos.length >= 2) {
    return (trozos[0]![0]! + trozos[1]![0]!).toUpperCase();
  }
  return limpio.slice(0, 2).toUpperCase();
}

export function configDepartamento(nombre: string): { config: DepartamentoConfig; huerfano: boolean } {
  const config = DEPARTAMENTOS_CONFIG[nombre];
  if (config) return { config, huerfano: false };
  return {
    config: { ...DEPARTAMENTO_NEUTRO, iniciales: inicialesDe(nombre) },
    huerfano: true,
  };
}

/** Slug estable para la ruta /departamento/:slug. */
export function slugDepartamento(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}
