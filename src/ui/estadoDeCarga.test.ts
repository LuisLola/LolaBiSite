import { describe, expect, it } from 'vitest';
import { estadoDeCarga } from './estadoDeCarga';

const FALLO = new Error('403 Forbidden');

describe('estadoDeCarga', () => {
  it('con paneles, ensena los paneles', () => {
    expect(estadoDeCarga({ cargando: false, error: null, total: 9 })).toBe('con-datos');
  });

  it('mientras carga no dice todavia que no hay nada', () => {
    expect(estadoDeCarga({ cargando: true, error: null, total: 0 })).toBe('cargando');
  });

  it('sin paneles y sin fallo, el portal esta vacio de verdad', () => {
    expect(estadoDeCarga({ cargando: false, error: null, total: 0 })).toBe('vacio');
  });

  it('un fallo de lectura no se puede confundir con un portal vacio', () => {
    // Este es el caso que motiva el modulo: la lectura falla, la lista queda a
    // cero, y sin esta regla el usuario leeria "no tienes nada asignado".
    expect(estadoDeCarga({ cargando: false, error: FALLO, total: 0 })).toBe('error');
  });

  it('el fallo gana tambien mientras se reintenta', () => {
    expect(estadoDeCarga({ cargando: true, error: FALLO, total: 0 })).toBe('error');
  });
});
