import { urlAbrirPanel } from '../domain/panelUrls';
import type { Panel } from '../domain/types';
import { useRecientes } from '../hooks/useRecientes';
import estilos from './ListaPaneles.module.css';

export interface ListaPanelesProps {
  paneles: readonly Panel[];
  /** Texto cuando no hay nada que listar. */
  vacio?: string;
  /** Muestra el departamento a la derecha (para listas mezcladas). */
  mostrarDepartamento?: boolean;
}

/**
 * Lista compacta de paneles. Recibe solo lo que quien mira puede ver: el
 * filtrado por equipo se hace antes, en los hooks de acceso.
 */
export function ListaPaneles({
  paneles,
  vacio = 'Todavía no hay paneles aquí.',
  mostrarDepartamento,
}: ListaPanelesProps) {
  const { registrar } = useRecientes();

  if (paneles.length === 0) return <p className={estilos.vacio}>{vacio}</p>;

  return (
    <ul className={estilos.lista}>
      {paneles.map((panel) => (
        <li key={panel.id} className={estilos.fila}>
          <a
            className={estilos.enlace}
            href={urlAbrirPanel(panel)}
            target="_blank"
            rel="noreferrer"
            onClick={() => registrar(panel.id)}
            title={panel.descripcion ?? panel.nombre}
          >
            {panel.nombre}
          </a>
          {mostrarDepartamento ? <span className={estilos.meta}>{panel.departamento}</span> : null}
        </li>
      ))}
    </ul>
  );
}
