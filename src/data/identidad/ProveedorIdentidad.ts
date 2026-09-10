import type { GrupoM365, MiembroGrupo, Persona, UsuarioActual } from '../../domain/acceso';

/**
 * De donde sale la identidad y los grupos del usuario.
 *
 * Fase 1: IdentidadSimulada, sin red.
 * Fase 2: IdentidadSharePoint, con el contexto de SPFx y Microsoft Graph.
 *
 * Ningun componente sabe cual de las dos esta puesta.
 */
export interface ProveedorIdentidad {
  readonly nombre: string;
  /** Quien esta mirando y a que equipos pertenece. */
  getUsuarioActual(): Promise<UsuarioActual>;
  /** Administracion: buscar equipos de Teams / grupos del tenant. */
  buscarGrupos(consulta: string): Promise<GrupoM365[]>;
  /** Administracion: quien esta dentro de un equipo. */
  getMiembros(grupoId: string): Promise<MiembroGrupo[]>;
  /**
   * Administracion: buscar personas del directorio para asignar responsables.
   * Con la consulta vacia devuelve un primer listado con el que arrancar.
   */
  buscarPersonas(consulta: string): Promise<Persona[]>;

  /** Fase 1: lista de usuarios de prueba. Vacio o ausente en produccion. */
  usuariosDePrueba?(): UsuarioActual[];
  /** Fase 1: cambiar de usuario de prueba. */
  cambiarUsuario?(id: string): void;
  /** Fase 1: avisa cuando cambia el usuario de prueba. */
  alCambiar?(escucha: () => void): () => void;
}
