import React, { useEffect, useMemo, useState } from "react";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import axios from "axios";

// Formatea una fecha ISO (YYYY-MM-DD) a DD/MM/YYYY solo para mostrar
const formatDMY = (iso) => {
  if (!iso) return '';
  const [y, m, d] = String(iso).split('T')[0].split('-');
  if (y && m && d) return `${d.padStart(2, '0')}/${m.padStart(2, '0')}/${y}`;
  return iso;
};

function RetiroPage() {
  const [cuenta, setCuenta] = useState(null);
  const [proveedores, setProveedores] = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [totalPagos, setTotalPagos] = useState(0);
  const [totalExtras, setTotalExtras] = useState(0);
  const [totalRetiros, setTotalRetiros] = useState(0);

  const [proveedorSel, setProveedorSel] = useState("");
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState("");
  const [monto, setMonto] = useState("");
  const [evidenciaFile, setEvidenciaFile] = useState(null);
  const [fecha, setFecha] = useState(() => new Date().toISOString().split("T")[0]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const usuarioId = localStorage.getItem("id");
  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const esAdmin = tipoId === '1' || tipoId === '2';

  const saldo = useMemo(() => {
    const s = (Number(totalPagos) || 0) + (Number(totalExtras) || 0) - (Number(totalRetiros) || 0);
    return s;
  }, [totalPagos, totalExtras, totalRetiros]);

  const fmtQ = (n) => `Q ${Number(n || 0).toFixed(2)}`;

  useEffect(() => {
    // Cargar cuenta 1
    axios.get("/api/cuentas/1").then(r => setCuenta(r.data || null)).catch(() => setCuenta(null));
    // Cargar proveedores
    axios.get("/api/proveedor").then(r => setProveedores(r.data || [])).catch(() => setProveedores([]));
    // Cargar tipos de pago
    axios.get("/api/tipo-pago").then(r => setTiposPago(r.data || [])).catch(() => setTiposPago([]));
    // Cargar totales
    axios.get("/api/pagos").then(r => {
      const total = (r.data || [])
        .filter(p => String(p.CUE_CUENTA) === '1')
        .reduce((acc, p) => acc + Number(p.PAG_TOTAL || 0), 0);
      setTotalPagos(total);
    }).catch(() => setTotalPagos(0));
    axios.get("/api/extra").then(r => {
      const total = (r.data || []).reduce((acc, e) => acc + Number(e.EXT_TOTAL || 0), 0);
      setTotalExtras(total);
    }).catch(() => setTotalExtras(0));
    axios.get("/api/retiro").then(r => {
      const total = (r.data || []).reduce((acc, t) => acc + Number(t.RET_TOTAL || 0), 0);
      setTotalRetiros(total);
    }).catch(() => setTotalRetiros(0));
  }, []);

  const refetchRetiros = async () => {
    try {
      const r = await axios.get("/api/retiro");
      const total = (r.data || []).reduce((acc, t) => acc + Number(t.RET_TOTAL || 0), 0);
      setTotalRetiros(total);
    } catch {
      // ignore
    }
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!usuarioId || !proveedorSel || !monto || !fecha || !tipoPagoSeleccionado) {
      alert("Completa todos los campos");
      return;
    }
    const montoNum = Number(monto);
    if (isNaN(montoNum) || montoNum <= 0) {
      alert("El monto debe ser mayor a cero");
      return;
    }
    if (montoNum > saldo) {
      alert("El monto excede el saldo disponible");
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    const montoNum = Number(monto);
    setSubmitting(true);
    try {
      const createRes = await axios.post('/api/retiro', {
        US_USUARIO: parseInt(usuarioId),
        PRO_PROVEEDOR: parseInt(proveedorSel),
        RET_FECHA: fecha,
        RET_TOTAL: montoNum,
        TIP_TIPO: parseInt(tipoPagoSeleccionado),
      });
      const newId = createRes.data?.RET_RETIRO;
      // If file selected, upload it to /api/retiro/evidencia/:id
      if (newId && evidenciaFile) {
        const fd = new FormData();
        fd.append('evidencia', evidenciaFile);
        try {
          await axios.post(`/api/retiro/evidencia/${newId}`, fd, { headers: { 'Content-Type': 'multipart/form-data' } });
        } catch (upErr) {
          console.error('Error subiendo evidencia:', upErr);
        }
      }
      // Actualizar saldo (recalcular retiros)
      await refetchRetiros();
      setMonto("");
      setProveedorSel("");
      setTipoPagoSeleccionado("");
      setEvidenciaFile(null);
    } catch (err) {
      console.error('Error al crear retiro', err);
      alert("Ocurrió un error al crear el retiro");
    } finally {
      setSubmitting(false);
      setShowConfirm(false);
    }
  };

  if (!esAdmin) {
    return null;
  }

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-5">
        <div className="row g-4">
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-body">
                <h4 className="card-title mb-3">Cuenta bancaria</h4>
                {cuenta ? (
                  <>
                    <div className="row mb-2">
                      <div className="col-6"><small className="text-muted">Número</small><div>{cuenta.CUE_NUMERO}</div></div>
                      <div className="col-6"><small className="text-muted">Banco</small><div>{cuenta.CUE_BANCO}</div></div>
                    </div>
                    <div className="row mb-2">
                      <div className="col-6"><small className="text-muted">Tipo</small><div>{cuenta.CUE_TIPO}</div></div>
                    </div>
                    <hr />
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-semibold">Saldo actual</span>
                      <span className={`fs-4 ${saldo >= 0 ? 'text-success' : 'text-danger'}`}>{fmtQ(saldo)}</span>
                    </div>
                    <div className="mt-2">
                      <small className="text-muted d-block">= Pagos ({fmtQ(totalPagos)}) + Extras ({fmtQ(totalExtras)}) - Retiros ({fmtQ(totalRetiros)})</small>
                    </div>
                  </>
                ) : (
                  <p className="text-muted mb-0">No se encontró la cuenta 1.</p>
                )}
              </div>
            </div>
          </div>
          <div className="col-md-6">
            <div className="card shadow">
              <div className="card-body">
                <h4 className="card-title mb-3">Nuevo Desembolso</h4>
                <form onSubmit={handleOpenConfirm}>
                  <div className="mb-3">
                    <label className="form-label">Proveedor</label>
                    <select className="form-select" value={proveedorSel} onChange={e => setProveedorSel(e.target.value)} required>
                      <option value="">Selecciona un proveedor</option>
                      {proveedores.map(p => {
                        const label = p.SER_NOMBRE ? `${p.PRO_NOMBRE} - ${p.SER_NOMBRE}` : p.PRO_NOMBRE;
                        return (
                          <option key={p.PRO_PROVEEDOR} value={p.PRO_PROVEEDOR}>{label}</option>
                        );
                      })}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Tipo de Pago</label>
                    <select className="form-select" value={tipoPagoSeleccionado} onChange={e => setTipoPagoSeleccionado(e.target.value)} required>
                      <option value="">Selecciona un tipo de pago</option>
                      {tiposPago.map(tipo => (
                        <option key={tipo.TIP_TIPO} value={tipo.TIP_TIPO}>{tipo.TIP_NOMBRE}</option>
                      ))}
                    </select>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Fecha</label>
                    <input type="date" className="form-control" value={fecha} onChange={e => setFecha(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Monto</label>
                    <input type="number" min="0" step="0.01" className="form-control" value={monto} onChange={e => setMonto(e.target.value)} required placeholder="Ingresa el monto del retiro" />
                    <small className="text-muted">Disponible: {fmtQ(saldo)}</small>
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Evidencia (imagen)</label>
                    <input type="file" accept="image/*" className="form-control" onChange={e => setEvidenciaFile(e.target.files[0] || null)} />
                    <small className="text-muted">Sube una imagen del comprobante.</small>
                  </div>
                  <div className="text-end">
                    <button disabled={submitting} type="submit" className="btn btn-primary">
                      {submitting ? 'Creando...' : 'Crear retiro'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
      <ConfirmModal
        open={showConfirm}
        title="¿Confirmar Retiro?"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        confirming={submitting}
      >
        <div className="mb-2">
          <strong>Proveedor:</strong>{' '}
          {(() => {
            const prov = proveedores.find(p => p.PRO_PROVEEDOR == proveedorSel);
            return prov ? `${prov.PRO_NOMBRE}${prov.SER_NOMBRE ? ' - ' + prov.SER_NOMBRE : ''}` : '';
          })()}
        </div>
        <div className="mb-2">
          <strong>Tipo de Pago:</strong>{' '}
          {tiposPago.find(t => t.TIP_TIPO == tipoPagoSeleccionado)?.TIP_NOMBRE || ''}
        </div>
        <div className="mb-2"><strong>Fecha:</strong> {formatDMY(fecha)}</div>
        <div className="mb-2"><strong>Monto:</strong> {fmtQ(monto)}</div>
        <div className="text-muted"><small>Saldo actual: {fmtQ(saldo)} | Después: {fmtQ((Number(saldo) - Number(monto || 0)))}</small></div>
      </ConfirmModal>
      <VersionFooter />
    </PageLayout>
  );
}

export default RetiroPage;

// Modal simple reutilizable
function ConfirmModal({ open, title, onCancel, onConfirm, children, confirmText = 'Confirmar', cancelText = 'Cancelar', confirming = false }) {
  if (!open) return null;
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
      <div style={{ maxWidth: 520, margin: '10% auto', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.2)' }}>
        <div className="p-3 border-bottom">
          <h5 className="m-0">{title}</h5>
        </div>
        <div className="p-3">
          {children}
        </div>
        <div className="p-3 border-top d-flex justify-content-end gap-2">
          <button className="btn btn-light" onClick={onCancel} disabled={confirming}>{cancelText}</button>
          <button className="btn btn-primary" onClick={onConfirm} disabled={confirming}>{confirming ? 'Procesando...' : confirmText}</button>
        </div>
      </div>
    </div>
  );
}
