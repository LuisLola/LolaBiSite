import { ArrowUpRight } from 'lucide-react';
import { slugDepartamento } from '../../config/departamentos.config';
import { urlAbrirPanel } from '../../domain/panelUrls';
import type { Panel } from '../../domain/types';
import { useRecientes } from '../../hooks/useRecientes';
import { Badge } from '../../ui/Badge';
import { BotonEnlace } from '../../ui/Button';
import { Card } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import estilos from './TarjetaDestacada.module.css';

export interface TarjetaDestacadaProps {
  panel: Panel;
  /** true si el panel esta marcado como Destacado en los datos. */
  marcado: boolean;
}

/** El unico KPI en burdeos de la portada. */
export function TarjetaDestacada({ panel, marcado }: TarjetaDestacadaProps) {
  const { registrar } = useRecientes();

  return (
    <Card variante="burdeos" className={estilos.destacada}>
      <div>
        <SectionLabel sobreBurdeos>El más consultado</SectionLabel>
        <h2 className={estilos.titulo}>{panel.nombre}</h2>
      </div>
      <p className={estilos.descripcion}>
        {panel.descripcion ??
          (marcado
            ? 'Marcado como destacado por el responsable del área.'
            : 'Sugerido: todavía no hay ningún panel marcado como destacado.')}
      </p>

      <a
        className={estilos.enlace}
        href={urlAbrirPanel(panel)}
        target="_blank"
        rel="noreferrer"
        onClick={() => registrar(panel.id)}
      >
        Abrir panel
        <ArrowUpRight size={14} strokeWidth={1.75} />
      </a>

      <div className={estilos.meta}>
        <span>{panel.departamento}</span>
        <Badge tono="sobreBurdeos">{marcado ? 'Destacado' : 'Sugerido'}</Badge>
        <span className={estilos.metaHora}>
          {panel.horaActualizacion ? `Actualiza ${panel.horaActualizacion}` : 'Hora sin declarar'}
        </span>
      </div>
    </Card>
  );
}

export interface TarjetaNovedadProps {
  panel: Panel;
  total: number;
}

/** "Novedad de la semana": la ultima incorporacion a la lista. */
export function TarjetaNovedad({ panel, total }: TarjetaNovedadProps) {
  return (
    <Card className={estilos.destacada}>
      <div>
        <SectionLabel>Novedad de la semana</SectionLabel>
        <h2 className={estilos.claraTitulo}>{panel.nombre}</h2>
      </div>
      <p className={estilos.claraDescripcion}>
        {panel.descripcion ?? 'Última incorporación a la lista de paneles. Todavía sin descripción.'}
      </p>
      <BotonEnlace
        a={`/departamento/${slugDepartamento(panel.departamento)}`}
        variante="secundario"
        pequeno
        className={estilos.claraAccion}
      >
        Ver {panel.departamento}
      </BotonEnlace>
      <div className={estilos.claraMeta}>
        <span>{total} paneles publicados en total</span>
        <span className={estilos.claraMetaHora}>
          {panel.horaActualizacion ? `Actualiza ${panel.horaActualizacion}` : 'Hora sin declarar'}
        </span>
      </div>
    </Card>
  );
}
