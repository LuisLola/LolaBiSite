import {
  ArrowDown,
  ArrowUp,
  Copy,
  Download,
  ExternalLink,
  Monitor,
  Pencil,
  Plus,
  RotateCcw,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import { useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useConfiguracion } from '../../app/configuracion';
import { useRepositorio } from '../../data/ServiciosProvider';
import { descargarExcel, filasDeFichero } from '../../data/excel/libroExcel';
import { filasAPaneles } from '../../data/excel/mapeo';
import { avisosDePanel, contextoDeCalidad, resumenAvisos } from '../../domain/calidad';
import { filtrarPorTexto } from '../../domain/paneles';
import { urlDirectaEfectiva } from '../../domain/panelUrls';
import { ESTADOS, type EstadoPanel, type Panel, type PanelInput } from '../../domain/types';
import { useDepartamentos, useMutacionesPanel, usePaneles } from '../../hooks/usePaneles';
import { Badge } from '../../ui/Badge';
import { BotonEnlace, Button } from '../../ui/Button';
import { Buscador, Campo, Input, Select } from '../../ui/Campos';
import { Card, CardCabecera, CardTitulo } from '../../ui/Card';
import { SectionLabel } from '../../ui/SectionLabel';
import { FilaVacia, Table, Td, Th } from '../../ui/Table';
import { cx } from '../../ui/cx';
import { PanelFormModal } from './PanelFormModal';
import estilos from './AdminPage.module.css';

const COLUMNAS = 9;

const GRAVEDAD_A_TONO = { alta: 'aviso', media: 'solicitar', baja: 'neutro' } as const;

/** Campos que se editan directamente sobre la fila. */
type CampoInline = 'nombre' | 'descripcion' | 'responsable' | 'horaActualizacion' | 'orden';

export function AdminPage() {
  const repositorio = useRepositorio();
  const { departamentoPorDefecto } = useConfiguracion();
  const { data: paneles = [], isPending } = usePaneles();
  const { departamentos } = useDepartamentos();
  const { crear, actualizar, retirar, reemplazarTodo, restablecer, admiteImportar } = useMutacionesPanel();

  const [consulta, setConsulta] = useState('');
  const [filtroDepartamento, setFiltroDepartamento] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [editando, setEditando] = useState<Panel | null>(null);
  const [parametros, setParametros] = useSearchParams();
  const [creando, setCreando] = useState(() => parametros.get('nuevo') === '1');
  const [mensaje, setMensaje] = useState<{ texto: string; error?: boolean } | null>(null);
  const entradaFichero = useRef<HTMLInputElement>(null);

  const filtrados = useMemo(() => {
    let lista = paneles;
    if (filtroDepartamento) lista = lista.filter((p) => p.departamento === filtroDepartamento);
    if (filtroEstado) lista = lista.filter((p) => p.estado === filtroEstado);
    return filtrarPorTexto(lista, consulta);
  }, [paneles, filtroDepartamento, filtroEstado, consulta]);

  // Los avisos necesitan el area de trabajo y si el departamento esta descrito:
  // sin esto, "falta area de trabajo" y "departamento huerfano" saldrian siempre.
  const contextoCalidad = useMemo(() => contextoDeCalidad(departamentos), [departamentos]);
  const avisos = useMemo(() => resumenAvisos(paneles, departamentos), [paneles, departamentos]);
  const nombresDepartamento = useMemo(() => departamentos.map((d) => d.nombre), [departamentos]);

  const editarCampo = (panel: Panel, campo: CampoInline, valor: string) => {
    const cambios: Partial<PanelInput> =
      campo === 'orden' ? { orden: Number(valor) || 0 } : { [campo]: valor };
    actualizar.mutate({ id: panel.id, cambios });
  };

  const mover = (panel: Panel, direccion: -1 | 1) => {
    const hermanos = paneles
      .filter((p) => p.departamento === panel.departamento)
      .sort((a, b) => a.orden - b.orden);
    const indice = hermanos.findIndex((p) => p.id === panel.id);
    const vecino = hermanos[indice + direccion];
    if (!vecino) return;
    actualizar.mutate({ id: panel.id, cambios: { orden: vecino.orden } });
    actualizar.mutate({ id: vecino.id, cambios: { orden: panel.orden } });
  };

  const duplicar = (panel: Panel) => {
    crear.mutate({
      nombre: `${panel.nombre} (copia)`,
      areaTrabajo: panel.areaTrabajo,
      urlPanel: panel.urlPanel,
      urlDirecta: panel.urlDirecta ?? '',
      departamento: panel.departamento,
      descripcion: panel.descripcion ?? '',
      responsable: panel.responsable ?? '',
      grupoAcceso: panel.grupoAcceso ?? '',
      horaActualizacion: panel.horaActualizacion ?? '',
      destacado: false,
      orden: panel.orden + 1,
      estado: 'En pruebas',
    });
    setMensaje({ texto: `Duplicado «${panel.nombre}» en estado En pruebas.` });
  };

  const importar = async (fichero: File) => {
    try {
      const filas = await filasDeFichero(fichero);
      const { paneles: importados, filasVacias } = filasAPaneles(filas);
      if (importados.length === 0) {
        setMensaje({ texto: 'Ese fichero no tiene ninguna fila reconocible.', error: true });
        return;
      }
      await reemplazarTodo.mutateAsync(importados);
      setMensaje({
        texto: `Importados ${importados.length} paneles de ${fichero.name}${
          filasVacias > 0 ? ` (${filasVacias} filas vacías descartadas)` : ''
        }.`,
      });
    } catch (error) {
      setMensaje({ texto: `No se ha podido leer el fichero: ${String(error)}`, error: true });
    }
  };

  return (
    <div className={estilos.pagina}>
      <header className={estilos.cabecera}>
        <div>
          <h1 className={estilos.titulo}>Administración de paneles</h1>
          <p className={estilos.subtitulo}>
            Todo lo que hay en la lista, en cualquier estado. Añadir un panel es una operación de
            esta pantalla: no se toca código. Origen actual: <strong>{repositorio.nombre}</strong>.
          </p>
        </div>
        <div className={estilos.accionesCabecera}>
          <input
            ref={entradaFichero}
            type="file"
            accept=".xlsx,.xls,.csv"
            className={estilos.ficheroOculto}
            onChange={(evento) => {
              const fichero = evento.target.files?.[0];
              if (fichero) void importar(fichero);
              evento.target.value = '';
            }}
          />
          {admiteImportar ? (
            <Button variante="secundario" onClick={() => entradaFichero.current?.click()}>
              <Upload size={14} strokeWidth={1.75} />
              Importar Excel
            </Button>
          ) : null}
          <Button variante="secundario" onClick={() => void descargarExcel(paneles)}>
            <Download size={14} strokeWidth={1.75} />
            Exportar a Excel
          </Button>
          {repositorio.restablecer ? (
            <Button
              variante="fantasma"
              onClick={() => {
                void restablecer.mutateAsync().then(() =>
                  setMensaje({ texto: 'Cambios locales descartados: se ha vuelto al fichero del proyecto.' }),
                );
              }}
              title="Descarta lo guardado en este navegador y relee src/data/paneles.xlsx"
            >
              <RotateCcw size={14} strokeWidth={1.75} />
              Restablecer
            </Button>
          ) : null}
          <BotonEnlace a="/admin/accesos" variante="secundario">
            <Users size={14} strokeWidth={1.75} />
            Áreas y accesos
          </BotonEnlace>
          <Button variante="primario" onClick={() => setCreando(true)}>
            <Plus size={14} strokeWidth={1.75} />
            Nuevo panel
          </Button>
        </div>
      </header>

      {mensaje ? (
        <p className={cx(estilos.mensaje, mensaje.error && estilos.mensajeError)}>{mensaje.texto}</p>
      ) : null}

      <div className={estilos.barraFiltros}>
        <div className={estilos.filtroBuscador}>
          <Buscador
            etiquetaAccesible="Buscar en todos los paneles"
            placeholder="Buscar por nombre, descripción, departamento o área…"
            value={consulta}
            onChange={(evento) => setConsulta(evento.target.value)}
          />
        </div>
        <Campo etiqueta="Departamento">
          {(id) => (
            <Select id={id} value={filtroDepartamento} onChange={(e) => setFiltroDepartamento(e.target.value)}>
              <option value="">Todos</option>
              {nombresDepartamento.map((nombre) => (
                <option key={nombre} value={nombre}>
                  {nombre}
                </option>
              ))}
            </Select>
          )}
        </Campo>
        <Campo etiqueta="Estado">
          {(id) => (
            <Select id={id} value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
              <option value="">Todos</option>
              {ESTADOS.map((estado) => (
                <option key={estado} value={estado}>
                  {estado}
                </option>
              ))}
            </Select>
          )}
        </Campo>
        <span className={estilos.resumenFiltro}>
          {filtrados.length} de {paneles.length} paneles
        </span>
      </div>

      {avisos.length > 0 ? (
        <Card compacta>
          <CardCabecera>
            <CardTitulo>Calidad de los datos</CardTitulo>
            <SectionLabel>{avisos.length} tipos de aviso</SectionLabel>
          </CardCabecera>
          <ul className={estilos.avisos}>
            {avisos.map((aviso) => (
              <li key={aviso.tipo} className={estilos.avisoFila}>
                <Badge tono={GRAVEDAD_A_TONO[aviso.gravedad as keyof typeof GRAVEDAD_A_TONO] ?? 'neutro'}>
                  {aviso.gravedad}
                </Badge>
                {aviso.mensaje}
                <span className={estilos.avisoTotal}>{aviso.total}</span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      <Card sinRelleno compacta>
        <Table className={estilos.tablaAdmin}>
          <thead>
            <tr>
              <Th numerico estrecha>Orden</Th>
              <Th>Panel</Th>
              <Th>Departamento</Th>
              <Th>Para qué sirve</Th>
              <Th>Responsable</Th>
              <Th numerico estrecha>Hora</Th>
              <Th estrecha>Estado</Th>
              <Th estrecha>Avisos</Th>
              <Th estrecha>Acciones</Th>
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <FilaVacia colSpan={COLUMNAS}>Cargando paneles…</FilaVacia>
            ) : filtrados.length === 0 ? (
              <FilaVacia colSpan={COLUMNAS}>Ningún panel coincide con los filtros.</FilaVacia>
            ) : (
              filtrados.map((panel) => {
                const avisosPanel = avisosDePanel(panel, contextoCalidad(panel));
                return (
                  <tr key={panel.id} className={cx(estilos.fila, panel.estado === 'Retirado' && estilos.filaRetirada)}>
                    <Td estrecha>
                      <Input
                        enLinea
                        className={estilos.celdaOrden}
                        inputMode="numeric"
                        aria-label={`Orden de ${panel.nombre}`}
                        defaultValue={panel.orden}
                        onBlur={(evento) => {
                          if (Number(evento.target.value) !== panel.orden) {
                            editarCampo(panel, 'orden', evento.target.value);
                          }
                        }}
                      />
                    </Td>
                    <Td>
                      <span className={estilos.nombreCelda}>
                        <Input
                          enLinea
                          className={estilos.nombreTexto}
                          aria-label={`Nombre de ${panel.nombre}`}
                          defaultValue={panel.nombre}
                          onBlur={(evento) => {
                            if (evento.target.value !== panel.nombre) {
                              editarCampo(panel, 'nombre', evento.target.value);
                            }
                          }}
                        />
                        <span className={estilos.nombreMeta}>
                          {panel.reportId
                            ? `${panel.reportId.slice(0, 8)}… · ${panel.pageName || 'sin página'}`
                            : 'sin informe'}
                          {panel.destacado ? ' · destacado' : ''}
                        </span>
                      </span>
                    </Td>
                    <Td>
                      <Select
                        enLinea
                        className={estilos.celdaDepartamento}
                        aria-label={`Departamento de ${panel.nombre}`}
                        value={panel.departamento}
                        onChange={(evento) =>
                          actualizar.mutate({ id: panel.id, cambios: { departamento: evento.target.value } })
                        }
                      >
                        {[...new Set([panel.departamento, ...nombresDepartamento])]
                          .filter(Boolean)
                          .map((nombre) => (
                            <option key={nombre} value={nombre}>
                              {nombre}
                            </option>
                          ))}
                      </Select>
                    </Td>
                    <Td className={estilos.celdaTexto}>
                      <Input
                        enLinea
                        aria-label={`Descripción de ${panel.nombre}`}
                        placeholder="Sin descripción"
                        defaultValue={panel.descripcion ?? ''}
                        onBlur={(evento) => {
                          if (evento.target.value !== (panel.descripcion ?? '')) {
                            editarCampo(panel, 'descripcion', evento.target.value);
                          }
                        }}
                      />
                    </Td>
                    <Td>
                      <Input
                        enLinea
                        aria-label={`Responsable de ${panel.nombre}`}
                        placeholder="Sin asignar"
                        defaultValue={panel.responsable ?? ''}
                        onBlur={(evento) => {
                          if (evento.target.value !== (panel.responsable ?? '')) {
                            editarCampo(panel, 'responsable', evento.target.value);
                          }
                        }}
                      />
                    </Td>
                    <Td estrecha>
                      <Input
                        enLinea
                        className={estilos.celdaHora}
                        aria-label={`Hora de ${panel.nombre}`}
                        placeholder="—"
                        defaultValue={panel.horaActualizacion ?? ''}
                        onBlur={(evento) => {
                          if (evento.target.value !== (panel.horaActualizacion ?? '')) {
                            editarCampo(panel, 'horaActualizacion', evento.target.value);
                          }
                        }}
                      />
                    </Td>
                    <Td estrecha>
                      <Select
                        enLinea
                        className={estilos.celdaEstado}
                        aria-label={`Estado de ${panel.nombre}`}
                        value={panel.estado}
                        onChange={(evento) =>
                          actualizar.mutate({
                            id: panel.id,
                            cambios: { estado: evento.target.value as EstadoPanel },
                          })
                        }
                      >
                        {ESTADOS.map((estado) => (
                          <option key={estado} value={estado}>
                            {estado}
                          </option>
                        ))}
                      </Select>
                    </Td>
                    <Td estrecha>
                      {avisosPanel.length === 0 ? (
                        <span className={estilos.sinDato}>—</span>
                      ) : (
                        <span
                          className={estilos.avisosCelda}
                          title={avisosPanel.map((a) => a.mensaje).join('\n')}
                        >
                          <Badge tono={GRAVEDAD_A_TONO[avisosPanel[0]!.gravedad]}>
                            {avisosPanel.length}
                          </Badge>
                        </span>
                      )}
                    </Td>
                    <Td estrecha className={estilos.celdaAcciones}>
                      <span className={estilos.acciones}>
                        <Button pequeno soloIcono variante="fantasma" title="Subir" onClick={() => mover(panel, -1)}>
                          <ArrowUp size={13} strokeWidth={1.75} />
                        </Button>
                        <Button pequeno soloIcono variante="fantasma" title="Bajar" onClick={() => mover(panel, 1)}>
                          <ArrowDown size={13} strokeWidth={1.75} />
                        </Button>
                        <Button pequeno soloIcono variante="fantasma" title="Editar" onClick={() => setEditando(panel)}>
                          <Pencil size={13} strokeWidth={1.75} />
                        </Button>
                        <Button pequeno soloIcono variante="fantasma" title="Duplicar" onClick={() => duplicar(panel)}>
                          <Copy size={13} strokeWidth={1.75} />
                        </Button>
                        <Link
                          to={`/panel/${panel.id}`}
                          className={estilos.enlaceIcono}
                          title="Ver incrustado"
                          aria-label={`Ver ${panel.nombre} incrustado`}
                        >
                          <Monitor size={13} strokeWidth={1.75} />
                        </Link>
                        <a
                          href={urlDirectaEfectiva(panel, contextoCalidad(panel).workspaceDelArea)}
                          target="_blank"
                          rel="noreferrer"
                          className={estilos.enlaceIcono}
                          title="Abrir en Power BI"
                          aria-label={`Abrir ${panel.nombre} en Power BI`}
                        >
                          <ExternalLink size={13} strokeWidth={1.75} />
                        </a>
                        <Button
                          pequeno
                          soloIcono
                          variante="fantasma"
                          title="Retirar (borrado lógico)"
                          disabled={panel.estado === 'Retirado'}
                          onClick={() => {
                            retirar.mutate(panel.id);
                            setMensaje({ texto: `«${panel.nombre}» pasa a Retirado. No se borra ninguna fila.` });
                          }}
                        >
                          <Trash2 size={13} strokeWidth={1.75} />
                        </Button>
                      </span>
                    </Td>
                  </tr>
                );
              })
            )}
          </tbody>
        </Table>
      </Card>

      <div className={estilos.pie}>
        <span>
          Retirar es un borrado lógico: la fila se queda con Estado = «Retirado» y desaparece del
          portal de consulta.
        </span>
        <span>
          Exportar genera el Excel con las columnas del export original más las nuevas, listo para
          volver a subirlo a SharePoint.
        </span>
      </div>

      {creando ? (
        <PanelFormModal
          departamentos={nombresDepartamento}
          departamentoPorDefecto={departamentoPorDefecto ?? ''}
          guardando={crear.isPending}
          alCerrar={() => {
            setCreando(false);
            if (parametros.has('nuevo')) setParametros({}, { replace: true });
          }}
          alGuardar={(entrada) => {
            crear.mutate(entrada);
            setCreando(false);
            setMensaje({ texto: `Añadido «${entrada.nombre}».` });
          }}
        />
      ) : null}

      {editando ? (
        <PanelFormModal
          panel={editando}
          departamentos={nombresDepartamento}
          guardando={actualizar.isPending}
          alCerrar={() => setEditando(null)}
          alGuardar={(entrada) => {
            actualizar.mutate({ id: editando.id, cambios: entrada });
            setEditando(null);
            setMensaje({ texto: `Guardado «${entrada.nombre}».` });
          }}
        />
      ) : null}
    </div>
  );
}
