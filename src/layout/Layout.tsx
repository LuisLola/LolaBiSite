import { useEffect, useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useConfiguracion } from '../app/configuracion';
import { useAcceso } from '../hooks/useAcceso';
import { CommandPalette } from '../pages/Buscador/CommandPalette';
import { Select } from '../ui/Campos';
import { cx } from '../ui/cx';
import estilos from './Layout.module.css';

function claseNav({ isActive }: { isActive: boolean }) {
  return cx(estilos.enlaceNav, isActive && estilos.enlaceNavActivo);
}

export function Layout() {
  const { titulo, mostrarAdministracion, origenDatos } = useConfiguracion();
  const { usuario, usuariosDePrueba, cambiarUsuario, esAdministrador } = useAcceso();
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
            <span className={estilos.sello} aria-hidden="true">
              LC
            </span>
            <span>
              <span className={estilos.marcaNombre}>Lola Casademunt</span>
              <span className={estilos.marcaSub}>{titulo}</span>
            </span>
          </NavLink>

          <nav className={estilos.navegacion} aria-label="Secciones">
            <NavLink to="/" className={claseNav} end>
              Portada
            </NavLink>
            {mostrarAdministracion && esAdministrador ? (
              <NavLink to="/admin" className={claseNav}>
                Administración
              </NavLink>
            ) : null}
          </nav>

          <div className={estilos.derecha}>
            <button type="button" className={estilos.atajo} onClick={() => setBuscadorAbierto(true)}>
              Buscar panel…
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
