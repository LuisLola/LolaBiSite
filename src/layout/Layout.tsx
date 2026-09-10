import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useConfiguracion } from '../app/configuracion';
import { useAcceso } from '../hooks/useAcceso';
import { CommandPalette } from '../pages/Buscador/CommandPalette';
import { Select } from '../ui/Campos';
import { cx } from '../ui/cx';
import { SIN_LOGO } from '../tema/tema';
import { useTema } from '../tema/TemaProvider';
import estilos from './Layout.module.css';
import { MenuSitio } from './MenuSitio';

function claseNav({ isActive }: { isActive: boolean }) {
  return cx(estilos.enlaceNav, isActive && estilos.enlaceNavActivo);
}

/** Dos iniciales del nombre, para el circulo de la barra. */
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  const primera = palabras[0]![0] ?? '';
  const ultima = palabras.length > 1 ? (palabras[palabras.length - 1]![0] ?? '') : '';
  return (primera + ultima).toUpperCase();
}

export function Layout() {
  const { titulo, mostrarAdministracion, origenDatos } = useConfiguracion();
  const { usuario, usuariosDePrueba, cambiarUsuario, esAdministrador } = useAcceso();
  const { tokens } = useTema();
  const logo = tokens.logo;
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  useEffect(() => {
    const alPulsar = (evento: KeyboardEvent) => {
      if ((evento.metaKey || evento.ctrlKey) && evento.key.toLowerCase() === 'k') {
        evento.preventDefault();
        setBuscadorAbierto(true);
      }
    };
    document.addEventListener('keydown', alPulsar);
    return () => document.removeEventListener('keydown', alPulsar);
  }, []);

  return (
    <div className={cx(estilos.raiz, 'portalBiRaiz')}>
      <header className={estilos.barra}>
        <div className={estilos.barraInterior}>
          <NavLink to="/" className={estilos.marca}>
            {logo === SIN_LOGO ? (
              <span className={estilos.sello} aria-hidden="true">
                LC
              </span>
            ) : (
              // El valor ya viene saneado a url("https://…") por sanearTema.
              <span
                className={estilos.logo}
                style={{ backgroundImage: logo }}
                role="img"
                aria-label="Lola Casademunt"
              />
            )}
            <span className={estilos.marcaNombre}>{titulo}</span>
          </NavLink>

          {/*
            Los dos nombres de administracion son los de las propias pantallas,
            no "Administración": el que entra sabe si viene a tocar informes o a
            mirar quien ve que, y no tiene que abrir un cajon para averiguarlo.
          */}
          <nav className={estilos.navegacion} aria-label="Secciones">
            <NavLink to="/" className={claseNav} end>
              Inicio
            </NavLink>
            {mostrarAdministracion && esAdministrador ? (
              <>
                <NavLink to="/admin" className={claseNav} end>
                  Informes
                </NavLink>
                <NavLink to="/admin/accesos" className={claseNav}>
                  Quién ve qué
                </NavLink>
              </>
            ) : null}
          </nav>

          <div className={estilos.derecha}>
            <button type="button" className={estilos.atajo} onClick={() => setBuscadorAbierto(true)}>
              Buscar un informe…
              <span className={estilos.atajoTecla}>Ctrl K</span>
            </button>

            {usuariosDePrueba.length > 0 ? (
              <div className={estilos.selectorUsuario}>
                <Select
                  aria-label="Ver el portal como"
                  value={usuario?.id ?? ''}
                  onChange={(evento) => cambiarUsuario(evento.target.value)}
                  title="Solo en local: cambia de usuario de prueba. En la intranet manda el equipo de Teams real."
                >
                  {usuariosDePrueba.map((candidato) => (
                    <option key={candidato.id} value={candidato.id}>
                      Ver como: {candidato.nombre}
                    </option>
                  ))}
                </Select>
              </div>
            ) : null}

            {usuario ? (
              <span className={estilos.usuario}>
                <span className={estilos.usuarioIniciales} aria-hidden="true">
                  {iniciales(usuario.nombre)}
                </span>
                {usuario.nombre}
              </span>
            ) : null}

            {esAdministrador ? <MenuSitio /> : null}
          </div>
        </div>
      </header>

      <main className={estilos.contenido}>
        <Outlet />
      </main>

      <footer className={estilos.pieSitio}>
        <span>Portal BI · Lola Casademunt · Origen de datos: {origenDatos}</span>
        <span>
          Los permisos definitivos los aplica Power BI. Aquí solo se ordena y se explica lo que hay.
        </span>
      </footer>

      {buscadorAbierto ? <CommandPalette alCerrar={() => setBuscadorAbierto(false)} /> : null}
    </div>
  );
}
