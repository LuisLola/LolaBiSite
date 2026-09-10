import { ChevronDown, X } from 'lucide-react';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { cx } from './cx';
import estilos from './Buscable.module.css';

interface Sitio {
  arriba: number;
  izquierda: number;
  ancho: number;
}

export interface OpcionBuscable {
  /** Lo que se guarda al elegir. */
  clave: string;
  titulo: string;
  subtitulo?: string;
}

export interface BuscableProps {
  id?: string;
  /** Lo que se ve cerrado. Vacío pinta el marcador. */
  valor: string;
  marcador: string;
  /** Clave elegida, para resaltarla en la lista. */
  claveElegida?: string;
  buscar: (consulta: string) => Promise<OpcionBuscable[]>;
  alElegir: (opcion: OpcionBuscable) => void;
  /** Si se pasa, sale una X para dejarlo vacío. */
  alQuitar?: () => void;
  marcadorBusqueda?: string;
  vacio?: string;
  invalido?: boolean;
}

/**
 * Desplegable con buscador. Sustituye a los campos de texto donde el valor no
 * es texto libre sino una cosa que existe en otro sitio: una persona del
 * directorio, un equipo de Teams.
 *
 * Escribir a mano el nombre de un equipo era el fallo mas caro del portal:
 * una letra de mas y el area se quedaba sin enlazar, sin ningun aviso y con
 * todos sus informes fuera del portal.
 */
export function Buscable({
  id,
  valor,
  marcador,
  claveElegida,
  buscar,
  alElegir,
  alQuitar,
  marcadorBusqueda = 'Escribe para buscar…',
  vacio = 'No hay nada que coincida.',
  invalido,
}: BuscableProps) {
  const [abierto, setAbierto] = useState(false);
  const [consulta, setConsulta] = useState('');
  const [opciones, setOpciones] = useState<OpcionBuscable[] | null>(null);
  const [sitio, setSitio] = useState<Sitio | null>(null);
  const envoltorio = useRef<HTMLDivElement>(null);
  const disparador = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const entrada = useRef<HTMLInputElement>(null);

  /*
   * El panel se pinta en document.body, no dentro del campo. Dentro de la
   * tabla de administracion el contenedor tiene overflow-x para poder
   * desplazarla, y eso recorta cualquier cosa que asome: el desplegable
   * quedaba cortado a la altura de la fila.
   */
  useLayoutEffect(() => {
    if (!abierto) {
      setSitio(null);
      return;
    }
    const medir = () => {
      const caja = disparador.current?.getBoundingClientRect();
      if (caja) setSitio({ arriba: caja.bottom + 4, izquierda: caja.left, ancho: caja.width });
    };
    medir();
    // Al desplazar, el campo se mueve y el panel tiene que irse con el.
    window.addEventListener('scroll', medir, true);
    window.addEventListener('resize', medir);
    return () => {
      window.removeEventListener('scroll', medir, true);
      window.removeEventListener('resize', medir);
    };
  }, [abierto]);

  // Cerrar al pulsar fuera o con Escape: un panel que se queda abierto tapando
  // la fila de al lado es peor que no tener panel.
  useEffect(() => {
    if (!abierto) return;
    const alPulsarFuera = (evento: MouseEvent) => {
      const destino = evento.target as Node;
      // El panel vive fuera del envoltorio (esta en body): hay que mirar los dos.
      if (envoltorio.current?.contains(destino) || panel.current?.contains(destino)) return;
      setAbierto(false);
    };
    const alTeclear = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('mousedown', alPulsarFuera);
    document.addEventListener('keydown', alTeclear);
    return () => {
      document.removeEventListener('mousedown', alPulsarFuera);
      document.removeEventListener('keydown', alTeclear);
    };
  }, [abierto]);

  useEffect(() => {
    if (abierto) entrada.current?.focus();
  }, [abierto]);

  /*
   * La busqueda se retrasa 200 ms: en la intranet cada tecla es una llamada a
   * Microsoft Graph. `vivo` descarta las respuestas que llegan tarde, para que
   * una consulta lenta no pise el resultado de la siguiente.
   */
  useEffect(() => {
    if (!abierto) return;
    let vivo = true;
    const temporizador = window.setTimeout(() => {
      void buscar(consulta)
        .then((encontradas) => {
          if (vivo) setOpciones(encontradas);
        })
        .catch((error: unknown) => {
          console.error('[Portal BI] No se ha podido buscar', error);
          if (vivo) setOpciones([]);
        });
    }, 200);
    return () => {
      vivo = false;
      window.clearTimeout(temporizador);
    };
  }, [abierto, consulta, buscar]);

  const elegir = (opcion: OpcionBuscable) => {
    alElegir(opcion);
    setAbierto(false);
    setConsulta('');
  };

  return (
    <div className={estilos.envoltorio} ref={envoltorio}>
      <button
        ref={disparador}
        type="button"
        id={id}
        className={cx(estilos.disparador, abierto && estilos.disparadorAbierto, invalido && estilos.invalido)}
        aria-haspopup="listbox"
        aria-expanded={abierto}
        onClick={() => setAbierto((previo) => !previo)}
      >
        <span className={cx(estilos.textoDisparador, !valor && estilos.marcador)}>{valor || marcador}</span>
        {valor && alQuitar ? (
          <span
            role="button"
            tabIndex={0}
            className={estilos.quitar}
            aria-label="Dejar vacío"
            onClick={(evento) => {
              evento.stopPropagation();
              alQuitar();
            }}
            onKeyDown={(evento) => {
              if (evento.key === 'Enter' || evento.key === ' ') {
                evento.preventDefault();
                evento.stopPropagation();
                alQuitar();
              }
            }}
          >
            <X size={15} strokeWidth={1.75} />
          </span>
        ) : null}
        <ChevronDown className={estilos.caret} size={17} strokeWidth={1.75} aria-hidden="true" />
      </button>

      {abierto && sitio
        ? createPortal(
            // portalBiTokens: fuera del portal no resolveria ninguna variable.
            <div className="portalBiTokens">
              <div
                ref={panel}
                className={estilos.panel}
                style={{ top: sitio.arriba, left: sitio.izquierda, minWidth: Math.max(sitio.ancho, 260) }}
              >
          <input
            ref={entrada}
            type="search"
            className={estilos.buscador}
            placeholder={marcadorBusqueda}
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
            onKeyDown={(evento) => {
              // Enter elige la primera: lo normal es escribir dos letras y
              // que la que buscas ya sea la de arriba.
              if (evento.key === 'Enter' && opciones?.[0]) {
                evento.preventDefault();
                elegir(opciones[0]);
              }
            }}
          />
          <div className={estilos.lista} role="listbox">
            {opciones === null ? (
              <p className={estilos.mensaje}>Buscando…</p>
            ) : opciones.length === 0 ? (
              <p className={estilos.mensaje}>{vacio}</p>
            ) : (
              opciones.map((opcion) => (
                <button
                  key={opcion.clave}
                  type="button"
                  role="option"
                  aria-selected={opcion.clave === claveElegida}
                  className={cx(estilos.opcion, opcion.clave === claveElegida && estilos.opcionElegida)}
                  onClick={() => elegir(opcion)}
                >
                  <span className={estilos.opcionTitulo}>{opcion.titulo}</span>
                  {opcion.subtitulo ? (
                    <span className={estilos.opcionSubtitulo}>{opcion.subtitulo}</span>
                  ) : null}
                </button>
              ))
            )}
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
