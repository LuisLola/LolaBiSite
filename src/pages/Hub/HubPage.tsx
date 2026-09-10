import { Info, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useConfiguracion } from '../../app/configuracion';
import { useEstadoPaneles } from '../../data/estadoPaneles';
import { agruparPorInforme } from '../../domain/paneles';
import { urlAbrirPanel } from '../../domain/panelUrls';
import type { Departamento } from '../../domain/types';
import { useDepartamentosVisibles, usePanelesVisibles } from '../../hooks/useAcceso';
import { useRecientes } from '../../hooks/useRecientes';
import { AvisoDeError, AvisoDeVacio } from '../../ui/AvisoDeCarga';
import { estadoDeCarga } from '../../ui/estadoDeCarga';
import { CommandPalette } from '../Buscador/CommandPalette';
import { TarjetaPregunta, TarjetaSolicitud } from './TarjetaPregunta';
import estilos from './HubPage.module.css';

export function HubPage() {
  const { urlSolicitudes, contactoSoporte } = useConfiguracion();
  const { paneles, cargando } = usePanelesVisibles();
  const { departamentos } = useDepartamentosVisibles();
  const { paneles: recientes } = useRecientes();
  const { error, recargar } = useEstadoPaneles();
  const [buscadorAbierto, setBuscadorAbierto] = useState(false);

  const informes = useMemo(() => agruparPorInforme(paneles), [paneles]);

  const porNombre = useMemo(() => {
    const mapa = new Map<string, Departamento>();
    for (const departamento of departamentos) mapa.set(departamento.nombre, departamento);
    return mapa;
  }, [departamentos]);

  const estado = estadoDeCarga({ cargando, error, total: paneles.length });

  /*
   * Un fallo de lectura y un portal sin nada asignado producen la misma pantalla
   * vacia, y son problemas de personas distintas. Se separan antes de pintar
   * nada: el resto de la portada no tiene sentido en ninguno de los dos casos.
   */
  if (estado === 'error') {
    return (
      <div className={estilos.pagina}>
        <AvisoDeError error={error} reintentar={() => void recargar()} contacto={contactoSoporte} />
      </div>
    );
  }

  if (estado === 'vacio') {
    return (
      <div className={estilos.pagina}>
        <AvisoDeVacio contacto={contactoSoporte} />
      </div>
    );
  }

  return (
    <div className={estilos.pagina}>
      <div className={estilos.banda}>
        <Info className={estilos.bandaIcono} size={28} strokeWidth={1.75} aria-hidden="true" />
        <p className={estilos.bandaTexto}>
          <strong>Estás en el portal de informes.</strong> Pregunta lo que quieras saber y te llevamos al
          informe que lo responde. Los datos se actualizan solos cada mañana.
        </p>
      </div>

      <section className={estilos.entrada}>
        <h1 className={estilos.titular}>¿Qué quieres mirar?</h1>

        <button type="button" className={estilos.buscador} onClick={() => setBuscadorAbierto(true)}>
          <Search className={estilos.buscadorIcono} size={26} strokeWidth={1.75} aria-hidden="true" />
          ventas, almacén, transportes, temporada…
        </button>

        <p className={estilos.nota}>
          O elige una de las preguntas de abajo. Todo se abre en Power BI y te pedirá tu cuenta de Microsoft
          del trabajo: es normal.
        </p>
      </section>

      <section className={estilos.seccion}>
        <div className={estilos.seccionCabecera}>
          <h2 className={estilos.seccionTitulo}>Las preguntas que más se hacen aquí</h2>
          <p className={estilos.seccionNota}>
            {cargando
              ? 'Buscando lo que puedes ver…'
              : 'Cada una abre el informe que la responde. Solo salen las de tus equipos.'}
          </p>
        </div>

        <div className={estilos.rejilla}>
          {informes.map((informe) => (
            <TarjetaPregunta
              key={informe.reportId}
              informe={informe}
              departamento={porNombre.get(informe.paneles[0]?.departamento ?? '')}
            />
          ))}
          {urlSolicitudes ? <TarjetaSolicitud url={urlSolicitudes} contacto={contactoSoporte} /> : null}
        </div>
      </section>

      {recientes.length > 0 ? (
        <section className={estilos.seccion}>
          <div className={estilos.seccionCabecera}>
            <h2 className={estilos.seccionTitulo}>Los últimos que has abierto</h2>
            <p className={estilos.seccionNota}>Se guardan solo en este ordenador.</p>
          </div>
          <div className={estilos.fila}>
            {recientes.map((panel) => (
              <a
                key={panel.id}
                className={estilos.reciente}
                href={urlAbrirPanel(panel)}
                target="_blank"
                rel="noreferrer"
              >
                <span
                  className={estilos.punto}
                  style={{ background: porNombre.get(panel.departamento)?.color ?? 'var(--primario)' }}
                  aria-hidden="true"
                />
                {panel.nombre}
              </a>
            ))}
          </div>
        </section>
      ) : null}

      <section className={estilos.seccion}>
        <h2 className={estilos.seccionTitulo}>O búscalo por departamento</h2>
        <div className={estilos.fila}>
          {departamentos.map((departamento) => (
            <Link key={departamento.id} className={estilos.area} to={`/departamento/${departamento.id}`}>
              <span className={estilos.punto} style={{ background: departamento.color }} aria-hidden="true" />
              {departamento.nombre}
              <span className={estilos.areaCuenta}>
                {departamento.totalInformes === 1 ? '1 informe' : `${departamento.totalInformes} informes`}
              </span>
            </Link>
          ))}
        </div>
      </section>

      {buscadorAbierto ? <CommandPalette alCerrar={() => setBuscadorAbierto(false)} /> : null}
    </div>
  );
}
