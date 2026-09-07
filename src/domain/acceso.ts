import { normalizar } from './paneles';

/**
 * Grupo de Microsoft 365. En la practica, el equipo de Teams que gobierna un
 * departamento: mismo objeto en Entra ID que el grupo del equipo.
 */
export interface GrupoM365 {
  /** objectId en Entra ID. Es la clave de verdad. */
  id: string;
  nombre: string;
  /** Direccion SMTP del grupo. */
  correo?: string;
  /** true si el grupo tiene equipo de Teams asociado. */
  esEquipoTeams?: boolean;
  descripcion?: string;
}

export type RolMiembro = 'propietario' | 'miembro';

export interface MiembroGrupo {
  id: string;
  nombre: string;
  correo?: string;
  rol: RolMiembro;
}

export interface UsuarioActual {
  id: string;
  nombre: string;
  correo?: string;
  /** Grupos de M365 a los que pertenece. Es lo que decide que ve. */
  grupos: GrupoM365[];
  /** Puede entrar en administracion. */
  esAdministrador: boolean;
}

/** Referencia a un grupo: el objeto entero, o un id / correo / nombre suelto. */
export type ReferenciaGrupo = GrupoM365 | string | undefined;

function clavesDeGrupo(grupo: GrupoM365): string[] {
  return [grupo.id, grupo.correo, grupo.nombre].filter(Boolean).map((v) => normalizar(String(v)));
}

function clavesDeReferencia(referencia: ReferenciaGrupo): string[] {
  if (!referencia) return [];
  if (typeof referencia === 'string') return [normalizar(referencia)];
  return clavesDeGrupo(referencia);
}

/**
 * Compara por objectId, correo o nombre. Hace falta la comparacion laxa porque
 * los datos de hoy guardan el grupo como texto ("BI-RetailOnline") y todavia no
 * como objectId.
 */
export function esElMismoGrupo(a: ReferenciaGrupo, b: ReferenciaGrupo): boolean {
  const clavesA = clavesDeReferencia(a);
  const clavesB = clavesDeReferencia(b);
  if (clavesA.length === 0 || clavesB.length === 0) return false;
  return clavesA.some((clave) => clave.length > 0 && clavesB.includes(clave));
}

/** true si el usuario pertenece al grupo indicado. */
export function perteneceAGrupo(usuario: UsuarioActual, referencia: ReferenciaGrupo): boolean {
  if (!referencia) return false;
  return usuario.grupos.some((grupo) => esElMismoGrupo(grupo, referencia));
}
