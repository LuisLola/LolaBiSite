/*
 * Contrato del tema: los tokens que se pueden cambiar y su valor de arranque.
 *
 * Las claves son EXACTAMENTE el nombre de la variable CSS sin "--". Por eso una
 * fila de la lista "Marca LC" es `primario` / `#6f263d` y el inyector solo tiene
 * que hacer `--${clave}: ${valor}`: no hay tabla de mapeo que mantener.
 *
 * Los tokens derivados (--primario-hover, --velo-modal, los --sobre-primario-*,
 * los tintes de chip) NO estan aqui a proposito: se calculan con color-mix() en
 * src/ui/tokens.global.css a partir de estos, asi que siguen a la marca solos.
 *
 * Los valores de aqui tienen que coincidir con el bloque BASE de tokens.global.css.
 * tema.test.ts lo comprueba.
 *
 * Este fichero lo compilan las dos cadenas (Vite y SPFx con TS 4.7): TypeScript
 * plano, sin imports de @microsoft/* y sin sintaxis posterior a 4.7.
 */

export const TOKENS = [
  // Marca
  'primario',
  'primario-texto',
  'acento',
  'lila',
  'azul',
  // Estado
  'positivo',
  'negativo',
  'alerta',
  'aviso-texto',
  // Superficies
  'lienzo',
  'papel',
  'tarjeta',
  'borde-tarjeta',
  'divisor',
  'divisor-fuerte',
  'fila-alterna',
  // Texto
  'texto',
  'texto-secundario',
  'texto-terciario',
  // Forma
  'radio-tarjeta',
  'radio-boton',
  'radio-chip',
  // Ritmo
  'espacio-1',
  'espacio-2',
  'espacio-3',
  'espacio-4',
  'espacio-5',
  'espacio-6',
  'espacio-7',
  // Tipografia y ancho
  'fuente',
  'ancho-maximo',
] as const;

export type TokenTema = (typeof TOKENS)[number];
export type Tema = Record<TokenTema, string>;

export const TEMA_DEFECTO: Tema = {
  primario: '#6f263d',
  'primario-texto': '#fff6ed',
  acento: '#dfa0c9',
  lila: '#b4b5df',
  azul: '#10069f',

  positivo: '#0f7a63',
  negativo: '#ba1c43',
  alerta: '#ff5948',
  'aviso-texto': '#8a4b00',

  lienzo: '#fff6ed',
  papel: '#f3ece4',
  tarjeta: '#ffffff',
  'borde-tarjeta': '#e7dace',
  divisor: '#f2e9de',
  'divisor-fuerte': '#e0d3c6',
  'fila-alterna': '#fcf8f3',

  texto: '#1a1416',
  'texto-secundario': '#6b5c60',
  'texto-terciario': '#8c7e82',

  'radio-tarjeta': '8px',
  'radio-boton': '6px',
  'radio-chip': '4px',

  'espacio-1': '4px',
  'espacio-2': '8px',
  'espacio-3': '12px',
  'espacio-4': '16px',
  'espacio-5': '24px',
  'espacio-6': '32px',
  'espacio-7': '48px',

  fuente: "'Montserrat Variable', 'Montserrat', 'Segoe UI', system-ui, sans-serif",
  'ancho-maximo': '1680px',
};

const ES_TOKEN = new Set<string>(TOKENS as readonly string[]);

const LONGITUD = /^-?\d+(\.\d+)?(px|rem|em|%|vw|vh|ch)$/;
const COLOR_HEX = /^#[0-9a-f]{3,8}$/i;
const COLOR_FUNCION = /^(rgb|rgba|hsl|hsla)\(\s*[\d\s.,%/]+\)$/i;
const COLOR_VAR = /^var\(--[a-z0-9-]+\)$/i;
const FUENTE = /^[\w\s',-]+$/;

/**
 * Un valor del tema acaba dentro de un <style>: es una frontera de confianza.
 * Cualquier cosa que no encaje con su forma esperada se descarta y manda la capa
 * de abajo. `red; } * { display: none` no pasa de aqui.
 */
export function sanearTema(bruto: Readonly<Record<string, unknown>>): Partial<Tema> {
  const limpio: Partial<Tema> = {};

  for (const clave of Object.keys(bruto)) {
    if (!ES_TOKEN.has(clave)) continue;

    const valor = String(bruto[clave] ?? '').trim();
    // Las columnas de SharePoint devuelven '' cuando estan en blanco: eso
    // significa "usa el valor de abajo", no "pinta de vacio".
    if (!valor) continue;

    const valido =
      clave === 'fuente'
        ? FUENTE.test(valor)
        : clave.indexOf('radio-') === 0 || clave.indexOf('espacio-') === 0 || clave.indexOf('ancho-') === 0
          ? LONGITUD.test(valor)
          : COLOR_HEX.test(valor) || COLOR_FUNCION.test(valor) || COLOR_VAR.test(valor);

    if (!valido) {
      console.warn(`[Portal BI] Valor de tema descartado: ${clave} = "${valor}"`);
      continue;
    }
    limpio[clave as TokenTema] = valor;
  }

  return limpio;
}

/**
 * Combina las capas del tema, de menor a mayor prioridad. Funcion pura y sin
 * DOM: se puede probar en node.
 */
export function resolverTema(...capas: ReadonlyArray<Readonly<Record<string, unknown>> | undefined>): Tema {
  let tema: Tema = { ...TEMA_DEFECTO };
  for (const capa of capas) {
    if (!capa) continue;
    tema = { ...tema, ...sanearTema(capa) };
  }
  return tema;
}
