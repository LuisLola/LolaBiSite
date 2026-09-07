import estilos from './AreaAvatar.module.css';
import { cx } from './cx';

export interface AreaAvatarProps {
  iniciales: string;
  color: string;
  colorTexto: string;
  tamano?: 'pequeno' | 'mediano' | 'grande';
  huerfano?: boolean;
  titulo?: string;
}

const CLASE_TAMANO = {
  pequeno: estilos.pequeno,
  mediano: estilos.mediano,
  grande: estilos.grande,
} as const;

/** Cuadrado de color con las dos iniciales del area. */
export function AreaAvatar({ iniciales, color, colorTexto, tamano = 'mediano', huerfano, titulo }: AreaAvatarProps) {
  return (
    <span
      className={cx(estilos.avatar, CLASE_TAMANO[tamano], huerfano && estilos.huerfano)}
      style={{ background: color, color: colorTexto }}
      title={titulo}
      aria-hidden={titulo ? undefined : true}
    >
      {iniciales}
    </span>
  );
}
