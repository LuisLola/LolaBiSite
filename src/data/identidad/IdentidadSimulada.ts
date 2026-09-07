import type { GrupoM365, MiembroGrupo, UsuarioActual } from '../../domain/acceso';
import type { ProveedorIdentidad } from './ProveedorIdentidad';

const CLAVE = 'portal-bi:usuario-simulado:v2';

/**
 * Equipos de Teams de mentira. Los nombres coinciden con los de
 * departamentos.config.ts para que la simulación case; los objectId son falsos
 * y se sustituyen por los de verdad al enlazar cada área con su equipo.
 */
const EQUIPOS: Record<string, GrupoM365> = {
  retail: {
    id: 'simulado-retail-online',
    nombre: 'BI-RetailOnline',
    correo: 'bi-retailonline@lolacasademunt.com',
    esEquipoTeams: true,
    descripcion: 'Equipo de Retail y Online (simulado)',
  },
  multimarca: {
    id: 'simulado-multimarca',
    nombre: 'BI-Multimarca',
    correo: 'bi-multimarca@lolacasademunt.com',
    esEquipoTeams: true,
    descripcion: 'Equipo de Multimarca (simulado)',
  },
  logistica: {
    id: 'simulado-logistica',
    nombre: 'BI-Logistica',
    correo: 'bi-logistica@lolacasademunt.com',
    esEquipoTeams: true,
    descripcion: 'Equipo de Logística (simulado)',
  },
};

const USUARIOS: UsuarioActual[] = [
  {
    id: 'bi',
    nombre: 'Equipo de BI',
    correo: 'bi@lolacasademunt.com',
    grupos: [EQUIPOS.retail!, EQUIPOS.multimarca!, EQUIPOS.logistica!],
    esAdministrador: true,
  },
  {
    id: 'retail',
    nombre: 'Persona de Retail-Online',
    correo: 'retail@lolacasademunt.com',
    grupos: [EQUIPOS.retail!],
    esAdministrador: false,
  },
  {
    id: 'multi-log',
    nombre: 'Persona de Multimarca y Logística',
    correo: 'comercial@lolacasademunt.com',
    grupos: [EQUIPOS.multimarca!, EQUIPOS.logistica!],
    esAdministrador: false,
  },
  {
    id: 'sin-equipos',
    nombre: 'Persona sin equipos de BI',
    correo: 'nuevo@lolacasademunt.com',
    grupos: [],
    esAdministrador: false,
  },
];

/** Miembros de mentira, solo para ver la pantalla de accesos con contenido. */
const MIEMBROS: Record<string, MiembroGrupo[]> = {
  'simulado-retail-online': [
    { id: 'm1', nombre: 'Equipo de BI', correo: 'bi@lolacasademunt.com', rol: 'propietario' },
    { id: 'm2', nombre: 'Persona de Retail-Online', correo: 'retail@lolacasademunt.com', rol: 'miembro' },
  ],
  'simulado-multimarca': [
    { id: 'm1', nombre: 'Equipo de BI', correo: 'bi@lolacasademunt.com', rol: 'propietario' },
    { id: 'm3', nombre: 'Persona de Multimarca y Logística', correo: 'comercial@lolacasademunt.com', rol: 'miembro' },
  ],
  'simulado-logistica': [
    { id: 'm1', nombre: 'Equipo de BI', correo: 'bi@lolacasademunt.com', rol: 'propietario' },
    { id: 'm3', nombre: 'Persona de Multimarca y Logística', correo: 'comercial@lolacasademunt.com', rol: 'miembro' },
  ],
};

function leerGuardado(): string | null {
  try {
    return typeof window === 'undefined' ? null : window.localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
}

/**
 * Fase 1. Ni Graph, ni MSAL, ni red: usuarios y equipos de mentira para poder
 * ver el portal como lo vería cada persona. En fase 2 lo sustituye
 * IdentidadSharePoint con la misma interfaz.
 */
export class IdentidadSimulada implements ProveedorIdentidad {
  readonly nombre = 'Identidad simulada';

  private idActual: string;
  private escuchas = new Set<() => void>();

  constructor() {
    const guardado = leerGuardado();
    this.idActual = USUARIOS.some((u) => u.id === guardado) ? guardado! : USUARIOS[0]!.id;
  }

  async getUsuarioActual(): Promise<UsuarioActual> {
    return USUARIOS.find((u) => u.id === this.idActual) ?? USUARIOS[0]!;
  }

  async buscarGrupos(consulta: string): Promise<GrupoM365[]> {
    const texto = consulta.trim().toLowerCase();
    const todos = Object.values(EQUIPOS);
    if (!texto) return todos;
    return todos.filter(
      (grupo) =>
        grupo.nombre.toLowerCase().includes(texto) || (grupo.correo ?? '').toLowerCase().includes(texto),
    );
  }

  async getMiembros(grupoId: string): Promise<MiembroGrupo[]> {
    return MIEMBROS[grupoId] ?? [];
  }

  usuariosDePrueba(): UsuarioActual[] {
    return USUARIOS;
  }

  cambiarUsuario(id: string): void {
    if (!USUARIOS.some((u) => u.id === id)) return;
    this.idActual = id;
    try {
      window.localStorage.setItem(CLAVE, id);
    } catch {
      // sin efecto
    }
    this.escuchas.forEach((escucha) => escucha());
  }

  alCambiar(escucha: () => void): () => void {
    this.escuchas.add(escucha);
    return () => this.escuchas.delete(escucha);
  }
}
