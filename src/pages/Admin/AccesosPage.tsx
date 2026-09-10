import { AlertTriangle, Eye, RotateCcw } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AjustesDepartamento } from '../../data/DepartamentoRepository';
import { useAjustesDepartamento } from '../../data/estadoDepartamentos';
import { useIdentidad } from '../../data/ServiciosProvider';
import type { MiembroGrupo } from '../../domain/acceso';
import { avisosDeDepartamento } from '../../domain/calidad';
import type { Departamento } from '../../domain/types';
import { useDepartamentos } from '../../hooks/usePaneles';
import { AreaAvatar } from '../../ui/AreaAvatar';
import { Badge } from '../../ui/Badge';
import { BotonEnlace, Button } from '../../ui/Button';
import { useTema } from '../../tema/TemaProvider';
import { Campo, Input, Select } from '../../ui/Campos';
import { Card } from '../../ui/Card';
import { SelectorEquipo, SelectorPersona } from '../../ui/Selectores';
import { cx } from '../../ui/cx';
import estilos from './AccesosPage.module.css';

/** GUID de área de trabajo de Power BI. Cualquier otra cosa no abre. */
const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Quién ve qué. Una pregunta por departamento y su consecuencia debajo.
 *
 * Todo lo demás —el identificador del área de trabajo, el responsable— vive
 * plegado: es cierto, hace falta, y no es lo que se viene a mirar aquí.
 */
export function AccesosPage() {
  const { departamentos, cargando } = useDepartamentos();
  const { ajustes, guardar, restablecer, admiteRestablecer } = useAjustesDepartamento();
  const identidad = useIdentidad();

  const porNombre = useMemo(() => new Map(ajustes.map((a) => [a.nombre, a])), [ajustes]);

  const conProblemas = useMemo(
    () => departamentos.filter((departamento) => avisosDeDepartamento(departamento).length > 0),
    [departamentos],
  );

  // Fase 1: identidad simulada. Se detecta por lo único que la distingue.
  const esSimulada = (identidad.usuariosDePrueba?.() ?? []).length > 0;

  if (cargando) {
    return (
      <div className={estilos.pagina}>
        <p className={estilos.subtitulo}>Cargando departamentos…</p>
      </div>
    );
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <div>
          <h1 className={estilos.titulo}>Quién ve qué</h1>
          <p className={estilos.subtitulo}>
            Una sola regla: si estás en el equipo de Teams, ves sus informes; si no, no aparecen.
            Power BI sigue aplicando sus propios permisos sobre los datos.
          </p>
        </div>
        <div className={estilos.acciones}>
          <BotonEnlace a="/admin" variante="secundario">
            Volver a los informes
          </BotonEnlace>
          {admiteRestablecer ? (
            <Button variante="fantasma" onClick={() => void restablecer()}>
              <RotateCcw size={16} strokeWidth={1.75} />
              Restablecer
            </Button>
          ) : null}
        </div>
      </header>

      {conProblemas.length > 0 ? (
        <p className={estilos.franjaAviso}>
          <AlertTriangle className={estilos.franjaAvisoIcono} size={20} strokeWidth={1.75} aria-hidden="true" />
          <span className={estilos.franjaAvisoTexto}>
            <strong>
              {conProblemas.length === 1
                ? '1 departamento necesita tu atención'
                : `${conProblemas.length} departamentos necesitan tu atención`}
              :
            </strong>{' '}
            {conProblemas.map((d) => d.nombre).join(', ')}.
          </span>
        </p>
      ) : null}

      {esSimulada ? (
        <p className={estilos.nota}>
          Estás en local, con equipos y personas de ejemplo. Dentro de la intranet los equipos y el
          directorio los trae Microsoft 365 y son los de verdad.
        </p>
      ) : null}

      <div className={estilos.rejilla}>
        {departamentos.map((departamento) => (
          <TarjetaArea
            key={departamento.id}
            departamento={departamento}
            ajustes={porNombre.get(departamento.nombre)}
            guardar={guardar}
          />
        ))}
      </div>

      <TemaDelPortal />
    </div>
  );
}

/**
 * El tema del portal. Es un dato compartido, no una preferencia del navegador:
 * lo que se elige aqui lo ve todo el mundo.
 */
function TemaDelPortal() {
  const { temas, activo, puedeCambiar, guardando, cambiar } = useTema();
  const [mensaje, setMensaje] = useState('');

  if (!puedeCambiar) return null;

  return (
    <Card className={estilos.tema}>
      <div>
        <h2 className={estilos.temaTitulo}>Colores del portal</h2>
        <p className={estilos.subtitulo}>
          Salen de la lista <strong>Marca LC</strong>: una fila por tema y una columna por color.
          Cada tema rellena solo lo que cambia y hereda de <strong>Base</strong>. Lo que elijas aquí
          lo ve todo el mundo.
        </p>
      </div>
      <div className={estilos.temaControles}>
        <Campo etiqueta="Tema activo">
          {(id) => (
            <Select
              id={id}
              value={activo}
              disabled={guardando}
              onChange={(evento) => {
                const elegido = evento.target.value;
                void cambiar(elegido).then(
                  () => setMensaje(`Tema «${elegido}» aplicado para todos.`),
                  (error: unknown) => {
                    console.error('[Portal BI] No se ha podido guardar el tema', error);
                    setMensaje('No se ha podido guardar: ¿tienes permiso de escritura en Marca LC?');
                  },
                );
              }}
            >
              {temas.map((tema) => (
                <option key={tema} value={tema}>
                  {tema}
                </option>
              ))}
            </Select>
          )}
        </Campo>
        {temas.length === 1 ? (
          <p className={estilos.nota}>
            Solo hay un tema. Para añadir otro, crea una fila en <strong>Marca LC</strong> con su
            nombre y rellena solo las celdas que cambien; el resto lo hereda de{' '}
            <strong>Base</strong>.
          </p>
        ) : null}
        {mensaje ? <p className={estilos.nota}>{mensaje}</p> : null}
      </div>
    </Card>
  );
}

interface TarjetaAreaProps {
  departamento: Departamento;
  ajustes: AjustesDepartamento | undefined;
  guardar: (ajustes: AjustesDepartamento) => Promise<void>;
}

function TarjetaArea({ departamento, ajustes, guardar }: TarjetaAreaProps) {
  const identidad = useIdentidad();
  const [miembros, setMiembros] = useState<MiembroGrupo[] | null>(null);
  const [verLista, setVerLista] = useState(false);
  const grupo = departamento.grupo;
  const grupoId = grupo?.id ?? '';

  /*
   * "Enlazado solo por el nombre": tiene equipo escrito pero sin objectId. El
   * portal lo empareja comparando texto, asi que un renombrado en Teams deja
   * el departamento fuera sin avisar. Se arregla volviendo a elegirlo.
   */
  const soloPorNombre = Boolean(grupo && !grupoId);
  const abierto = !grupo;

  useEffect(() => {
    let vivo = true;
    if (!grupoId) {
      setMiembros(null);
      return;
    }
    void identidad.getMiembros(grupoId).then((lista) => {
      if (vivo) setMiembros(lista);
    });
    return () => {
      vivo = false;
    };
  }, [identidad, grupoId]);

  const guardarCampo = useCallback(
    (cambios: Partial<AjustesDepartamento>) => {
      void guardar({ ...ajustes, nombre: departamento.nombre, ...cambios });
    },
    [guardar, ajustes, departamento.nombre],
  );

  const abrirATodos = () => {
    // Pasar de un equipo a toda la empresa amplia el acceso a gente que hoy no
    // lo tiene: no es un cambio que se deba poder hacer de un clic distraido.
    const seguro = window.confirm(
      `A partir de ahora los informes de ${departamento.nombre} los verá TODA la empresa, no solo ${grupo?.nombre}. ¿Seguro?`,
    );
    if (seguro) guardarCampo({ grupo: undefined });
  };

  const workspaceId = departamento.workspaceId ?? '';
  const workspaceInvalido = workspaceId.length > 0 && !GUID.test(workspaceId);

  return (
    <Card className={estilos.tarjeta}>
      <div className={estilos.encabezado}>
        <AreaAvatar
          iniciales={departamento.iniciales}
          color={departamento.color}
          colorTexto={departamento.colorTexto}
          huerfano={departamento.huerfano}
        />
        <div className={estilos.encabezadoTextos}>
          <div className={estilos.nombre}>{departamento.nombre}</div>
          <div className={estilos.conteo}>
            {departamento.totalInformes} {departamento.totalInformes === 1 ? 'informe' : 'informes'} ·{' '}
            {departamento.totalPaneles} {departamento.totalPaneles === 1 ? 'pantalla' : 'pantallas'}
          </div>
        </div>
        {abierto ? (
          <Badge tono="aviso">Lo ve toda la empresa</Badge>
        ) : soloPorNombre ? (
          <Badge tono="pruebas">Enlace frágil</Badge>
        ) : (
          <Badge tono="activo">Bien configurado</Badge>
        )}
      </div>

      {soloPorNombre ? (
        <p className={estilos.avisoLinea}>
          <AlertTriangle className={estilos.avisoIcono} size={17} strokeWidth={1.75} aria-hidden="true" />
          Este equipo está guardado solo por su nombre. Si alguien lo renombra en Teams, estos
          informes desaparecen del portal. Vuelve a elegirlo abajo y queda atado de verdad.
        </p>
      ) : null}

      {/* La pregunta. Es lo único que hay que entender de esta pantalla. */}
      <fieldset className={estilos.pregunta}>
        <legend className={estilos.preguntaTitulo}>¿Quién puede ver estos informes?</legend>

        <div className={estilos.opciones}>
          <label className={cx(estilos.opcion, abierto && estilos.opcionElegida)}>
            <input
              type="radio"
              name={`acceso-${departamento.id}`}
              checked={abierto}
              onChange={abrirATodos}
            />
            <span>
              <span className={estilos.opcionTitulo}>Toda la empresa</span>
              <span className={estilos.opcionTexto}>Cualquiera que entre en la intranet.</span>
            </span>
          </label>

          <label className={cx(estilos.opcion, !abierto && estilos.opcionElegida)}>
            <input
              type="radio"
              name={`acceso-${departamento.id}`}
              checked={!abierto}
              // Elegir esta opción no guarda nada por sí sola: hasta que no hay
              // un equipo elegido no hay nada que guardar. El desplegable de
              // abajo es el que manda.
              onChange={() => undefined}
            />
            <span>
              <span className={estilos.opcionTitulo}>Solo un equipo de Teams</span>
              <span className={estilos.opcionTexto}>Quien esté en el equipo los ve; el resto, no.</span>
            </span>
          </label>
        </div>

        <div className={estilos.equipo}>
          <span className={estilos.etiquetaEquipo}>Equipo de Teams</span>
          <SelectorEquipo
            grupo={grupo}
            alCambiar={(elegido) => guardarCampo({ grupo: elegido })}
            marcador="Elige el equipo que lo verá"
          />
        </div>
      </fieldset>

      {/* La consecuencia, en personas. */}
      <div className={estilos.consecuencia}>
        <span className={estilos.consecuenciaEtiqueta}>Lo ven ahora mismo</span>
        {abierto ? (
          <span className={estilos.consecuenciaTexto}>
            Toda la empresa, porque no hay equipo elegido.
          </span>
        ) : soloPorNombre ? (
          <span className={estilos.consecuenciaTexto}>
            No podemos contarlas hasta que el equipo esté bien enlazado.
          </span>
        ) : miembros === null ? (
          <span className={estilos.consecuenciaTexto}>Contando…</span>
        ) : (
          <>
            <span className={estilos.caras}>
              {miembros.slice(0, 3).map((miembro) => (
                <span key={miembro.id} className={estilos.cara} title={miembro.nombre}>
                  {iniciales(miembro.nombre)}
                </span>
              ))}
              {miembros.length > 3 ? (
                <span className={cx(estilos.cara, estilos.caraResto)}>+{miembros.length - 3}</span>
              ) : null}
            </span>
            <strong className={estilos.consecuenciaCifra}>
              {miembros.length} {miembros.length === 1 ? 'persona' : 'personas'}
            </strong>
            <Button variante="fantasma" pequeno onClick={() => setVerLista((previo) => !previo)}>
              <Eye size={16} strokeWidth={1.75} />
              {verLista ? 'Ocultar la lista' : 'Ver la lista'}
            </Button>
          </>
        )}
      </div>

      {verLista && miembros && miembros.length > 0 ? (
        <ul className={estilos.miembros}>
          {miembros.map((miembro) => (
            <li key={miembro.id} className={estilos.miembro}>
              {miembro.nombre}
              <span className={estilos.miembroCorreo}>{miembro.correo}</span>
              {miembro.rol === 'propietario' ? <Badge>Propietario</Badge> : null}
            </li>
          ))}
        </ul>
      ) : null}

      {/* Cierto, necesario, y no es lo que se viene a mirar aquí. */}
      <details className={estilos.detalles}>
        <summary className={estilos.detallesTitulo}>Más ajustes de este departamento</summary>
        <div className={estilos.detallesCuerpo}>
          {/*
            La hora vive aqui, una vez por departamento, y no en cada una de
            sus pantallas: es la misma para todas y repetirla nueve veces solo
            daba nueve sitios donde equivocarse.
          */}
          <Campo
            etiqueta="Hora de actualización"
            ayuda="Es el «Datos hasta las…» que se lee en la portada. Se declara a mano: Power BI no nos la dice."
          >
            {(id) => (
              <Input
                id={id}
                type="time"
                defaultValue={departamento.horaActualizacion ?? ''}
                onBlur={(evento) => {
                  const valor = evento.target.value;
                  if (valor !== (departamento.horaActualizacion ?? '')) {
                    guardarCampo({ horaActualizacion: valor });
                  }
                }}
              />
            )}
          </Campo>

          <Campo
            etiqueta="Área de trabajo de Power BI"
            ayuda={
              workspaceInvalido
                ? undefined
                : 'El identificador que sale tras /groups/ al abrir el área en Power BI. Solo afecta al botón «Abrir en Power BI».'
            }
            error={workspaceInvalido ? 'Eso no es un identificador de área: son 36 caracteres con guiones.' : undefined}
          >
            {(id) => (
              <Input
                id={id}
                defaultValue={workspaceId}
                error={workspaceInvalido}
                placeholder="00000000-0000-0000-0000-000000000000"
                onBlur={(evento) => {
                  const valor = evento.target.value.trim();
                  if (valor !== workspaceId) guardarCampo({ workspaceId: valor });
                }}
              />
            )}
          </Campo>

          <Campo etiqueta="Responsable del área" ayuda="A quién preguntar por estos informes.">
            {(id) => (
              <SelectorPersona
                id={id}
                valor={departamento.responsable ?? ''}
                alCambiar={(valor) => guardarCampo({ responsable: valor })}
              />
            )}
          </Campo>
        </div>
      </details>
    </Card>
  );
}

/** Dos iniciales, para los círculos de quién lo ve. */
function iniciales(nombre: string): string {
  const palabras = nombre.trim().split(/\s+/).filter(Boolean);
  if (palabras.length === 0) return '?';
  const primera = palabras[0]![0] ?? '';
  const ultima = palabras.length > 1 ? (palabras[palabras.length - 1]![0] ?? '') : '';
  return (primera + ultima).toUpperCase();
}
