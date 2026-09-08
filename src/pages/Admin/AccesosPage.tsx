import { RotateCcw, Users } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { AjustesDepartamento } from '../../data/DepartamentoRepository';
import { useAjustesDepartamento } from '../../data/estadoDepartamentos';
import { useIdentidad } from '../../data/ServiciosProvider';
import type { GrupoM365, MiembroGrupo } from '../../domain/acceso';
import { avisosDeDepartamento } from '../../domain/calidad';
import type { Departamento } from '../../domain/types';
import { useDepartamentos } from '../../hooks/usePaneles';
import { AreaAvatar } from '../../ui/AreaAvatar';
import { Badge } from '../../ui/Badge';
import { BotonEnlace, Button } from '../../ui/Button';
import { useTema } from '../../tema/TemaProvider';
import { Campo, Input, Select } from '../../ui/Campos';
import { Card } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import estilos from './AccesosPage.module.css';

const GRAVEDAD_A_TONO = { alta: 'aviso', media: 'solicitar', baja: 'neutro' } as const;

/**
 * Un departamento = un área de trabajo de Power BI = un equipo de Teams.
 * Aquí se atan los tres y se ve quién está dentro de cada equipo.
 */
export function AccesosPage() {
  const { departamentos, cargando } = useDepartamentos();
  const { ajustes, guardar, restablecer, admiteRestablecer } = useAjustesDepartamento();
  const identidad = useIdentidad();
  const [equipos, setEquipos] = useState<GrupoM365[]>([]);

  useEffect(() => {
    let vivo = true;
    void identidad.buscarGrupos('').then((encontrados) => {
      if (vivo) setEquipos(encontrados);
    });
    return () => {
      vivo = false;
    };
  }, [identidad]);

  const porNombre = useMemo(() => new Map(ajustes.map((a) => [a.nombre, a])), [ajustes]);

  if (cargando) {
    return (
      <div className={estilos.pagina}>
        <p className={estilos.subtitulo}>Cargando áreas…</p>
      </div>
    );
  }

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <div>
          <h1 className={estilos.titulo}>Áreas, equipos y accesos</h1>
          <p className={estilos.subtitulo}>
            Cada departamento es un área de trabajo de Power BI y se gobierna con un equipo de
            Teams. Quien está en el equipo ve el área en el portal; quien no, no la ve en absoluto.
            El permiso sobre los datos lo sigue aplicando Power BI.
          </p>
        </div>
        <div className={estilos.acciones}>
          <BotonEnlace a="/admin" variante="secundario">
            Volver a paneles
          </BotonEnlace>
          {admiteRestablecer ? (
            <Button variante="fantasma" onClick={() => void restablecer()}>
              <RotateCcw size={14} strokeWidth={1.75} />
              Restablecer
            </Button>
          ) : null}
        </div>
      </header>

      <p className={estilos.nota}>
        Identidad: <strong>{identidad.nombre}</strong>. Mientras sea la simulada, los equipos y sus
        miembros son de mentira y sirven solo para ver cómo queda. En la intranet los trae Microsoft
        365 y el <em>objectId</em> del equipo es lo que manda.
      </p>

      <TemaDelPortal />

      <div className={estilos.rejilla}>
        {departamentos.map((departamento) => (
          <TarjetaArea
            key={departamento.id}
            departamento={departamento}
            ajustes={porNombre.get(departamento.nombre)}
            equipos={equipos}
            guardar={guardar}
          />
        ))}
      </div>
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
        <SectionLabel>Tema del portal</SectionLabel>
        <p className={estilos.subtitulo}>
          Los colores salen de la lista <strong>Marca LC</strong>: una fila por tema y una columna
          por color. Cada tema rellena solo lo que cambia y hereda de <strong>Base</strong>. Lo que
          elijas aquí lo ve todo el mundo.
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
  equipos: readonly GrupoM365[];
  guardar: (ajustes: AjustesDepartamento) => Promise<void>;
}

function TarjetaArea({ departamento, ajustes, equipos, guardar }: TarjetaAreaProps) {
  const identidad = useIdentidad();
  const [miembros, setMiembros] = useState<MiembroGrupo[] | null>(null);
  const grupo = departamento.grupo;
  const grupoId = grupo?.id ?? '';

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

  const asignarEquipo = (equipo: GrupoM365) => guardarCampo({ grupo: equipo });

  const avisos = avisosDeDepartamento(departamento);
  const sinAsignar = equipos.filter(
    (equipo) =>
      equipo.id !== grupoId && equipo.nombre.toLowerCase() !== (grupo?.nombre ?? '').toLowerCase(),
  );

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
            {departamento.totalPaneles} paneles · {departamento.totalInformes} informes
          </div>
        </div>
        {!grupo ? (
          <Badge tono="aviso">Sin equipo</Badge>
        ) : grupo.id ? (
          <Badge tono="activo">Por objectId</Badge>
        ) : (
          <Badge tono="solicitar">Por nombre</Badge>
        )}
      </div>

      <div className={estilos.campos}>
        <div className={estilos.equipo}>
          <span className={estilos.equipoCampo}>
            <Campo
              etiqueta="Equipo de Teams"
              ayuda={
                grupo?.id
                  ? `objectId ${grupo.id}`
                  : 'Sin objectId: se empareja por el nombre, que es frágil.'
              }
            >
              {(id) => (
                <Input
                  id={id}
                  defaultValue={grupo?.nombre ?? ''}
                  placeholder="BI-RetailOnline"
                  onBlur={(evento) => {
                    const nombre = evento.target.value.trim();
                    if (nombre === (grupo?.nombre ?? '')) return;
                    const conocido = equipos.find(
                      (candidato) => candidato.nombre.toLowerCase() === nombre.toLowerCase(),
                    );
                    guardarCampo({
                      grupo: conocido ?? { id: grupo?.id ?? '', nombre, esEquipoTeams: true },
                    });
                  }}
                />
              )}
            </Campo>
          </span>
        </div>

        {sinAsignar.length > 0 ? (
          <div className={estilos.sugerencias}>
            {sinAsignar.map((equipo) => (
              <button
                key={equipo.id}
                type="button"
                className={estilos.sugerencia}
                onClick={() => asignarEquipo(equipo)}
                title={equipo.correo}
              >
                {equipo.nombre}
              </button>
            ))}
          </div>
        ) : null}

        <Campo
          etiqueta="Área de trabajo de Power BI"
          ayuda="El GUID que sale tras /groups/ al abrir el área en Power BI."
        >
          {(id) => (
            <Input
              id={id}
              url
              defaultValue={departamento.workspaceId ?? ''}
              placeholder="00000000-0000-0000-0000-000000000000"
              onBlur={(evento) => {
                const valor = evento.target.value.trim();
                if (valor !== (departamento.workspaceId ?? '')) guardarCampo({ workspaceId: valor });
              }}
            />
          )}
        </Campo>

        <Campo etiqueta="Responsable del área">
          {(id) => (
            <Input
              id={id}
              defaultValue={departamento.responsable ?? ''}
              placeholder="Dirección de Operaciones"
              onBlur={(evento) => {
                const valor = evento.target.value.trim();
                if (valor !== (departamento.responsable ?? '')) guardarCampo({ responsable: valor });
              }}
            />
          )}
        </Campo>
      </div>

      <div className={estilos.miembros}>
        <div className={estilos.miembrosTitulo}>
          <SectionLabel>Quién ve este área</SectionLabel>
          <Badge>
            <Users size={11} strokeWidth={1.75} />
            {miembros ? miembros.length : 0}
          </Badge>
        </div>
        {!grupo ? (
          <p className={estilos.miembroCorreo}>
            Sin equipo asignado: hoy este área la ve todo el mundo.
          </p>
        ) : !grupoId ? (
          <p className={estilos.miembroCorreo}>
            Para listar los miembros hace falta el objectId del equipo. Elige uno de los de arriba.
          </p>
        ) : miembros === null ? (
          <p className={estilos.miembroCorreo}>Cargando miembros…</p>
        ) : miembros.length === 0 ? (
          <p className={estilos.miembroCorreo}>El equipo no tiene miembros.</p>
        ) : (
          <ul>
            {miembros.map((miembro) => (
              <li key={miembro.id} className={estilos.miembro}>
                {miembro.nombre}
                <span className={estilos.miembroCorreo}>{miembro.correo}</span>
                <span className={estilos.miembroRol}>
                  <Badge tono={miembro.rol === 'propietario' ? 'destacado' : 'neutro'}>
                    {miembro.rol}
                  </Badge>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {avisos.length > 0 ? (
        <div className={estilos.avisosArea}>
          {avisos.map((aviso) => (
            <span key={aviso.tipo} className={estilos.avisoArea}>
              <Badge tono={GRAVEDAD_A_TONO[aviso.gravedad]}>{aviso.gravedad}</Badge>
              {aviso.mensaje}
            </span>
          ))}
        </div>
      ) : null}
    </Card>
  );
}
