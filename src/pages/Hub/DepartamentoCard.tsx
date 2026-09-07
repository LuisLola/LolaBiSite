import { Link } from 'react-router-dom';
import { ListaPaneles } from '../../components/ListaPaneles';
import type { Departamento, Panel } from '../../domain/types';
import { AreaAvatar } from '../../ui/AreaAvatar';
import { Card } from '../../ui/Card';
import estilos from './DepartamentoCard.module.css';

const VISIBLES = 3;

export interface DepartamentoCardProps {
  departamento: Departamento;
  paneles: readonly Panel[];
  informes: number;
}

export function DepartamentoCard({ departamento, paneles, informes }: DepartamentoCardProps) {
  const primeros = paneles.slice(0, VISIBLES);
  const restantes = paneles.length - primeros.length;
  const ruta = `/departamento/${departamento.id}`;

  return (
    <Card className={estilos.tarjeta}>
      <div className={estilos.cabecera}>
        <AreaAvatar
          iniciales={departamento.iniciales}
          color={departamento.color}
          colorTexto={departamento.colorTexto}
          huerfano={departamento.huerfano}
        />
        <div className={estilos.textos}>
          <Link to={ruta} className={estilos.nombre}>
            {departamento.nombre}
          </Link>
          <div className={estilos.conteo}>
            {departamento.totalPaneles} {departamento.totalPaneles === 1 ? 'panel' : 'paneles'} ·{' '}
            {informes} {informes === 1 ? 'informe' : 'informes'}
          </div>
        </div>
      </div>

      {departamento.descripcion ? <p className={estilos.descripcion}>{departamento.descripcion}</p> : null}

      <div className={estilos.paneles}>
        <ListaPaneles paneles={primeros} vacio="Sin paneles activos." />
        {restantes > 0 ? (
          <Link to={ruta} className={estilos.mas}>
            +{restantes} más
          </Link>
        ) : (
          <Link to={ruta} className={estilos.mas}>
            Ver el área
          </Link>
        )}
      </div>

      <div className={estilos.pie}>
        <span className={estilos.pieResponsable}>
          {departamento.responsable ?? 'Sin responsable asignado'}
        </span>
        <span className={estilos.pieHora}>
          {departamento.horaActualizacion
            ? `Actualiza ${departamento.horaActualizacion}`
            : 'Hora sin declarar'}
        </span>
      </div>
    </Card>
  );
}
