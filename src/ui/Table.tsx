import type { ReactNode, TdHTMLAttributes, ThHTMLAttributes } from 'react';
import estilos from './Table.module.css';
import { cx } from './cx';

export interface TableProps {
  children: ReactNode;
  className?: string;
  /** Con filas de grupo, la alternancia la marca quien pinta las filas. */
  cebraManual?: boolean;
}

export function Table({ children, className, cebraManual }: TableProps) {
  return (
    <div className={estilos.envoltorio}>
      <table className={cx(estilos.tabla, cebraManual && estilos.cebraManual, className)}>
        {children}
      </table>
    </div>
  );
}

/** Fila de datos en posicion par, para tablas con cebraManual. */
export function claseFilaAlterna(indice: number): string | undefined {
  return indice % 2 === 1 ? estilos.filaAlterna : undefined;
}

export interface CeldaProps extends TdHTMLAttributes<HTMLTableCellElement> {
  numerico?: boolean;
  estrecha?: boolean;
}

export function Td({ numerico, estrecha, className, children, ...resto }: CeldaProps) {
  return (
    <td className={cx(numerico && estilos.numerico, estrecha && estilos.estrecha, className)} {...resto}>
      {children}
    </td>
  );
}

export interface CabeceraProps extends ThHTMLAttributes<HTMLTableCellElement> {
  numerico?: boolean;
  estrecha?: boolean;
}

export function Th({ numerico, estrecha, className, children, ...resto }: CabeceraProps) {
  return (
    <th className={cx(numerico && estilos.numerico, estrecha && estilos.estrecha, className)} scope="col" {...resto}>
      {children}
    </th>
  );
}

export function FilaAtenuada({ children }: { children: ReactNode }) {
  return <tr className={estilos.filaAtenuada}>{children}</tr>;
}

/** Fila de encabezado de grupo (por ejemplo, un informe con varias paginas). */
export function FilaGrupo({ children, colSpan }: { children: ReactNode; colSpan: number }) {
  return (
    <tr className={estilos.filaGrupo}>
      <td colSpan={colSpan}>{children}</td>
    </tr>
  );
}

export function FilaVacia({ children, colSpan }: { children: ReactNode; colSpan: number }) {
  return (
    <tr>
      <td className={estilos.vacia} colSpan={colSpan}>
        {children}
      </td>
    </tr>
  );
}

export const estilosTabla = estilos;
