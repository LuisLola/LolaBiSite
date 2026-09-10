/*
 * El bloque que sustituye al contenido cuando la lista no ha cargado o cuando
 * no hay nada que ensenar.
 *
 * Se escribe pensando en quien no sabe que hay una lista de SharePoint detras:
 * dice que ha pasado, si es culpa suya, y a quien avisar. El detalle tecnico
 * existe, pero plegado, porque a quien le sirve sabe abrirlo.
 */
import { AlertTriangle, Inbox, RotateCcw } from 'lucide-react';
import { Button } from './Button';
import { Card } from './Card';
import estilos from './AvisoDeCarga.module.css';

export interface AvisoDeCargaProps {
  /** El fallo de lectura, si lo hubo. */
  error?: Error | null;
  /** Vuelve a leer la lista. Solo se ofrece cuando hay error. */
  reintentar?: () => void;
  /** A quién escribir cuando el usuario no puede resolverlo solo. */
  contacto: string;
  /** Qué se esperaba encontrar, para el estado vacío: "informes", "áreas"… */
  queFalta?: string;
}

export function AvisoDeError({ error, reintentar, contacto }: AvisoDeCargaProps) {
  return (
    <Card className={estilos.aviso} role="alert">
      <AlertTriangle className={estilos.icono} size={28} strokeWidth={1.75} aria-hidden="true" />
      <div className={estilos.textos}>
        <h2 className={estilos.titulo}>No hemos podido cargar los informes</h2>
        <p className={estilos.cuerpo}>
          No es cosa tuya ni de tus permisos: el portal no ha conseguido leer la lista. Vuelve a
          intentarlo y, si sigue igual, avisa a {contacto}.
        </p>
        {error ? (
          <details className={estilos.detalle}>
            <summary>Detalle técnico</summary>
            <p className={estilos.detalleTexto}>{error.message}</p>
          </details>
        ) : null}
      </div>
      {reintentar ? (
        <Button variante="primario" onClick={reintentar}>
          <RotateCcw size={16} strokeWidth={1.75} />
          Volver a intentarlo
        </Button>
      ) : null}
    </Card>
  );
}

export function AvisoDeVacio({ contacto, queFalta = 'informes' }: AvisoDeCargaProps) {
  return (
    <Card className={estilos.aviso}>
      <Inbox className={estilos.icono} size={28} strokeWidth={1.75} aria-hidden="true" />
      <div className={estilos.textos}>
        <h2 className={estilos.titulo}>Todavía no tienes ningún informe</h2>
        <p className={estilos.cuerpo}>
          Los {queFalta} se dan por equipo: aquí solo aparecen los de los equipos a los que
          perteneces. Si crees que deberías ver alguno, escribe a {contacto} y te damos acceso.
        </p>
      </div>
    </Card>
  );
}
