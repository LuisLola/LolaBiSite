import { describe, expect, it } from 'vitest';
import { esElMismoGrupo, perteneceAGrupo, type GrupoM365, type UsuarioActual } from './acceso';

const EQUIPO_RETAIL: GrupoM365 = {
  id: '11111111-2222-3333-4444-555555555555',
  nombre: 'BI-RetailOnline',
  correo: 'bi-retailonline@lolacasademunt.com',
  esEquipoTeams: true,
};

const USUARIO: UsuarioActual = {
  id: 'u1',
  nombre: 'Persona de Retail-Online',
  grupos: [EQUIPO_RETAIL],
  esAdministrador: false,
};

describe('esElMismoGrupo', () => {
  it('empareja por objectId', () => {
    expect(esElMismoGrupo(EQUIPO_RETAIL, EQUIPO_RETAIL.id)).toBe(true);
  });

  it('empareja por correo y por nombre, que es lo que hay en los datos de hoy', () => {
    expect(esElMismoGrupo(EQUIPO_RETAIL, 'bi-retailonline@lolacasademunt.com')).toBe(true);
    expect(esElMismoGrupo(EQUIPO_RETAIL, 'bi-retailonline')).toBe(true);
    expect(esElMismoGrupo(EQUIPO_RETAIL, 'BI-RETAILONLINE')).toBe(true);
  });

  it('no empareja grupos distintos', () => {
    expect(esElMismoGrupo(EQUIPO_RETAIL, 'BI-Multimarca')).toBe(false);
  });

  it('nada empareja con vacío', () => {
    expect(esElMismoGrupo(EQUIPO_RETAIL, '')).toBe(false);
    expect(esElMismoGrupo(EQUIPO_RETAIL, undefined)).toBe(false);
    expect(esElMismoGrupo(undefined, undefined)).toBe(false);
  });
});

describe('perteneceAGrupo', () => {
  it('deja pasar al miembro del equipo', () => {
    expect(perteneceAGrupo(USUARIO, EQUIPO_RETAIL)).toBe(true);
    expect(perteneceAGrupo(USUARIO, 'BI-RetailOnline')).toBe(true);
  });

  it('no deja pasar a quien no está', () => {
    expect(perteneceAGrupo(USUARIO, 'BI-Logistica')).toBe(false);
  });

  it('sin equipos no pertenece a nada', () => {
    expect(perteneceAGrupo({ ...USUARIO, grupos: [] }, EQUIPO_RETAIL)).toBe(false);
  });
});
