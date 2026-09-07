/*
 * Fase 2. Lo compila la cadena de SPFx, no el build de Vite: esta excluido de
 * tsconfig.app.json porque la aplicacion local nunca lo importa.
 *
 * Los grupos salen de Microsoft Graph con el cliente que ya trae SPFx
 * (MSGraphClientFactory): sin MSAL, sin tokens a mano. Requiere aprobar en el
 * catalogo de aplicaciones los permisos declarados en package-solution.json.
 */
import type { WebPartContext } from '@microsoft/sp-webpart-base';
import { GRUPO_ADMINISTRADORES } from '../../config/tenant.config';
import { esElMismoGrupo, type GrupoM365, type MiembroGrupo, type UsuarioActual } from '../../domain/acceso';
import type { ProveedorIdentidad } from '../identidad/ProveedorIdentidad';

interface GrupoGraph {
  id: string;
  displayName?: string;
  mail?: string;
  description?: string;
  resourceProvisioningOptions?: string[];
}

interface UsuarioGraph {
  id: string;
  displayName?: string;
  mail?: string;
  userPrincipalName?: string;
}

const CAMPOS_GRUPO = 'id,displayName,mail,description,resourceProvisioningOptions';

function aGrupo(grupo: GrupoGraph): GrupoM365 {
  const resultado: GrupoM365 = {
    id: grupo.id,
    nombre: grupo.displayName ?? grupo.mail ?? grupo.id,
    esEquipoTeams: (grupo.resourceProvisioningOptions ?? []).indexOf('Team') >= 0,
  };
  if (grupo.mail) resultado.correo = grupo.mail;
  if (grupo.description) resultado.descripcion = grupo.description;
  return resultado;
}

function aMiembro(usuario: UsuarioGraph, rol: MiembroGrupo['rol']): MiembroGrupo {
  const miembro: MiembroGrupo = {
    id: usuario.id,
    nombre: usuario.displayName ?? usuario.userPrincipalName ?? usuario.id,
    rol,
  };
  const correo = usuario.mail ?? usuario.userPrincipalName;
  if (correo) miembro.correo = correo;
  return miembro;
}

export class IdentidadSharePoint implements ProveedorIdentidad {
  readonly nombre = 'Microsoft 365';

  private readonly contexto: WebPartContext;
  private readonly grupoAdministradores: string;
  private cache: Promise<UsuarioActual> | null = null;

  constructor(contexto: WebPartContext, grupoAdministradores: string = GRUPO_ADMINISTRADORES) {
    this.contexto = contexto;
    this.grupoAdministradores = grupoAdministradores;
  }

  getUsuarioActual(): Promise<UsuarioActual> {
    if (!this.cache) this.cache = this.cargarUsuario();
    return this.cache;
  }

  async buscarGrupos(consulta: string): Promise<GrupoM365[]> {
    const cliente = await this.contexto.msGraphClientFactory.getClient('3');
    const texto = consulta.trim().replace(/'/g, "''");
    let peticion = cliente.api('/groups').version('v1.0').select(CAMPOS_GRUPO).top(50);
    if (texto) {
      peticion = peticion.filter(`startswith(displayName,'${texto}') or startswith(mail,'${texto}')`);
    }
    const respuesta: { value: GrupoGraph[] } = await peticion.get();
    return (respuesta.value ?? []).map(aGrupo);
  }

  async getMiembros(grupoId: string): Promise<MiembroGrupo[]> {
    const cliente = await this.contexto.msGraphClientFactory.getClient('3');
    const [propietarios, miembros]: Array<{ value: UsuarioGraph[] }> = await Promise.all([
      cliente.api(`/groups/${grupoId}/owners`).version('v1.0').top(100).get(),
      cliente.api(`/groups/${grupoId}/members`).version('v1.0').top(999).get(),
    ]);

    const porId = new Map<string, MiembroGrupo>();
    for (const usuario of miembros.value ?? []) porId.set(usuario.id, aMiembro(usuario, 'miembro'));
    for (const usuario of propietarios.value ?? []) porId.set(usuario.id, aMiembro(usuario, 'propietario'));
    return [...porId.values()].sort((a, b) => a.nombre.localeCompare(b.nombre, 'es'));
  }

  private async cargarUsuario(): Promise<UsuarioActual> {
    const perfil = this.contexto.pageContext.user;
    let grupos: GrupoM365[] = [];

    try {
      const cliente = await this.contexto.msGraphClientFactory.getClient('3');
      const respuesta: { value: GrupoGraph[] } = await cliente
        .api('/me/memberOf/microsoft.graph.group')
        .version('v1.0')
        .select(CAMPOS_GRUPO)
        .top(999)
        .get();
      grupos = (respuesta.value ?? []).map(aGrupo);
    } catch (error) {
      // Sin permiso de Graph aprobado no hay grupos: mejor no enseñar nada que
      // enseñar de más. Administración lo avisa.
      console.error('[Portal BI] No se han podido leer los grupos del usuario', error);
    }

    return {
      id: perfil.loginName,
      nombre: perfil.displayName,
      correo: perfil.email,
      grupos,
      esAdministrador: grupos.some((grupo) => esElMismoGrupo(grupo, this.grupoAdministradores)),
    };
  }
}
