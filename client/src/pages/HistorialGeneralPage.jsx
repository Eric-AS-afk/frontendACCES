import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
// Helper para DD/MM/YYYY
const formatDMY = (iso) => {
  if (!iso) return '';
  const s = String(iso);
  const base = s.includes('T') ? s.split('T')[0] : s;
  const [y, m, d] = (base || '').split('-');
  if (y && m && d) return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
  return base;
};
import * as XLSX from 'xlsx';

function HistorialGeneralPage() {
  const navigate = useNavigate();
  const [pagos, setPagos] = useState([]);
  const [pagosExtra, setPagosExtra] = useState([]);
  const [usuarios, setUsuarios] = useState([]);
  const [casas, setCasas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [vistaActiva, setVistaActiva] = useState('mensuales'); // 'mensuales' o 'extras'

  // Filtros
  const [usuarioId, setUsuarioId] = useState("");
  const [mes, setMes] = useState("");
  const [anio, setAnio] = useState("");
  const [casaNumero, setCasaNumero] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const meses = useMemo(() => ([
    { value: "", label: "Todos" },
    { value: "01", label: "Enero" },
    { value: "02", label: "Febrero" },
    { value: "03", label: "Marzo" },
    { value: "04", label: "Abril" },
    { value: "05", label: "Mayo" },
    { value: "06", label: "Junio" },
    { value: "07", label: "Julio" },
    { value: "08", label: "Agosto" },
    { value: "09", label: "Septiembre" },
    { value: "10", label: "Octubre" },
    { value: "11", label: "Noviembre" },
    { value: "12", label: "Diciembre" },
  ]), []);

  const mesesEs = useMemo(() => ({
    '01': 'Enero', '02': 'Febrero', '03': 'Marzo', '04': 'Abril', '05': 'Mayo', '06': 'Junio',
    '07': 'Julio', '08': 'Agosto', '09': 'Septiembre', '10': 'Octubre', '11': 'Noviembre', '12': 'Diciembre'
  }), []);

  useEffect(() => {
    // Cargar usuarios y casas para filtro y todos los pagos
    const load = async () => {
      try {
        const [uRes, pRes, cRes, eRes] = await Promise.all([
          axios.get('/api/usuarios'),
          axios.get('/api/pagos/todos-con-usuario'),
          axios.get('/api/casas'),
          axios.get('/api/extra')
        ]);
        setUsuarios(uRes.data || []);
        setPagos(pRes.data || []);
        setCasas(cRes.data || []);
        setPagosExtra(eRes.data || []);
      } catch (err) {
        setUsuarios([]);
        setPagos([]);
        setCasas([]);
        setPagosExtra([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const pagosFiltrados = useMemo(() => {
    const usuarioTexto = (usuarioId || "").toString().trim().toLowerCase();
    const casaTexto = (casaNumero || "").toString().trim().toLowerCase();
    return (pagos || []).filter(p => {
      // Filtro usuario por texto: coincide por nombre o contiene el ID
      const nombre = (p.US_NOMBRE || '').toLowerCase();
      const idStr = String(p.US_USUARIO || '');
      const okUsuario = usuarioTexto ? (nombre.includes(usuarioTexto) || idStr.includes(usuarioTexto)) : true;

      // Filtro de mes y año
      const okMes = mes ? String(p.PAG_MES).padStart(2,'0') === mes : true;
      const okAnio = anio ? String(p.PAG_AÑO) === String(anio) : true;

      // Filtro de casa por texto (parcial)
      const casaStr = String(p.CAS_NUMERO || '').toLowerCase();
      const okCasa = casaTexto ? casaStr.includes(casaTexto) : true;

      // Filtro por rango de fechas usando ISO YYYY-MM-DD
      const fechaPago = p.PAG_fecha ? String(p.PAG_fecha).split('T')[0] : '';
      const okFechaInicio = fechaInicio ? (fechaPago >= fechaInicio) : true;
      const okFechaFin = fechaFin ? (fechaPago <= fechaFin) : true;

      return okUsuario && okMes && okAnio && okCasa && okFechaInicio && okFechaFin;
    });
  }, [pagos, usuarioId, mes, anio, casaNumero, fechaInicio, fechaFin]);

  const pagosExtraFiltrados = useMemo(() => {
    const usuarioTexto = (usuarioId || "").toString().trim().toLowerCase();
    return (pagosExtra || []).filter(e => {
      const nombre = (e.US_NOMBRE || '').toLowerCase();
      const idStr = String(e.US_USUARIO || '');
      const okUsuario = usuarioTexto ? (nombre.includes(usuarioTexto) || idStr.includes(usuarioTexto)) : true;
      // Filtro por fecha
      const fechaPago = e.EXT_FECHA ? String(e.EXT_FECHA).split('T')[0] : '';
      const okFechaInicio = fechaInicio ? (fechaPago >= fechaInicio) : true;
      const okFechaFin = fechaFin ? (fechaPago <= fechaFin) : true;
      return okUsuario && okFechaInicio && okFechaFin;
    });
  }, [pagosExtra, usuarioId, fechaInicio, fechaFin]);

  // Años presentes en datos
  const yearsOptions = useMemo(() => {
    const years = new Set((pagos || []).map(p => String(p.PAG_AÑO)));
    const arr = Array.from(years).sort();
    return ["", ...arr];
  }, [pagos]);

  // Números de casa únicos presentes en datos
  const casasOptions = useMemo(() => {
    const numeros = new Set((casas || []).map(c => String(c.CAS_NUMERO)).filter(n => n));
    const arr = Array.from(numeros).sort((a, b) => Number(a) - Number(b));
    return arr;
  }, [casas]);

  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const esAdmin = tipoId === '1' || tipoId === '2';

  const exportarExcel = () => {
    const fechaHoy = new Date().toISOString().split('T')[0];
    const wb = XLSX.utils.book_new();

    // Hoja: Pagos Mensuales
    const headersM = ['Usuario','ID Usuario','Casa','Mes','Año','Fecha Pago','Total Pagado','Evidencia'];
    const aoaM = [
      ['Historial General - Pagos Mensuales'],
      [`Fecha de exportación: ${fechaHoy}`],
      headersM,
      ...pagosFiltrados.map(p => {
        const fechaStr = p.PAG_fecha ? String(p.PAG_fecha).split('T')[0] : '';
        const fecha = fechaStr ? new Date(fechaStr) : '';
        return [
          p.US_NOMBRE || '',
          p.US_USUARIO || '',
          p.CAS_NUMERO || 'N/A',
          mesesEs[String(p.PAG_MES).padStart(2,'0')] || p.PAG_MES,
          p.PAG_AÑO || '',
          fecha || fechaStr,
          Number(p.PAG_TOTAL || 0),
          p.PAG_EVIDENCIA || 'Sin evidencia'
        ];
      })
    ];
    const wsMensual = XLSX.utils.aoa_to_sheet(aoaM);
    wsMensual['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:7 } },
      { s: { r:1, c:0 }, e: { r:1, c:7 } }
    ];
    wsMensual['!cols'] = [
      { wch: 28 },{ wch: 12 },{ wch: 10 },{ wch: 12 },{ wch: 8 },{ wch: 14 },{ wch: 14 },{ wch: 24 }
    ];
    wsMensual['!autofilter'] = { ref: 'A3:H3' };
    {
      const startRow = 4;
      const endRow = startRow + pagosFiltrados.length - 1;
      for (let r = startRow; r <= endRow; r++) {
        const fechaCell = `F${r}`;
        const totalCell = `G${r}`;
        if (wsMensual[fechaCell] && wsMensual[fechaCell].v instanceof Date) {
          wsMensual[fechaCell].t = 'd';
          wsMensual[fechaCell].z = 'yyyy-mm-dd';
        }
        if (wsMensual[totalCell]) {
          wsMensual[totalCell].t = 'n';
          wsMensual[totalCell].z = '#,##0.00';
        }
      }
      const totalRow = endRow + 1;
      if (totalRow >= startRow) {
        wsMensual[`F${totalRow}`] = { t: 's', v: 'Total' };
        wsMensual[`G${totalRow}`] = { f: `SUM(G${startRow}:G${endRow})` };
        wsMensual[`G${totalRow}`].t = 'n';
        wsMensual[`G${totalRow}`].z = '#,##0.00';
      }
    }
    XLSX.utils.book_append_sheet(wb, wsMensual, 'Pagos Mensuales');

    // Hoja: Pagos Extras
    const headersE = ['Usuario','ID Usuario','Tipo Extra','Descripción','Fecha','Fecha del Evento','Total Pagado','Evidencia'];
    const aoaE = [
      ['Historial General - Pagos Extras'],
      [`Fecha de exportación: ${fechaHoy}`],
      headersE,
      ...pagosExtraFiltrados.map(e => {
        const fechaStr = e.EXT_FECHA ? String(e.EXT_FECHA).split('T')[0] : '';
        const fecha = fechaStr ? formatDMY(fechaStr) : '';
        const fechaEventoStr = e.EXT_FECHA_EVENTO ? String(e.EXT_FECHA_EVENTO).split('T')[0] : '';
        const fechaEvento = fechaEventoStr ? formatDMY(fechaEventoStr) : '';
        return [
          e.US_NOMBRE || '',
          e.US_USUARIO || '',
          e.TIE_NOMBRE || e.TIE_TIPO || '',
          e.TIE_DESCRIPCION || '',
          fecha,
          fechaEvento || '-',
          Number(e.EXT_TOTAL || 0),
          e.EXT_EVIDENCIA || 'Sin evidencia'
        ];
      })
    ];
    const wsExtra = XLSX.utils.aoa_to_sheet(aoaE);
    wsExtra['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:7 } },
      { s: { r:1, c:0 }, e: { r:1, c:7 } }
    ];
    wsExtra['!cols'] = [
      { wch: 28 },{ wch: 12 },{ wch: 24 },{ wch: 32 },{ wch: 14 },{ wch: 18 },{ wch: 14 },{ wch: 24 }
    ];
    wsExtra['!autofilter'] = { ref: 'A3:H3' };
    {
      const startRow = 4;
      const endRow = startRow + pagosExtraFiltrados.length - 1;
      // Fechas se exportan como texto DD/MM/YYYY para evitar problemas regionales; solo se formatea el total
      for (let r = startRow; r <= endRow; r++) {
        const totalCell = `G${r}`;
        if (wsExtra[totalCell]) {
          wsExtra[totalCell].t = 'n';
          wsExtra[totalCell].z = '#,##0.00';
        }
      }
      const totalRow = endRow + 1;
      if (totalRow >= startRow) {
        wsExtra[`F${totalRow}`] = { t: 's', v: 'Total' };
        wsExtra[`G${totalRow}`] = { f: `SUM(G${startRow}:G${endRow})` };
        wsExtra[`G${totalRow}`].t = 'n';
        wsExtra[`G${totalRow}`].z = '#,##0.00';
      }
    }
    XLSX.utils.book_append_sheet(wb, wsExtra, 'Pagos Extras');

    const nombreArchivo = `historial_general_${fechaHoy}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (!esAdmin) {
    return (
      <>
        <HeaderBar />
        <div className="container mt-5">
          <div className="alert alert-danger">No autorizado</div>
        </div>
      </>
    );
  }

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-4">
        <div className="card shadow p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">Historial general</h3>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-success" 
                onClick={exportarExcel}
                disabled={pagosFiltrados.length === 0 && pagosExtraFiltrados.length === 0}
                title="Exportar a Excel"
              >
                <i className="bi bi-file-earmark-excel"></i> Exportar Excel
              </button>
              <button className="btn btn-outline-primary" onClick={() => navigate('/historial')}>
                Volver
              </button>
            </div>
          </div>

          {/* Filtros */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label">Usuario</label>
              <input
                type="text"
                className="form-control"
                value={usuarioId}
                onChange={(e) => setUsuarioId(e.target.value)}
                placeholder="Buscar por nombre o ID"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Casa</label>
              <input
                type="text"
                className="form-control"
                value={casaNumero}
                onChange={(e) => setCasaNumero(e.target.value)}
                placeholder="Número de casa"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Mes</label>
              <select className="form-select" value={mes} onChange={(e) => setMes(e.target.value)}>
                {meses.map(m => (
                  <option key={m.value || 'all'} value={m.value}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Año</label>
              <select className="form-select" value={anio} onChange={(e) => setAnio(e.target.value)}>
                <option value="">Todos</option>
                {yearsOptions.map(y => (
                  <option key={y || 'all'} value={y}>{y || 'Todos'}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2 d-flex align-items-end">
              <button className="btn btn-outline-secondary w-100" onClick={() => { setUsuarioId(""); setMes(""); setAnio(""); setCasaNumero(""); setFechaInicio(""); setFechaFin(""); }}>Limpiar</button>
            </div>
          </div>

          {/* Rango de fechas */}
          <div className="row g-3 mb-3">
            <div className="col-md-3">
              <label className="form-label">Fecha inicio</label>
              <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="col-md-3">
              <label className="form-label">Fecha fin</label>
              <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : (
            <>
              {/* Pestañas de navegación */}
              <ul className="nav nav-tabs mb-3 mt-3">
                <li className="nav-item">
                  <button 
                    className={`nav-link ${vistaActiva === 'mensuales' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('mensuales')}
                  >
                    Pagos Mensuales
                  </button>
                </li>
                <li className="nav-item">
                  <button 
                    className={`nav-link ${vistaActiva === 'extras' ? 'active' : ''}`}
                    onClick={() => setVistaActiva('extras')}
                  >
                    Pagos Extras
                  </button>
                </li>
              </ul>

              {/* Pagos Mensuales */}
              {vistaActiva === 'mensuales' && (
                <>
                  {pagosFiltrados.length === 0 ? (
                    <p className="text-muted">Sin pagos mensuales</p>
                  ) : (
                    <div className="table-responsive mb-4">
                      <table className="table table-bordered align-middle">
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Casa</th>
                            <th>Mes</th>
                            <th>Año</th>
                            <th>Fecha Pago</th>
                            <th>Total Pagado</th>
                            <th>Evidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosFiltrados.map((p) => (
                            <tr key={`g-${p.PAG_PAGO}`}>
                              <td>{p.US_NOMBRE} (ID: {p.US_USUARIO})</td>
                              <td>{p.CAS_NUMERO || 'N/A'}</td>
                              <td>{mesesEs[String(p.PAG_MES).padStart(2,'0')] || p.PAG_MES}</td>
                              <td>{p.PAG_AÑO}</td>
                              <td>{p.PAG_fecha ? String(p.PAG_fecha).split('T')[0] : ''}</td>
                              <td>Q {Number(p.PAG_TOTAL || 0).toFixed(2)}</td>
                              <td>
                                {p.PAG_EVIDENCIA ? (
                                  <a href={`/uploads/evidencias/${p.PAG_EVIDENCIA}`} target="_blank" rel="noreferrer" title={p.PAG_EVIDENCIA}>
                                    Ver evidencia
                                  </a>
                                ) : (
                                  <span className="text-muted">Sin evidencia</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}

              {/* Pagos Extras */}
              {vistaActiva === 'extras' && (
                <>
                  {pagosExtraFiltrados.length === 0 ? (
                    <p className="text-muted">Sin pagos extras</p>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-bordered align-middle">
                        <thead>
                          <tr>
                            <th>Usuario</th>
                            <th>Nombre</th>
                            <th>Descripción</th>
                            <th>Fecha</th>
                            <th>Total Pagado</th>
                            <th>Evidencia</th>
                          </tr>
                        </thead>
                        <tbody>
                          {pagosExtraFiltrados.map((e) => (
                            <tr key={`e-${e.EXT_EXTRA}`}>
                              <td>{e.US_NOMBRE} (ID: {e.US_USUARIO})</td>
                              <td>{e.TIE_NOMBRE || e.TIE_TIPO}</td>
                              <td>{e.TIE_DESCRIPCION || ''}</td>
                              <td>{e.EXT_FECHA ? String(e.EXT_FECHA).split('T')[0] : ''}</td>
                              <td>Q{Number(e.EXT_TOTAL || 0).toFixed(2)}</td>
                              <td>
                                {e.EXT_EVIDENCIA ? (
                                  <a href={`/uploads/evidencias/${e.EXT_EVIDENCIA}`} target="_blank" rel="noreferrer" title={e.EXT_EVIDENCIA}>
                                    Ver evidencia
                                  </a>
                                ) : (
                                  <span className="text-muted">Sin evidencia</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </div>
      <VersionFooter />
    </PageLayout>
  );
}

export default HistorialGeneralPage;
