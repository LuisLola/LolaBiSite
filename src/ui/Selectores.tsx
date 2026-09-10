import { useCallback, useRef } from 'react';
import { useIdentidad } from '../data/ServiciosProvider';
import type { GrupoM365 } from '../domain/acceso';
import { Buscable, type OpcionBuscable } from './Buscable';

/*
 * Nombres ya vistos, por correo. Se llena con cada busqueda y sirve para
 * pintar "María González" donde esta guardado "maria.gonzalez@…", sin una
 * llamada por fila.
 */
const NOMBRES_POR_CORREO = new Map<string, string>();

export interface SelectorPersonaProps {
  id?: string;
  /** Lo guardado: normalmente un correo. Puede ser texto antiguo. */
  valor: string;
  alCambiar: (valor: string) => void;
  marcador?: string;
}

/**
 * Elegir una persona del directorio de la empresa.
 *
 * Se guarda el CORREO, no el nombre. Un valor antiguo que no sea un correo
 * (por ejemplo «Dirección de Operaciones») se sigue enseñando tal cual: no se
 * borra nada de lo que ya hay, solo se pide una persona de verdad la proxima
 * vez que alguien lo toque.
 */
export function SelectorPersona({ id, valor, alCambiar, marcador = 'Sin asignar' }: SelectorPersonaProps) {
  const identidad = useIdentidad();

  const buscar = useCallback(
    async (consulta: string): Promise<OpcionBuscable[]> => {
      const personas = await identidad.buscarPersonas(consulta);
      return personas.map((persona) => {
        const clave = persona.correo ?? persona.nombre;
        NOMBRES_POR_CORREO.set(clave, persona.nombre);
        const opcion: OpcionBuscable = { clave, titulo: persona.nombre };
        if (persona.correo) opcion.subtitulo = persona.correo;
        return opcion;
      });
    },
    [identidad],
  );

  return (
    <Buscable
      id={id}
      valor={valor ? (NOMBRES_POR_CORREO.get(valor) ?? valor) : ''}
      marcador={marcador}
      claveElegida={valor}
      buscar={buscar}
      alElegir={(opcion) => alCambiar(opcion.clave)}
      alQuitar={() => alCambiar('')}
      marcadorBusqueda="Nombre o correo…"
      vacio="Nadie coincide. En local solo sale tu usuario; el directorio de la empresa lo trae Microsoft 365 dentro de la intranet."
    />
  );
}

export interface SelectorEquipoProps {
  id?: string;
  grupo: GrupoM365 | undefined;
  alCambiar: (grupo: GrupoM365 | undefined) => void;
  marcador?: string;
}

/**
 * Elegir un equipo de Teams de la lista real del tenant.
 *
 * Nunca texto libre: el equipo se guarda con su objectId, que es lo unico que
 * no cambia si alguien lo renombra. Antes se escribia el nombre a mano y un
 * renombrado en Teams dejaba el departamento entero fuera del portal.
 */
export function SelectorEquipo({ id, grupo, alCambiar, marcador = 'Elige un equipo' }: SelectorEquipoProps) {
  const identidad = useIdentidad();
  // Lo ultimo que devolvio la busqueda, para recuperar el grupo entero al
  // elegir: el Buscable solo devuelve la clave.
  const ultimos = useRef<GrupoM365[]>([]);

  const buscar = useCallback(
    async (consulta: string): Promise<OpcionBuscable[]> => {
      const grupos = await identidad.buscarGrupos(consulta);
      ultimos.current = grupos;
      return grupos.map((encontrado) => {
        const opcion: OpcionBuscable = { clave: encontrado.id || encontrado.nombre, titulo: encontrado.nombre };
        if (encontrado.correo) opcion.subtitulo = encontrado.correo;
        return opcion;
      });
    },
    [identidad],
  );

  return (
    <Buscable
      id={id}
      valor={grupo?.nombre ?? ''}
      marcador={marcador}
      claveElegida={grupo?.id ?? grupo?.nombre}
      buscar={buscar}
      alElegir={(opcion) => {
        const elegido = ultimos.current.find((candidato) => (candidato.id || candidato.nombre) === opcion.clave);
        if (elegido) alCambiar(elegido);
      }}
      marcadorBusqueda="Nombre del equipo…"
      vacio="Ningún equipo coincide."
    />
  );
}

export interface SelectorEquipoNombreProps {
  id?: string;
  valor: string;
  alCambiar: (nombre: string) => void;
  marcador?: string;
}

/**
 * Igual que SelectorEquipo pero guardando solo el NOMBRE del equipo.
 *
 * Es para el override por informe, que es un campo suelto de texto en la
 * lista y no tiene sitio donde guardar el objectId. Sigue siendo mejor que
 * escribirlo a mano: el nombre sale de la lista real, no de la memoria de
 * quien rellena. El enlace fuerte, con objectId, es el del departamento.
 */
export function SelectorEquipoNombre({
  id,
  valor,
  alCambiar,
  marcador = 'El del departamento',
}: SelectorEquipoNombreProps) {
  const identidad = useIdentidad();

  const buscar = useCallback(
    async (consulta: string): Promise<OpcionBuscable[]> => {
      const grupos = await identidad.buscarGrupos(consulta);
      return grupos.map((encontrado) => {
        const opcion: OpcionBuscable = { clave: encontrado.nombre, titulo: encontrado.nombre };
        if (encontrado.correo) opcion.subtitulo = encontrado.correo;
        return opcion;
      });
    },
    [identidad],
  );

  return (
    <Buscable
      id={id}
      valor={valor}
      marcador={marcador}
      claveElegida={valor}
      buscar={buscar}
      alElegir={(opcion) => alCambiar(opcion.clave)}
      alQuitar={() => alCambiar('')}
      marcadorBusqueda="Nombre del equipo…"
      vacio="Ningún equipo coincide."
    />
  );
}
