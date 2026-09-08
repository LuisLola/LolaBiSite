/*
 * La cadena de SPFx no conoce los CSS Modules: los procesa webpack (ver las
 * reglas que anade spfx/gulpfile.js) pero TypeScript no sabe que tipo tiene
 * `import estilos from './X.module.css'`. En el build de Vite esto lo cubre
 * vite/client; aqui hay que declararlo.
 *
 * camelCaseOnly en el css-loader del gulpfile: las clases llegan como
 * propiedades del objeto por defecto.
 */
declare module '*.module.css' {
  const clases: { readonly [clave: string]: string };
  export default clases;
}

/** Hojas globales importadas por su efecto (global.css, tokens.css). */
declare module '*.css';
