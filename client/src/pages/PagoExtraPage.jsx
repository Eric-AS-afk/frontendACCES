
import React, { useEffect, useState } from "react";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import axios from "axios";

function PagoExtraPage() {
  const [tiposExtra, setTiposExtra] = useState([]);
  const [tiposPago, setTiposPago] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [tipoSeleccionado, setTipoSeleccionado] = useState("");
  const [tipoPagoSeleccionado, setTipoPagoSeleccionado] = useState("");
  const [fechaEvento, setFechaEvento] = useState("");
  const [fechaOcupada, setFechaOcupada] = useState(false);
  const [descripcion, setDescripcion] = useState("");
  const [costo, setCosto] = useState(0);
  const [montoPagar, setMontoPagar] = useState("");
  const [numeroBoleta, setNumeroBoleta] = useState("");
  const [evidencia, setEvidencia] = useState(null);
  const [boletaExiste, setBoletaExiste] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    axios.get("/api/tipo-extra")
      .then(res => setTiposExtra(res.data))
      .catch(() => setTiposExtra([]));
    axios.get("/api/tipo-pago")
      .then(res => setTiposPago(res.data))
      .catch(() => setTiposPago([]));
    // Cargar eventos para pintar el calendario
    axios.get('/api/evento')
      .then(res => setEventos(res.data || []))
      .catch(() => setEventos([]));
  }, []);

  useEffect(() => {
    if (tipoSeleccionado) {
      const tipo = tiposExtra.find(t => t.TIE_TIPO == tipoSeleccionado);
      setDescripcion(tipo?.TIE_DESCRIPCION || "");
      setCosto(tipo?.TIE_COSTO || 0);
      // Resetear fecha de evento si cambia a tipo que no la requiere
      if (!(tipoSeleccionado == 1 || tipoSeleccionado == 2)) {
        setFechaEvento("");
      }
    } else {
      setDescripcion("");
      setCosto(0);
      setFechaEvento("");
    }
  }, [tipoSeleccionado, tiposExtra]);

  // Verificar si la fecha seleccionada ya tiene un evento registrado
  useEffect(() => {
    const requiereFecha = (tipoSeleccionado == 1 || tipoSeleccionado == 2);
    if (!requiereFecha || !fechaEvento) {
      setFechaOcupada(false);
      return;
    }
    const selectedISO = String(fechaEvento).split('T')[0];
    const existe = (eventos || []).some(ev => {
      const iso = (ev?.EVE_FECHA ? String(ev.EVE_FECHA).split('T')[0] : '').trim();
      return iso && iso === selectedISO;
    });
    setFechaOcupada(existe);
  }, [fechaEvento, eventos, tipoSeleccionado]);

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    const usuarioId = localStorage.getItem("id");
    const requiereFechaEvento = (tipoSeleccionado == 1 || tipoSeleccionado == 2);
    if (boletaExiste) {
      alert('este numero de boleta ya fue registrado');
      return;
    }
    if (requiereFechaEvento && fechaOcupada) {
      alert("La fecha seleccionada ya tiene un evento, selecciona otra fecha.");
      return;
    }
    if (!usuarioId || !tipoSeleccionado || !numeroBoleta || !evidencia || !montoPagar || !tipoPagoSeleccionado || (requiereFechaEvento && !fechaEvento)) {
      alert("Completa todos los campos");
      return;
    }
    setShowConfirm(true);
  };

  // Verifica en backend si el numero de boleta ya existe
  const checkBoleta = async (valor) => {
    if (!valor) {
      setBoletaExiste(false);
      return;
    }
    try {
      const res = await axios.get(`/api/extra/check-codigo?codigo=${valor}`);
      const exists = res.data?.exists || false;
      setBoletaExiste(exists);
      if (exists) alert('este numero de boleta ya fue registrado');
    } catch (err) {
      console.error('Error al verificar boleta:', err);
      setBoletaExiste(false);
    }
  };

  const handleSubmit = async () => {
    const usuarioId = localStorage.getItem("id");
    const requiereFechaEvento = (tipoSeleccionado == 1 || tipoSeleccionado == 2);
    if (requiereFechaEvento && fechaOcupada) {
      alert("La fecha seleccionada ya tiene un evento, selecciona otra fecha.");
      return;
    }
    setSubmitting(true);
    try {
      // 1. Subir físicamente la evidencia y obtener el nombre generado
      let evidenciaNombre = null;
      if (evidencia) {
        const formData = new FormData();
        formData.append("evidencia", evidencia);
        const uploadRes = await axios.post(`/api/extra/upload`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });
        evidenciaNombre = uploadRes.data.filename;
      }
      // 2. Crear el registro en SIE_EXTRA con el nombre generado
      const extraData = {
        EXT_CODIGO: parseInt(numeroBoleta),
        US_USUARIO: parseInt(usuarioId),
        EXT_FECHA: new Date().toISOString().split('T')[0],
        TIE_TIPO: parseInt(tipoSeleccionado),
        EXT_TOTAL: parseFloat(montoPagar),
        EXT_EVIDENCIA: evidenciaNombre,
        TIP_TIPO: parseInt(tipoPagoSeleccionado),
        EXT_FECHA_EVENTO: (requiereFechaEvento ? fechaEvento : null)
      };
      const resp = await axios.post("/api/extra", extraData);
      // Inserción secundaria a SIE_EVENTO si aplica
      if (requiereFechaEvento && resp?.data?.id) {
        try {
          await axios.post('/api/evento', {
            EXT_EXTRA: resp.data.id,
            EVE_FECHA: fechaEvento
          });
        } catch (err2) {
          console.error('Error al registrar evento:', err2);
        }
      }
    } catch (err) {
      console.error("Error al registrar pago extra:", err);
    } finally {
      window.location.reload();
    }
  };

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-5">
        <div className="card shadow p-4">
          <h2 className="mb-3">Pagos Extras</h2>
          <form onSubmit={handleOpenConfirm}>
            <div className="row">
              <div className="col-md-8">
                <div className="mb-3">
                  <label className="form-label">Tipo de Servicio Extra</label>
                  <select className="form-select" value={tipoSeleccionado} onChange={e => setTipoSeleccionado(e.target.value)} required>
                    <option value="">Selecciona un servicio</option>
                    {tiposExtra.map(tipo => (
                      <option key={tipo.TIE_TIPO} value={tipo.TIE_TIPO}>{tipo.TIE_NOMBRE}</option>
                    ))}
                  </select>
                </div>
                <div className="mb-3">
                  <label className="form-label">Descripción</label>
                  <input type="text" className="form-control" value={descripcion} disabled />
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
                {(tipoSeleccionado == 1 || tipoSeleccionado == 2) && (
                  <div className="mb-3">
                    <label className="form-label">Indique la fecha del evento</label>
                    <input type="date" className="form-control" value={fechaEvento} onChange={e => setFechaEvento(e.target.value)} required />
                    {fechaEvento && fechaOcupada && (
                      <div className="form-text" style={{ color: '#dc3545', fontWeight: 600 }}>
                        Ya existe un evento registrado en esta fecha. Selecciona otra fecha.
                      </div>
                    )}
                  </div>
                )}
                <div className="mb-3">
                  <label className="form-label">Número de Boleta</label>
                  <input type="number" className="form-control" value={numeroBoleta} onChange={e => { setNumeroBoleta(e.target.value); if (boletaExiste) setBoletaExiste(false); }} onBlur={e => checkBoleta(e.target.value)} required placeholder="Ingresa el número de boleta" />
                  {boletaExiste && (
                    <div className="form-text text-danger" style={{ fontWeight: 600 }}>
                      Este número de boleta ya fue registrado
                    </div>
                  )}
                </div>
                <div className="mb-3">
                  <label className="form-label">Monto a Pagar</label>
                  <input type="number" step="0.01" min="0" className="form-control" value={montoPagar} onChange={e => setMontoPagar(e.target.value)} required placeholder="Ingresa el monto a pagar" />
                </div>
                <div className="mb-3">
                  <label className="form-label">Evidencia de Pago (Imagen)</label>
                  <input type="file" className="form-control" accept="image/*" onChange={e => setEvidencia(e.target.files[0])} required />
                  <small className="text-muted">Formatos aceptados: JPG, PNG, PDF</small>
                </div>
              </div>
              <div className="col-md-4">
                <div className="card bg-light">
                  <div className="card-body text-center">
                    <h5 className="card-title">Monto</h5>
                    <h2 className="text-info">Q {parseFloat(costo).toFixed(2)}</h2>
                    <small className="text-muted d-block mb-2">Este es el valor a pagar</small>
                    <hr />
                    <p className="mb-1"><small>Fecha: {new Date().toISOString().split('T')[0]}</small></p>
                  </div>
                </div>
                {(tipoSeleccionado == 1 || tipoSeleccionado == 2) && (
                  <div className="card mt-3">
                    <div className="card-body">
                      <h6 className="card-title mb-2">Calendario de eventos</h6>
                      <CalendarioEventos eventos={eventos} />
                      <div className="mt-2 d-flex gap-3">
                        <span className="badge bg-primary">Kiosco</span>
                        <span className="badge bg-warning text-dark">Parqueo</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <div className="text-center mt-4">
              <button
                type="submit"
                className="btn btn-primary btn-lg px-5"
                disabled={submitting || boletaExiste || ((tipoSeleccionado == 1 || tipoSeleccionado == 2) && fechaOcupada)}
              >
                {submitting ? "Procesando..." : "Registrar Pago"}
              </button>
            </div>
          </form>
        </div>
      </div>
      <ConfirmModal
        open={showConfirm}
        title="¿Confirmar Pago?"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        confirming={submitting}
      >
        <div className="mb-2"><strong>Usuario:</strong> {localStorage.getItem('id')}</div>
        <div className="mb-2"><strong>Tipo Extra:</strong> {tiposExtra.find(t => t.TIE_TIPO == tipoSeleccionado)?.TIE_NOMBRE || ''}</div>
        <div className="mb-2"><strong>Tipo de Pago:</strong> {tiposPago.find(t => t.TIP_TIPO == tipoPagoSeleccionado)?.TIP_NOMBRE || ''}</div>
        {(tipoSeleccionado == 1 || tipoSeleccionado == 2) && (
          <div className="mb-2"><strong>Fecha del Evento:</strong> {fechaEvento}</div>
        )}
        <div className="mb-2"><strong>Número de Boleta:</strong> {numeroBoleta}</div>
        <div className="mb-2"><strong>Costo de Referencia:</strong> Q {parseFloat(costo).toFixed(2)}</div>
        <div className="mb-2"><strong>Monto a Pagar:</strong> Q {parseFloat(montoPagar || 0).toFixed(2)}</div>
        <div className="mb-2"><strong>Evidencia:</strong> {evidencia?.name}</div>
      </ConfirmModal>
      <VersionFooter />
    </PageLayout>
  );
}

export default PagoExtraPage;

// Calendario con navegación de meses y celdas coloreadas por tipo
function CalendarioEventos({ eventos }) {
  const mesesEs = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const [current, setCurrent] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
    });

  const year = current.getFullYear();
  const month = current.getMonth(); // 0-11
  const firstDay = new Date(year, month, 1);
  const startWeekday = firstDay.getDay(); // 0=Domingo
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const goPrev = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  const goNext = () => setCurrent(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));

  // Mapa de fecha ISO -> tipos presentes ese día
  const map = new Map();
  (eventos || []).forEach(ev => {
    const iso = (ev.EVE_FECHA ? String(ev.EVE_FECHA).split('T')[0] : '').trim();
    if (!iso) return;
    const arr = map.get(iso) || [];
    if (ev.TIE_TIPO === 1 || ev.TIE_TIPO === 2) {
      if (!arr.includes(ev.TIE_TIPO)) arr.push(ev.TIE_TIPO);
      map.set(iso, arr);
    }
  });

  const weeks = [];
  let day = 1;
  for (let row = 0; row < 6; row++) {
    const cells = [];
    for (let col = 0; col < 7; col++) {
      if (row === 0 && col < startWeekday) {
        cells.push(<td key={col} className="bg-light" style={{ height: 60 }} />);
        continue;
      }
      if (day > daysInMonth) {
        cells.push(<td key={col} style={{ height: 60 }} />);
        continue;
      }
      const iso = `${year}-${String(month + 1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const tipos = map.get(iso) || [];
      const has1 = tipos.includes(1);
      const has2 = tipos.includes(2);
      let bgStyle = {};
      let textColor = '#212529';
      if (has1 && has2) {
        bgStyle = { background: 'linear-gradient(135deg, #0d6efd 50%, #ffc107 50%)' };
        textColor = '#212529';
      } else if (has1) {
        bgStyle = { backgroundColor: '#0d6efd' };
        textColor = '#ffffff';
      } else if (has2) {
        bgStyle = { backgroundColor: '#ffc107' };
        textColor = '#212529';
      }
      cells.push(
        <td key={col} className="align-top" style={{ width: '14.28%', height: 60, ...bgStyle, color: textColor }}>
          <div className="d-flex justify-content-end px-1">
            <small style={{ opacity: 0.9 }}>{day}</small>
          </div>
        </td>
      );
      day++;
    }
    weeks.push(<tr key={row}>{cells}</tr>);
    if (day > daysInMonth) break;
  }

  return (
    <div className="table-responsive">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goPrev}>&laquo;</button>
        <strong>{mesesEs[month]} {year}</strong>
        <button type="button" className="btn btn-sm btn-outline-secondary" onClick={goNext}>&raquo;</button>
      </div>
      <table className="table table-sm table-bordered mb-0">
        <thead>
          <tr className="table-light">
            <th className="text-center">Dom</th>
            <th className="text-center">Lun</th>
            <th className="text-center">Mar</th>
            <th className="text-center">Mié</th>
            <th className="text-center">Jue</th>
            <th className="text-center">Vie</th>
            <th className="text-center">Sáb</th>
          </tr>
        </thead>
        <tbody>
          {weeks}
        </tbody>
      </table>
    </div>
  );
}

// Modal de confirmación para Pago Extra
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
