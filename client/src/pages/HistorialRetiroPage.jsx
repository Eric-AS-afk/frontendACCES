import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import * as XLSX from 'xlsx';
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import ImageModal from '../components/ImageModal';

// Formatea una fecha ISO (YYYY-MM-DD o con tiempo) a DD/MM/YYYY para mostrar en UI/Excel (texto)
const formatDMY = (dateLike) => {
  if (!dateLike) return '';
  const s = typeof dateLike === 'string' ? dateLike : String(dateLike);
  const iso = s.includes('T') ? s.split('T')[0] : s;
  const [y, m, d] = (iso || '').split('-');
  if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  return s;
};

function HistorialRetiroPage() {
  const navigate = useNavigate();
  const [retiros, setRetiros] = useState([]);
  const [proveedores, setProveedores] = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filtros
  const [usuarioFiltro, setUsuarioFiltro] = useState(""); // por nombre o ID
  const [proveedorFiltro, setProveedorFiltro] = useState(""); // por nombre o ID
  const [tipoPagoFiltro, setTipoPagoFiltro] = useState(""); // por TIP_TIPO
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");

  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const esAdmin = tipoId === '1' || tipoId === '2' || tipoId === '4';

  const [modalOpen, setModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [rRes, pRes, tRes] = await Promise.all([
          axios.get('/api/retiro'),
          axios.get('/api/proveedor'),
          axios.get('/api/tipo-pago'),
        ]);
        setRetiros(rRes.data || []);
        setProveedores(pRes.data || []);
        setTiposPago(tRes.data || []);
      } catch (err) {
        setRetiros([]);
        setProveedores([]);
        setTiposPago([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const proveedorMap = useMemo(() => {
    const m = new Map();
    (proveedores || []).forEach(p => m.set(p.PRO_PROVEEDOR, p));
    return m;
  }, [proveedores]);

  const tipoPagoMap = useMemo(() => {
    const m = new Map();
    (tiposPago || []).forEach(t => m.set(t.TIP_TIPO, t.TIP_NOMBRE));
    return m;
  }, [tiposPago]);

  const retirosFiltrados = useMemo(() => {
    const usuTxt = (usuarioFiltro || '').toLowerCase().trim();
    const proTxt = (proveedorFiltro || '').toLowerCase().trim();
    return (retiros || []).filter(r => {
      // Usuario: coincide por nombre o contiene el ID
      const nombreU = (r.US_NOMBRE || '').toLowerCase();
      const idU = String(r.US_USUARIO || '');
      const okUsuario = usuTxt ? (nombreU.includes(usuTxt) || idU.includes(usuTxt)) : true;

      // Proveedor: coincide por nombre, 'nombre - servicio' o contiene el ID
      const prov = proveedorMap.get(r.PRO_PROVEEDOR);
      const provNombre = (r.PRO_NOMBRE || prov?.PRO_NOMBRE || '').toLowerCase();
      const provServicio = (prov?.SER_NOMBRE || '').toLowerCase();
      const provFull = provServicio ? `${provNombre} - ${provServicio}` : provNombre;
      const idP = String(r.PRO_PROVEEDOR || '');
      const okProveedor = proTxt ? (provFull.includes(proTxt) || idP.includes(proTxt)) : true;

      // Tipo de pago
      const okTipoPago = tipoPagoFiltro ? (String(r.TIP_TIPO) === tipoPagoFiltro) : true;

      // Fechas
      const fecha = r.RET_FECHA ? String(r.RET_FECHA).split('T')[0] : '';
      const okInicio = fechaInicio ? (fecha >= fechaInicio) : true;
      const okFin = fechaFin ? (fecha <= fechaFin) : true;

      return okUsuario && okProveedor && okTipoPago && okInicio && okFin;
    });
  }, [retiros, usuarioFiltro, proveedorFiltro, tipoPagoFiltro, fechaInicio, fechaFin, proveedorMap]);

  const exportarExcel = () => {
    const fechaHoyISO = new Date().toISOString().split('T')[0];
    const fechaHoyDMY = formatDMY(fechaHoyISO);
    // Construir AOA con título, subtítulo, cabeceras y filas
    const headers = ['ID Retiro','Usuario','ID Usuario','Proveedor','Servicio','Tipo de Pago','Fecha','Monto'];
    const aoa = [
      ['Historial de Retiros'],
      [`Fecha de exportación: ${fechaHoyDMY}`],
      headers,
      ...retirosFiltrados.map(r => {
        const prov = proveedorMap.get(r.PRO_PROVEEDOR);
        const nombreProv = r.PRO_NOMBRE || prov?.PRO_NOMBRE || '';
        const servicio = prov?.SER_NOMBRE || '';
        const fechaStr = r.RET_FECHA ? String(r.RET_FECHA).split('T')[0] : '';
        // Para garantizar visualización DD/MM/YYYY en cualquier Excel, usar texto formateado
        const fechaTexto = formatDMY(fechaStr);
        return [
          r.RET_RETIRO,
          r.US_NOMBRE || '',
          r.US_USUARIO || '',
          nombreProv,
          servicio,
          (r.TIP_NOMBRE || tipoPagoMap.get(r.TIP_TIPO) || ''),
          fechaTexto,
          Number(r.RET_TOTAL || 0)
        ];
      })
    ];

    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.aoa_to_sheet(aoa);

    // Merges para título y subtítulo (A1:H1 y A2:H2)
    ws['!merges'] = [
      { s: { r:0, c:0 }, e: { r:0, c:7 } },
      { s: { r:1, c:0 }, e: { r:1, c:7 } }
    ];

    // Ancho de columnas
    ws['!cols'] = [
      { wch: 10 }, // ID Retiro
      { wch: 28 }, // Usuario
      { wch: 12 }, // ID Usuario
      { wch: 28 }, // Proveedor
      { wch: 20 }, // Servicio
      { wch: 18 }, // Tipo de Pago
      { wch: 14 }, // Fecha
      { wch: 14 }, // Monto
    ];

    // Autofiltro sobre la fila de cabeceras (fila 3 en 1-based => A3:H3)
    ws['!autofilter'] = { ref: 'A3:H3' };

    // Formatear Fecha (columna G) y Monto (columna H)
    const startRow = 4; // datos empiezan en fila 4 (1-based)
    const endRow = startRow + retirosFiltrados.length - 1;
    for (let r = startRow; r <= endRow; r++) {
      const fechaCell = `G${r}`;
      const montoCell = `H${r}`;
      if (ws[fechaCell] && ws[fechaCell].v instanceof Date) {
        ws[fechaCell].t = 'd';
        ws[fechaCell].z = 'dd/mm/yyyy';
      }
      if (ws[montoCell]) {
        ws[montoCell].t = 'n';
        ws[montoCell].z = '#,##0.00';
      }
    }

    // Fila de totales al final
    const totalRow = endRow + 1;
    if (totalRow >= startRow) {
      ws[`G${totalRow}`] = { t: 's', v: 'Total' };
      ws[`H${totalRow}`] = { f: `SUM(H${startRow}:H${endRow})` };
      ws[`H${totalRow}`].t = 'n';
      ws[`H${totalRow}`].z = '#,##0.00';
    }

    XLSX.utils.book_append_sheet(wb, ws, 'Retiros');
    // Mantener ISO para el nombre de archivo (evita '/' inválidos en Windows)
    const nombreArchivo = `historial_retiros_${fechaHoyISO}.xlsx`;
    XLSX.writeFile(wb, nombreArchivo);
  };

  if (!esAdmin) {
    return (
      <PageLayout>
        <HeaderBar />
        <div className="container mt-5">
          <div className="alert alert-danger">No autorizado</div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-4">
        <div className="card shadow p-4">
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h3 className="mb-0">Historial de Desembolsos</h3>
            <div className="d-flex gap-2">
              <button
                className="btn btn-success"
                onClick={exportarExcel}
                disabled={retirosFiltrados.length === 0}
              >
                Exportar Excel
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
                value={usuarioFiltro}
                onChange={(e) => setUsuarioFiltro(e.target.value)}
                placeholder="Buscar por nombre o ID"
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">Proveedor</label>
              <input
                type="text"
                className="form-control"
                value={proveedorFiltro}
                onChange={(e) => setProveedorFiltro(e.target.value)}
                placeholder="Nombre, servicio o ID"
              />
            </div>
            <div className="col-md-2">
              <label className="form-label">Tipo de Pago</label>
              <select
                className="form-select"
                value={tipoPagoFiltro}
                onChange={(e) => setTipoPagoFiltro(e.target.value)}
              >
                <option value="">Todos</option>
                {tiposPago.map(t => (
                  <option key={t.TIP_TIPO} value={t.TIP_TIPO}>{t.TIP_NOMBRE}</option>
                ))}
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha inicio</label>
              <input type="date" className="form-control" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)} />
            </div>
            <div className="col-md-2">
              <label className="form-label">Fecha fin</label>
              <input type="date" className="form-control" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)} />
            </div>
          </div>

          <div className="d-flex justify-content-end mb-3">
            <button className="btn btn-outline-secondary" onClick={() => { setUsuarioFiltro(''); setProveedorFiltro(''); setTipoPagoFiltro(''); setFechaInicio(''); setFechaFin(''); }}>Limpiar</button>
          </div>

          {loading ? (
            <p>Cargando...</p>
          ) : (
            <div className="table-responsive">
              {retirosFiltrados.length === 0 ? (
                <p className="text-muted">Sin retiros</p>
              ) : (
                <table className="table table-bordered align-middle">
                  <thead>
                    <tr>
                      <th>Usuario</th>
                        <th>Proveedor</th>
                        <th>Tipo de Pago</th>
                        <th>Fecha</th>
                        <th>Monto</th>
                        <th>Evidencia</th>
                    </tr>
                  </thead>
                  <tbody>
                    {retirosFiltrados.map(r => {
                      const prov = proveedorMap.get(r.PRO_PROVEEDOR);
                      const labelProv = prov?.SER_NOMBRE ? `${r.PRO_NOMBRE || prov.PRO_NOMBRE} - ${prov.SER_NOMBRE}` : (r.PRO_NOMBRE || prov?.PRO_NOMBRE || '');
                      const tipoNombre = r.TIP_NOMBRE || tipoPagoMap.get(r.TIP_TIPO) || '-';
                      return (
                        <tr key={`ret-${r.RET_RETIRO}`}>
                          <td>{r.US_NOMBRE}</td>
                          <td>{labelProv}</td>
                          <td>{tipoNombre}</td>
                          <td>{formatDMY(r.RET_FECHA)}</td>
                              <td>Q {Number(r.RET_TOTAL || 0).toFixed(2)}</td>
                              <td>
                                {r.RET_EVIDENCIA ? (
                                  <button className="btn btn-link p-0" onClick={() => { setModalFile(r.RET_EVIDENCIA); setModalOpen(true); }} title={r.RET_EVIDENCIA}>
                                    <span className="bi bi-file-earmark-image" aria-label="Ver evidencia" /> Ver evidencia
                                  </button>
                                ) : (
                                  <span className="text-muted">Sin evidencia</span>
                                )}
                              </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      </div>
        <ImageModal filename={modalFile} show={modalOpen} onClose={() => setModalOpen(false)} />
      <VersionFooter />
    </PageLayout>
  );
}

export default HistorialRetiroPage;
