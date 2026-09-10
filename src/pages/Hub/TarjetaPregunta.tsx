import { ArrowRight, Plus } from 'lucide-react';
import { useState, type CSSProperties } from 'react';
import { urlAbrirPanel } from '../../domain/panelUrls';
import type { Departamento, GrupoInforme } from '../../domain/types';
import { useRecientes } from '../../hooks/useRecientes';
import { Modal } from '../../ui/Modal';
import estilos from './TarjetaPregunta.module.css';

export interface TarjetaPreguntaProps {
  informe: GrupoInforme;
  /** El del informe. Puede faltar si el departamento no está configurado. */
  departamento?: Departamento;
}

/**
 * Una tarjeta = un informe, y su título es la pregunta que responde.
 *
 * El título sale de la columna "Pregunta" de la lista. Vacía, cae al nombre del
 * informe: la tarjeta pierde el tono de pregunta pero nunca desaparece, así que
 * la lista se puede ir rellenando informe a informe.
 */
export function TarjetaPregunta({ informe, departamento }: TarjetaPreguntaProps) {
  const { registrar } = useRecientes();
  const primero = informe.paneles[0];
  if (!primero) return null;

  const hora = departamento?.horaActualizacion ?? primero.horaActualizacion;
  const descripcion = informe.paneles.map((p) => p.descripcion?.trim()).find(Boolean);

  return (
    <a
      className={estilos.tarjeta}
      style={{ '--local-color-area': departamento?.color ?? 'var(--primario)' } as CSSProperties}
      href={urlAbrirPanel(primero)}
      target="_blank"
      rel="noreferrer"
      onClick={() => registrar(primero.id)}
    >
      {departamento ? (
        <span
          className={estilos.area}
          style={{ background: departamento.color, color: departamento.colorTexto }}
        >
          {departamento.nombre}
        </span>
      ) : null}

      <h3 className={estilos.titulo}>{informe.pregunta ?? informe.titulo}</h3>

      {/*
        Sin descripción no se pinta un "Sin descripción" en cada tarjeta: cinco
        avisos iguales no le dicen nada a quien mira y ensucian la portada. El
        hueco lo denuncia administración, que es quien puede arreglarlo.
      */}
      {descripcion ? <p className={estilos.descripcion}>{descripcion}</p> : null}

      <div className={estilos.pie}>
        <span className={estilos.hora}>{hora ? `Datos hasta las ${hora}` : 'Hora sin declarar'}</span>
        <span className={estilos.flecha} aria-hidden="true">
          <ArrowRight size={26} strokeWidth={2} />
        </span>
      </div>
    </a>
  );
}

/**
 * Pedir un informe que no está, o avisar de un dato que no cuadra.
 *
 * La app de gestión de proyectos se abre en un modal aquí dentro, como en la
 * home de la intranet: quien pregunta no sale del portal ni tiene que saber que
 * detrás hay otra herramienta.
 */
export function TarjetaSolicitud({ url, contacto }: { url: string; contacto: string }) {
  const [abierta, setAbierta] = useState(false);

  return (
    <>
      <button type="button" className={estilos.solicitud} onClick={() => setAbierta(true)}>
        <span className={estilos.solicitudTitulo}>¿Tu pregunta no está aquí?</span>
        <span className={estilos.solicitudTexto}>
          Pide el informe que te falta o avisa de un dato que no cuadra. Lo recoge {contacto} y se abre aquí
          mismo.
        </span>
        <span className={estilos.solicitudAccion}>
          <Plus size={24} strokeWidth={2.25} />
          Abrir una solicitud
        </span>
      </button>

      {abierta ? (
        <Modal
          titulo="Pedir un informe o avisar de un dato"
          subtitulo={`Se abre la app de gestión de proyectos. Lo recoge ${contacto}.`}
          alCerrar={() => setAbierta(false)}
        >
          <iframe className={estilos.marco} src={url} title="Gestión de proyectos" />
        </Modal>
      ) : null}
    </>
  );
}
