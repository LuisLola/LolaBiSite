/*
 * Protege las tres invariantes del tema:
 *  1. TOKENS, TEMA_DEFECTO y el bloque BASE de tokens.css dicen lo mismo.
 *  2. Ningun CSS del portal escribe un color a mano ni usa un token inexistente.
 *  3. El merge de capas respeta el orden y el saneado no deja pasar basura.
 *
 * Lee los CSS con node:fs porque el entorno de vitest es node (sin DOM).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { resolverTema, sanearTema, TEMA_DEFECTO, TOKENS, type TokenTema } from './tema';

const RAIZ_SRC = join(__dirname, '..');
const RUTA_TOKENS = join(RAIZ_SRC, 'ui', 'tokens.css');

function cssDelPortal(directorio: string): string[] {
  const encontrados: string[] = [];
  for (const entrada of readdirSync(directorio)) {
    const ruta = join(directorio, entrada);
    if (statSync(ruta).isDirectory()) {
      encontrados.push(...cssDelPortal(ruta));
    } else if (entrada.endsWith('.css')) {
      encontrados.push(ruta);
    }
  }
  return encontrados;
}

const TODOS_LOS_CSS = cssDelPortal(RAIZ_SRC);
const CSS_TOKENS = readFileSync(RUTA_TOKENS, 'utf8');

/** Declaraciones del fichero de tokens, separando base de derivadas. */
function declaracionesDeTokens(): { base: Map<string, string>; derivados: string[] } {
  const base = new Map<string, string>();
  const derivados: string[] = [];
  const patron = /^\s*--([a-z0-9-]+):\s*(.+?);\s*$/gim;
  let coincidencia = patron.exec(CSS_TOKENS);
  while (coincidencia) {
    const [, nombre, valor] = coincidencia;
    // Un derivado es, por definicion, el que se calcula desde otro.
    if (valor!.indexOf('color-mix(') !== -1) derivados.push(nombre!);
    else base.set(nombre!, valor!.trim());
    coincidencia = patron.exec(CSS_TOKENS);
  }
  return { base, derivados };
}

describe('contrato del tema', () => {
  const { base, derivados } = declaracionesDeTokens();

  it('TEMA_DEFECTO tiene exactamente los tokens de TOKENS', () => {
    expect(Object.keys(TEMA_DEFECTO).sort()).toEqual([...TOKENS].sort());
  });

  it('los tokens base de tokens.css son exactamente TOKENS', () => {
    expect([...base.keys()].sort()).toEqual([...TOKENS].sort());
  });

  it('cada token base vale lo mismo en tokens.css y en TEMA_DEFECTO', () => {
    for (const token of TOKENS) {
      expect(base.get(token)?.toLowerCase(), `token ${token}`).toBe(TEMA_DEFECTO[token].toLowerCase());
    }
  });

  it('los derivados no son editables: ninguno esta en TOKENS', () => {
    expect(derivados.length).toBeGreaterThan(0);
    for (const derivado of derivados) {
      expect(TOKENS as readonly string[]).not.toContain(derivado);
    }
  });
});

describe('uso de los tokens en el CSS', () => {
  const declarados = new Set<string>([...declaracionesDeTokens().base.keys(), ...declaracionesDeTokens().derivados]);

  it('todo var(--x) apunta a un token declarado', () => {
    for (const ruta of TODOS_LOS_CSS) {
      const contenido = readFileSync(ruta, 'utf8');
      const usados = contenido.match(/var\(--[a-z0-9-]+/gi) ?? [];
      for (const uso of usados) {
        const nombre = uso.replace('var(--', '');
        expect(declarados, `${ruta} usa --${nombre}`).toContain(nombre);
      }
    }
  });

  it('ningun CSS salvo tokens.css escribe un color a mano', () => {
    const literal = /#[0-9a-fA-F]{3,8}\b|rgba?\(|hsla?\(/;
    for (const ruta of TODOS_LOS_CSS) {
      if (ruta === RUTA_TOKENS) continue;
      const lineas = readFileSync(ruta, 'utf8').split('\n');
      for (let i = 0; i < lineas.length; i++) {
        expect(literal.test(lineas[i]!), `${ruta}:${i + 1} -> ${lineas[i]!.trim()}`).toBe(false);
      }
    }
  });
});

describe('resolverTema', () => {
  it('sin capas devuelve los valores por defecto', () => {
    expect(resolverTema()).toEqual(TEMA_DEFECTO);
  });

  it('la ultima capa gana', () => {
    const tema = resolverTema({ primario: '#111111' }, { primario: '#222222' });
    expect(tema.primario).toBe('#222222');
  });

  it('una capa parcial solo cambia lo suyo', () => {
    const tema = resolverTema({ primario: '#123456' });
    expect(tema.primario).toBe('#123456');
    expect(tema.lienzo).toBe(TEMA_DEFECTO.lienzo);
  });

  it('el vacio significa "usa el valor de abajo"', () => {
    expect(resolverTema({ primario: '' }).primario).toBe(TEMA_DEFECTO.primario);
  });
});

describe('sanearTema', () => {
  it('acepta color hexadecimal, funcion de color y var()', () => {
    expect(sanearTema({ primario: '#123456' }).primario).toBe('#123456');
    expect(sanearTema({ primario: 'rgb(10, 20, 30)' }).primario).toBe('rgb(10, 20, 30)');
    expect(sanearTema({ primario: 'var(--acento)' }).primario).toBe('var(--acento)');
  });

  it('acepta longitudes en los tokens de forma y ritmo', () => {
    expect(sanearTema({ 'radio-tarjeta': '0px' })['radio-tarjeta']).toBe('0px');
    expect(sanearTema({ 'ancho-maximo': '90%' })['ancho-maximo']).toBe('90%');
  });

  it('rechaza una inyeccion de CSS', () => {
    expect(sanearTema({ primario: 'red; } * { display: none' })).toEqual({});
  });

  it('rechaza una longitud donde se espera un color y al contrario', () => {
    expect(sanearTema({ primario: '16px' })).toEqual({});
    expect(sanearTema({ 'radio-boton': '#ffffff' })).toEqual({});
  });

  it('ignora claves que no son tokens', () => {
    expect(sanearTema({ 'no-existe': '#ffffff' })).toEqual({});
  });

  it('rechaza una fuente con caracteres de CSS', () => {
    expect(sanearTema({ fuente: 'Arial; } body { color: red' })).toEqual({});
    expect(sanearTema({ fuente: "'Montserrat', sans-serif" }).fuente).toBe("'Montserrat', sans-serif");
  });
});

describe('contraste de la marca por defecto', () => {
  // WCAG AA para texto normal. El script de PowerShell avisa de lo mismo al
  // publicar el tema nativo de SharePoint.
  function luminancia(hex: string): number {
    const canales = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lineales = canales.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * lineales[0]! + 0.7152 * lineales[1]! + 0.0722 * lineales[2]!;
  }

  it('el texto sobre el color de marca supera 4.5:1', () => {
    const claro = luminancia(TEMA_DEFECTO['primario-texto']);
    const oscuro = luminancia(TEMA_DEFECTO.primario);
    const ratio = (Math.max(claro, oscuro) + 0.05) / (Math.min(claro, oscuro) + 0.05);
    expect(ratio).toBeGreaterThan(4.5);
  });

  it('TOKENS no tiene duplicados', () => {
    expect(new Set<TokenTema>(TOKENS).size).toBe(TOKENS.length);
  });
});
