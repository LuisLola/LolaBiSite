import { useMemo, useState } from 'react';
import { DEPARTAMENTOS_CONFIG } from '../../config/departamentos.config';
import { esUrlEmbed, parsearUrlPanel } from '../../domain/panelUrls';
import { ESTADOS, type EstadoPanel, type Panel, type PanelInput } from '../../domain/types';
import { Button } from '../../ui/Button';
import { Campo, Casilla, Input, Select, Textarea } from '../../ui/Campos';
import { SelectorEquipoNombre, SelectorPersona } from '../../ui/Selectores';
import { Modal } from '../../ui/Modal';
import estilos from './PanelFormModal.module.css';

export interface PanelFormModalProps {
  panel?: Panel;
  departamentos: readonly string[];
  /** Preselección al crear. Vacío obliga a elegir. */
  departamentoPorDefecto?: string;
  guardando: boolean;
  alGuardar: (entrada: PanelInput) => void;
  alCerrar: () => void;
}

type Borrador = {
  nombre: string;
  areaTrabajo: string;
  urlPanel: string;
  urlDirecta: string;
  departamento: string;
  pregunta: string;
  descripcion: string;
  responsable: string;
  grupoAcceso: string;
  horaActualizacion: string;
  orden: string;
  estado: EstadoPanel;
  destacado: boolean;
};

function borradorDe(panel: Panel | undefined, departamentoPorDefecto: string): Borrador {
  return {
    nombre: panel?.nombre ?? '',
    areaTrabajo: panel?.areaTrabajo ?? '',
    urlPanel: panel?.urlPanel ?? '',
    urlDirecta: panel?.urlDirecta ?? '',
    departamento: panel?.departamento ?? departamentoPorDefecto,
    pregunta: panel?.pregunta ?? '',
    descripcion: panel?.descripcion ?? '',
    responsable: panel?.responsable ?? '',
    grupoAcceso: panel?.grupoAcceso ?? '',
    horaActualizacion: panel?.horaActualizacion ?? '',
    orden: panel ? String(panel.orden) : '',
    estado: panel?.estado ?? 'Activo',
    destacado: panel?.destacado ?? false,
  };
}

type Errores = Partial<Record<keyof Borrador, string>>;

function validar(borrador: Borrador): Errores {
  const errores: Errores = {};
  if (!borrador.nombre.trim()) errores.nombre = 'El nombre es obligatorio.';
  if (!borrador.departamento.trim()) errores.departamento = 'El departamento es obligatorio.';

  if (borrador.urlPanel.trim() && !parsearUrlPanel(borrador.urlPanel)) {
    errores.urlPanel = 'No se reconoce ningún reportId en esa URL.';
  }
  if (borrador.urlDirecta.trim() && esUrlEmbed(borrador.urlDirecta)) {
    errores.urlDirecta = 'Es una URL de incrustación: no sirve como enlace de apertura.';
  }
  if (borrador.orden.trim() && !Number.isFinite(Number(borrador.orden))) {
    errores.orden = 'El orden tiene que ser un número.';
  }
  return errores;
}

export function PanelFormModal({
  panel,
  departamentos,
  departamentoPorDefecto,
  guardando,
  alGuardar,
  alCerrar,
}: PanelFormModalProps) {
  const opcionesDepartamento = useMemo(() => {
    const todos = new Set([...departamentos, ...Object.keys(DEPARTAMENTOS_CONFIG)]);
    return [...todos].filter(Boolean).sort((a, b) => a.localeCompare(b, 'es'));
  }, [departamentos]);

  const [borrador, setBorrador] = useState<Borrador>(() =>
    borradorDe(panel, departamentoPorDefecto ?? ''),
  );
  const [tocado, setTocado] = useState(false);

  const errores = validar(borrador);
  const hayErrores = Object.keys(errores).length > 0;
  const derivado = parsearUrlPanel(borrador.urlPanel);

  const cambiar = <C extends keyof Borrador>(campo: C, valor: Borrador[C]) =>
    setBorrador((previo) => ({ ...previo, [campo]: valor }));

  const enviar = () => {
    setTocado(true);
    if (hayErrores) return;
    alGuardar({
      nombre: borrador.nombre.trim(),
      areaTrabajo: borrador.areaTrabajo.trim(),
      urlPanel: borrador.urlPanel.trim(),
      urlDirecta: borrador.urlDirecta.trim(),
      departamento: borrador.departamento.trim(),
      pregunta: borrador.pregunta.trim(),
      descripcion: borrador.descripcion.trim(),
      responsable: borrador.responsable.trim(),
      grupoAcceso: borrador.grupoAcceso.trim(),
      horaActualizacion: borrador.horaActualizacion.trim(),
      orden: borrador.orden.trim() ? Number(borrador.orden) : 0,
      estado: borrador.estado,
      destacado: borrador.destacado,
    });
  };

  const error = (campo: keyof Borrador) => (tocado ? errores[campo] : undefined);

  return (
    <Modal
      titulo={panel ? 'Editar la pantalla' : 'Añadir una pantalla'}
      subtitulo={
        panel
          ? `${panel.departamento} · ${panel.reportId || 'sin informe'}`
          : 'Se añade a la lista sin tocar código.'
      }
      alCerrar={alCerrar}
      pie={
        <>
          <span className={estilos.avisoPie}>
            El enlace de apertura se deriva del informe y del área de trabajo; la URL de
            incrustación solo se usa dentro del visor.
          </span>
          <Button variante="fantasma" onClick={alCerrar}>
            Cancelar
          </Button>
          <Button variante="primario" onClick={enviar} disabled={guardando || (tocado && hayErrores)}>
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </>
      }
    >
      <div className={estilos.formulario}>
        <div className={estilos.anchoCompleto}>
          <Campo etiqueta="Nombre" error={error('nombre')}>
            {(id) => (
              <Input
                id={id}
                value={borrador.nombre}
                error={Boolean(error('nombre'))}
                onChange={(evento) => cambiar('nombre', evento.target.value)}
                placeholder="LC - Desempeño de ventas"
              />
            )}
          </Campo>
        </div>

        <Campo etiqueta="Departamento" error={error('departamento')}>
          {(id) => (
            <Select
              id={id}
              value={borrador.departamento}
              error={Boolean(error('departamento'))}
              onChange={(evento) => cambiar('departamento', evento.target.value)}
            >
              <option value="">— Elige un departamento —</option>
              {opcionesDepartamento.map((departamento) => (
                <option key={departamento} value={departamento}>
                  {departamento}
                </option>
              ))}
            </Select>
          )}
        </Campo>

        <Campo
          etiqueta="Equipo que lo ve"
          ayuda="Vacío = el del departamento. Solo para restringir esta pantalla a menos gente."
        >
          {(id) => (
            <SelectorEquipoNombre
              id={id}
              valor={borrador.grupoAcceso}
              alCambiar={(valor) => cambiar('grupoAcceso', valor)}
            />
          )}
        </Campo>

        <div className={estilos.anchoCompleto}>
          <Campo
            etiqueta="URL de incrustación (Url Panel)"
            error={error('urlPanel')}
            ayuda="La que copia Power BI en «Insertar en un sitio web». Solo se usa dentro del visor."
          >
            {(id) => (
              <Input
                id={id}
                url
                value={borrador.urlPanel}
                error={Boolean(error('urlPanel'))}
                onChange={(evento) => cambiar('urlPanel', evento.target.value)}
                placeholder="https://app.powerbi.com/reportEmbed?reportId=…&pageName=…"
              />
            )}
          </Campo>
        </div>

        <div className={estilos.derivado}>
          <span className={estilos.derivadoBloque}>
            <span className={estilos.derivadoEtiqueta}>reportId</span>
            <span className={estilos.derivadoValor}>{derivado?.reportId ?? '—'}</span>
          </span>
          <span className={estilos.derivadoBloque}>
            <span className={estilos.derivadoEtiqueta}>pageName</span>
            <span className={estilos.derivadoValor}>{derivado?.pageName || '—'}</span>
          </span>
          <span className={estilos.derivadoBloque}>
            <span className={estilos.derivadoEtiqueta}>ctid</span>
            <span className={estilos.derivadoValor}>{derivado?.ctid ?? '—'}</span>
          </span>
        </div>

        <div className={estilos.anchoCompleto}>
          <Campo
            etiqueta="URL de apertura (opcional)"
            error={error('urlDirecta')}
            ayuda="Déjala vacía y se deriva sola del informe y del área de trabajo."
          >
            {(id) => (
              <Input
                id={id}
                url
                value={borrador.urlDirecta}
                error={Boolean(error('urlDirecta'))}
                onChange={(evento) => cambiar('urlDirecta', evento.target.value)}
                placeholder="https://app.powerbi.com/groups/…/reports/…/…"
              />
            )}
          </Campo>
        </div>

        <div className={estilos.anchoCompleto}>
          <Campo
            etiqueta="La pregunta que responde"
            ayuda="Es el título que se ve en la portada. Vacía, sale el nombre de arriba."
          >
            {(id) => (
              <Input
                id={id}
                value={borrador.pregunta}
                onChange={(evento) => cambiar('pregunta', evento.target.value)}
                placeholder="¿Cómo van las ventas de tienda y online?"
              />
            )}
          </Campo>
        </div>

        <div className={estilos.anchoCompleto}>
          <Campo
            etiqueta="Qué se lee debajo de la pregunta"
            ayuda="Una línea. Es lo único que le dice a alguien qué va a ver antes de abrirlo."
          >
            {(id) => (
              <Textarea
                id={id}
                value={borrador.descripcion}
                onChange={(evento) => cambiar('descripcion', evento.target.value)}
                placeholder="Ventas del día, ranking de la temporada y comparación con la anterior."
              />
            )}
          </Campo>
        </div>

        <Campo etiqueta="Responsable" ayuda="A quién preguntar por este informe.">
          {(id) => (
            <SelectorPersona
              id={id}
              valor={borrador.responsable}
              alCambiar={(valor) => cambiar('responsable', valor)}
            />
          )}
        </Campo>

        <Campo
          etiqueta="Área de trabajo (texto del export)"
          ayuda="Viene sucio del export original y no lo usa nadie. El área que sí cuenta se pone en «Quién ve qué»."
        >
          {(id) => (
            <Input
              id={id}
              value={borrador.areaTrabajo}
              onChange={(evento) => cambiar('areaTrabajo', evento.target.value)}
            />
          )}
        </Campo>

        <Campo etiqueta="Hora de actualización" ayuda="La que se enseña como «Datos hasta las…».">
          {(id) => (
            <Input
              id={id}
              type="time"
              value={borrador.horaActualizacion}
              onChange={(evento) => cambiar('horaActualizacion', evento.target.value)}
            />
          )}
        </Campo>

        <Campo etiqueta="Orden" ayuda="Más bajo, más arriba en su departamento." error={error('orden')}>
          {(id) => (
            <Input
              id={id}
              type="number"
              step={10}
              min={0}
              value={borrador.orden}
              error={Boolean(error('orden'))}
              onChange={(evento) => cambiar('orden', evento.target.value)}
              placeholder="10"
            />
          )}
        </Campo>

        <div className={estilos.opciones}>
          <Campo etiqueta="Estado">
            {(id) => (
              <Select
                id={id}
                value={borrador.estado}
                onChange={(evento) => cambiar('estado', evento.target.value as EstadoPanel)}
              >
                {ESTADOS.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </Select>
            )}
          </Campo>
          <Casilla
            etiqueta="Destacado en la portada"
            checked={borrador.destacado}
            onChange={(evento) => cambiar('destacado', evento.target.checked)}
          />
        </div>
      </div>
    </Modal>
  );
}
