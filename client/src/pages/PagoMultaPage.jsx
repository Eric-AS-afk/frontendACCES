import React, { useEffect, useState } from "react";
import HeaderBar from "../components/HeaderBar";
import VersionFooter from "../components/VersionFooter";
import PageLayout from "../components/PageLayout";
import axios from "axios";
import ImageModal from '../components/ImageModal';

function PagoMultaPage() {
  const [loading, setLoading] = useState(false);
  const [consultado, setConsultado] = useState(false);
  const [multas, setMultas] = useState([]);
  const [pendingMultas, setPendingMultas] = useState([]);
  const [selectedPam, setSelectedPam] = useState(null);
  const [numeroBoleta, setNumeroBoleta] = useState("");
  const [tipoPago, setTipoPago] = useState("");
  const [evidencia, setEvidencia] = useState(null);
  const [tiposPago, setTiposPago] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  // Admin controls
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [usersList, setUsersList] = useState([]);
  const [multasList, setMultasList] = useState([]);
  const [allPagoMultas, setAllPagoMultas] = useState([]);
  const [viewFilterMultaId, setViewFilterMultaId] = useState("");
  const [viewFilterEstado, setViewFilterEstado] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [modalFile, setModalFile] = useState('');

  // Add form state
  const [addUserId, setAddUserId] = useState("");
  const [addMultaId, setAddMultaId] = useState("");
  const [addValor, setAddValor] = useState("");

  const tipoId = (localStorage.getItem('tipo_id') || '').toString();
  const adminAllowed = ['1', '2'].includes(tipoId);
  const juntaAllowed = ['1', '2', '4'].includes(tipoId);

  // Helper para mostrar fecha DD/MM/YYYY
  const formatDMY = (iso) => {
    if (!iso) return '';
    const s = String(iso);
    const base = s.includes('T') ? s.split('T')[0] : s;
    const [y, m, d] = (base || '').split('-');
    if (y && m && d) return `${d.padStart(2,'0')}/${m.padStart(2,'0')}/${y}`;
    return base;
  };

  useEffect(() => {
    axios.get("/api/tipo-pago")
      .then(res => setTiposPago(res.data))
      .catch(err => console.error("Error al obtener tipos de pago:", err));
  }, []);

  const consultarMultas = async () => {
    setLoading(true);
    setConsultado(true);
    try {
      const userId = localStorage.getItem("id");
      const res = await axios.get(`/api/pago-multa`);
      const all = res.data || [];
      const mine = all.filter(m => String(m.US_USUARIO) === String(userId));
      setMultas(mine);
      const pendientes = mine.filter(m => (m.PAM_ESTADO || '').toString().toLowerCase() === 'pendiente');
      setPendingMultas(pendientes);
      setSelectedPam(pendientes[0] || null);
    } catch (err) {
      console.error('Error al consultar multas:', err);
      setMultas([]);
      setPendingMultas([]);
      setSelectedPam(null);
    } finally {
      setLoading(false);
    }
  };

  // --- Admin helpers ---
  const fetchUsersAndMultas = async () => {
    try {
      const [uRes, mRes] = await Promise.all([axios.get('/api/usuarios'), axios.get('/api/multa')]);
      // Exclude users of tipo 1 from the list used to create multas
      const allUsers = uRes.data || [];
      const filtered = (Array.isArray(allUsers) ? allUsers : []).filter(u => {
        const tipo = String(u?.TIP_TIPO_USUARIO ?? u?.TIP_TIPO ?? '');
        return tipo !== '1';
      });
      setUsersList(filtered);
      setMultasList(mRes.data || []);
    } catch (err) {
      console.error('Error fetching users or multas:', err);
    }
  };

  const openAddModal = async () => {
    await fetchUsersAndMultas();
    setAddUserId('');
    setAddMultaId('');
    setAddValor('');
    setShowAddModal(true);
  };

  const handleCreatePagoMulta = async (e) => {
    e.preventDefault();
    if (!addUserId || !addMultaId || !addValor) {
      alert('Completa todos los campos');
      return;
    }
    try {
      const payload = {
        MUL_MULTA: parseInt(addMultaId),
        US_USUARIO: parseInt(addUserId),
        PAM_VALOR: parseFloat(addValor),
        TIP_TIPO: null,
        PAM_BOLETA: null,
        PAM_EVIDENCIA: null,
        PAM_ESTADO: 'pendiente'
      };
      await axios.post('/api/pago-multa', payload);
      alert('Multa añadida correctamente');
      setShowAddModal(false);
    } catch (err) {
      console.error('Error creando pago-multa:', err);
      alert('Error creando multa', err);
    }
  };

  const openViewModal = async () => {
    try {
      const res = await axios.get('/api/pago-multa');
      setAllPagoMultas(res.data || []);
      setViewFilterMultaId("");
      setViewFilterEstado("");
      // also fetch multas for description mapping
      if (multasList.length === 0) {
        const mRes = await axios.get('/api/multa');
        setMultasList(mRes.data || []);
      }
      setShowViewModal(true);
    } catch (err) {
      console.error('Error fetching pago-multa list:', err);
      alert('Error cargando multas');
    }
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (!selectedPam) {
      alert('Selecciona una multa pendiente');
      return;
    }
    if (!numeroBoleta || !tipoPago || !evidencia) {
      alert('Completa todos los campos');
      return;
    }
    setShowConfirm(true);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      const id = selectedPam.pam_pago_multa;

      // 1) Subir evidencia primero
      if (!evidencia) {
        alert('Debes adjuntar la evidencia antes de continuar');
        setSubmitting(false);
        return;
      }
      const formData = new FormData();
      formData.append('evidencia', evidencia);
      const uploadRes = await axios.post(`/api/pago-multa/evidencia/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      const filename = uploadRes.data?.filename;
      if (!filename) {
        throw new Error('No se recibió nombre de archivo desde el servidor');
      }

      // 2) Si upload OK, marcar la multa como pagada con el nombre de archivo
      const payload = {
        MUL_MULTA: selectedPam.MUL_MULTA,
        US_USUARIO: selectedPam.US_USUARIO,
        PAM_VALOR: selectedPam.PAM_VALOR,
        TIP_TIPO: parseInt(tipoPago),
        PAM_BOLETA: numeroBoleta,
        PAM_EVIDENCIA: filename,
        PAM_ESTADO: 'pagado'
      };

      await axios.put(`/api/pago-multa/${id}`, payload);

      alert('Pago registrado correctamente');
      window.location.reload();
    } catch (err) {
      console.error('Error al registrar pago de multa:', err);
      alert('Error al registrar pago: ' + (err.message || ''));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <PageLayout>
      <HeaderBar />
      <div className="container mt-5">
        <div className="card shadow p-4 mb-4">
          <h4>Consulta tus Multas</h4>
          <p>Presiona el botón para verificar si tienes multas registradas a tu casa.</p>
          <div>
            <button className="btn btn-primary me-2" onClick={consultarMultas} disabled={loading}>
              {loading ? 'Consultando...' : 'Consultar'}
            </button>
            {adminAllowed && (
              <>
                <button className="btn btn-success me-2" onClick={openAddModal}>Añadir Multa</button>
                
              </>
            )}
            {juntaAllowed && (
              <>
                <button className="btn btn-outline-secondary" onClick={openViewModal}>Visualizar Todas las Multas</button>
              </>
            )}
          </div>
        </div>

        {consultado && !loading && (
          <>
            {pendingMultas.length === 0 ? (
              <div className="alert alert-success">No Tienes Multas</div>
            ) : (
              <div className="card shadow p-4">
                <h3 className="mb-4">Registrar Pago de Multa</h3>
                <form onSubmit={handleOpenConfirm}>
                  <div className="row">
                    <div className="col-md-8">
                      <div className="mb-3">
                        <label className="form-label">Selecciona Multa Pendiente</label>
                        <select className="form-select" value={selectedPam?.pam_pago_multa || ''} onChange={(e) => {
                          const id = e.target.value;
                          const found = pendingMultas.find(p => String(p.pam_pago_multa) === String(id));
                          setSelectedPam(found || null);
                        }}>
                          {pendingMultas.map(p => (
                            <option key={p.pam_pago_multa} value={p.pam_pago_multa}>
                              {p.MUL_NOMBRE || 'Multa'} - Q {parseFloat(p.PAM_VALOR || 0).toFixed(2)} - {p.pam_fecha || ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Número de Boleta</label>
                        <input type="text" className="form-control" value={numeroBoleta} onChange={e => setNumeroBoleta(e.target.value)} required />
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Tipo de Pago</label>
                        <select className="form-select" value={tipoPago} onChange={e => setTipoPago(e.target.value)} required>
                          <option value="">Selecciona un Tipo</option>
                          {tiposPago.map(t => (
                            <option key={t.TIP_TIPO} value={t.TIP_TIPO}>{t.TIP_NOMBRE}</option>
                          ))}
                        </select>
                      </div>

                      <div className="mb-3">
                        <label className="form-label">Evidencia de Pago</label>
                        <input type="file" className="form-control" accept="image/*,application/pdf" onChange={e => setEvidencia(e.target.files[0])} required />
                        <small className="text-muted">Formatos: JPG, PNG, PDF</small>
                      </div>
                    </div>

                    <div className="col-md-4">
                      <div className="card bg-light">
                        <div className="card-body text-center">
                          <h5 className="card-title">Valor a Pagar</h5>
                          <h2 className="text-danger">Q {selectedPam ? parseFloat(selectedPam.PAM_VALOR || 0).toFixed(2) : '0.00'}</h2>
                          <hr />
                          <p className="mb-1"><small>Estado: {selectedPam?.PAM_ESTADO || ''}</small></p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="text-center mt-4">
                    <button type="submit" className="btn btn-primary btn-lg px-5" disabled={submitting}>
                      {submitting ? 'Procesando...' : 'Registrar Pago'}
                    </button>
                  </div>
                </form>
              </div>
            )}
          </>
        )}

      {/* Add Multa Modal (admin) */}
      {showAddModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div style={{ maxWidth: 820, margin: '6% auto', background: '#fff', borderRadius: 8, overflow: 'hidden', boxShadow: '0 10px 30px rgba(0,0,0,.2)' }}>
            <div className="p-3 border-bottom"><h5 className="m-0">Añadir Multa</h5></div>
            <div className="p-3">
              <form onSubmit={handleCreatePagoMulta}>
                <div className="row">
                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Selecciona Usuario</label>
                      <select className="form-select" value={addUserId} onChange={e => setAddUserId(e.target.value)} required>
                        <option value="">Selecciona</option>
                        {usersList.map(u => (
                          <option key={u.US_USUARIO} value={u.US_USUARIO}>{u.US_NOMBRE}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Selecciona Multa</label>
                      <select className="form-select" value={addMultaId} onChange={e => setAddMultaId(e.target.value)} required>
                        <option value="">Selecciona</option>
                        {multasList.map(m => (
                          <option key={m.MUL_MULTA} value={m.MUL_MULTA}>{m.MUL_CODIGO} - {m.MUL_NOMBRE}</option>
                        ))}
                      </select>
                    </div>

                    <div className="mb-3">
                      <label className="form-label">Valor de la multa</label>
                      <input type="number" className="form-control" value={addValor} onChange={e => setAddValor(e.target.value)} required />
                    </div>
                  </div>

                  <div className="col-md-6">
                    <div className="mb-3">
                      <label className="form-label">Información del Usuario Seleccionado</label>
                      <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: 4 }}>
                        {addUserId ? (
                          (() => {
                            const u = usersList.find(x => String(x.US_USUARIO) === String(addUserId));
                            return u ? (
                              <div>
                                <div><strong>Nombre:</strong> {u.US_NOMBRE}</div>
                                <div><strong>Teléfono:</strong> {u.US_TELEFONO || '-'}</div>
                                <div><strong>Correo:</strong> {u.US_CORREO || '-'}</div>
                              </div>
                            ) : <div>No encontrado</div>;
                          })()
                        ) : <div>Selecciona un Usuario</div>}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <label className="form-label">Información de la Multa Seleccionada</label>
                      <div style={{ padding: '0.5rem', background: '#f8f9fa', borderRadius: 4 }}>
                        {addMultaId ? (
                          (() => {
                            const m = multasList.find(x => String(x.MUL_MULTA) === String(addMultaId));
                            return m ? (
                              <div>
                                <div><strong>Código:</strong> {m.MUL_CODIGO}</div>
                                <div><strong>Nombre:</strong> {m.MUL_NOMBRE}</div>
                                <div><strong>Descripción:</strong> {m.MUL_DESCRIPCION || '-'}</div>
                              </div>
                            ) : <div>No Encontrada</div>;
                          })()
                        ) : <div>Selecciona una Multa</div>}
                      </div>
                    </div>

                    
                  </div>
                </div>

                <div className="d-flex justify-content-end gap-2 mt-3">
                  <button type="button" className="btn btn-light" onClick={() => setShowAddModal(false)}>Cancelar</button>
                  <button type="submit" className="btn btn-primary">Crear Multa</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* View All Modal (admin) */}
      {showViewModal && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div style={{ maxWidth: '95%', margin: '3% auto', background: '#fff', borderRadius: 8, overflow: 'auto', boxShadow: '0 10px 30px rgba(0,0,0,.2)', maxHeight: '90vh' }}>
            <div className="p-3 border-bottom d-flex justify-content-between align-items-center">
              <h5 className="m-0">Todas las Multas</h5>
              <button className="btn btn-light" onClick={() => setShowViewModal(false)}>Cerrar</button>
            </div>
            <div className="p-3">
              <div className="mb-3 d-flex gap-2 align-items-center">
                <div>
                  <label className="form-label mb-1">Filtrar por Multa</label>
                  <select className="form-select" value={viewFilterMultaId} onChange={e => setViewFilterMultaId(e.target.value)}>
                    <option value="">Todas</option>
                    {multasList.map(m => (
                      <option key={m.MUL_MULTA} value={m.MUL_MULTA}>{m.MUL_CODIGO} - {m.MUL_NOMBRE}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="form-label mb-1">Filtrar por Estado</label>
                  <select className="form-select" value={viewFilterEstado} onChange={e => setViewFilterEstado(e.target.value)}>
                    <option value="">Todos</option>
                    <option value="pendiente">Pendiente</option>
                    <option value="pagado">Pagado</option>
                  </select>
                </div>
              </div>

              <table className="table table-striped table-hover">
                <thead>
                  <tr>
                    <th>Boleta</th>
                    <th>Multa</th>
                    <th>Usuario</th>
                    <th>Valor</th>
                    <th>Estado</th>
                    <th>Fecha</th>
                    <th>Evidencia</th>
                  </tr>
                </thead>
                <tbody>
                  {allPagoMultas
                    .filter(p => {
                      if (viewFilterMultaId && String(p.MUL_MULTA) !== String(viewFilterMultaId)) return false;
                      if (viewFilterEstado && (String(p.PAM_ESTADO || '').toLowerCase() !== String(viewFilterEstado))) return false;
                      return true;
                    })
                    .map(p => {
                      const m = multasList.find(x => String(x.MUL_MULTA) === String(p.MUL_MULTA));
                      const estado = (p.PAM_ESTADO || '').toString().toLowerCase();
                      const estadoClass = estado === 'pendiente' ? 'text-warning' : (estado === 'pagado' ? 'text-success' : '');
                      return (
                        <tr key={p.pam_pago_multa}>
                          <td>{p.PAM_BOLETA || '-'}</td>
                          <td>{m?.MUL_NOMBRE || p.MUL_NOMBRE || '-'}</td>
                          <td>{p.US_NOMBRE || '-'}</td>
                          <td>Q {parseFloat(p.PAM_VALOR || 0).toFixed(2)}</td>
                          <td className={estadoClass} style={{ fontWeight: 700 }}>{p.PAM_ESTADO || '-'}</td>
                          <td>{formatDMY(p.PAM_FECHA)}</td>
                          <td>
                            {p.PAM_EVIDENCIA ? (
                              <button className="btn btn-link p-0" onClick={() => { setModalFile(p.PAM_EVIDENCIA); setModalOpen(true); }} title={p.PAM_EVIDENCIA}>
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
            </div>
          </div>
        </div>
      )}
      </div>

      <ConfirmModal
        open={showConfirm}
        title="Confirmar pago de multa"
        onCancel={() => setShowConfirm(false)}
        onConfirm={handleSubmit}
        confirming={submitting}
      >
        <div className="mb-2"><strong>Multa:</strong> {selectedPam?.MUL_NOMBRE || ''}</div>
        <div className="mb-2"><strong>Número de Boleta:</strong> {numeroBoleta}</div>
        <div className="mb-2"><strong>Tipo de Pago:</strong> {tiposPago.find(t => t.TIP_TIPO == tipoPago)?.TIP_NOMBRE || ''}</div>
        <div className="mb-2"><strong>Valor:</strong> Q {selectedPam ? parseFloat(selectedPam.PAM_VALOR || 0).toFixed(2) : '0.00'}</div>
        <div className="mb-2"><strong>Evidencia:</strong> {evidencia?.name}</div>
      </ConfirmModal>
      <ImageModal filename={modalFile} show={modalOpen} onClose={() => setModalOpen(false)} />
      <VersionFooter />
    </PageLayout>
  );
}

export default PagoMultaPage;

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
