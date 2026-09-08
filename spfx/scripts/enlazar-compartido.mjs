/*
 * Crea spfx/src/compartido apuntando a /src.
 *
 * Por que hace falta: la cadena Heft de SPFx fija rootDir al src del proyecto y
 * el plugin de sass solo escanea esa carpeta. El codigo de interfaz vive en
 * /src (lo comparten Vite y SPFx), asi que si no esta *dentro* de spfx/src, sus
 * *.module.css no reciben tipos ni se compilan, y el emit se descoloca.
 *
 * Es un enlace, no una copia: editar /src se ve al instante en los dos builds.
 * Va en .gitignore, asi que lo recrea `npm install` (postinstall) o
 * `npm run enlazar`.
 */
import { symlinkSync, existsSync, lstatSync, unlinkSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const aqui = dirname(fileURLToPath(import.meta.url));
const enlace = resolve(aqui, '..', 'src', 'compartido');
const destino = resolve(aqui, '..', '..', 'src');

if (!existsSync(destino)) {
  console.error(`[spfx] No existe ${destino}. ¿Repo incompleto?`);
  process.exit(1);
}

if (existsSync(enlace) || lstatSyncSeguro(enlace)) {
  // Si ya apunta a algo, se rehace: es barato y evita enlaces colgados.
  try {
    unlinkSync(enlace);
  } catch {
    console.log('[spfx] src/compartido ya existe y no es un enlace: se deja como esta.');
    process.exit(0);
  }
}

// 'junction' en Windows no necesita permisos de administrador; en macOS y Linux
// se ignora el tipo y se crea un symlink de directorio normal.
symlinkSync(destino, enlace, 'junction');
console.log(`[spfx] src/compartido -> ${destino}`);

function lstatSyncSeguro(ruta) {
  try {
    return lstatSync(ruta);
  } catch {
    return undefined;
  }
}
