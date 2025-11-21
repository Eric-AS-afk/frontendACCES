import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import VersionFooter from '../components/VersionFooter';
import fondo from '../assets/fondo.jpeg';

function ResetPassword() {
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // try to read token from query string
    try {
      const params = new URLSearchParams(window.location.search);
      const t = params.get('token');
      if (t) setToken(t);
    } catch (e) {
      // ignore
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setStatus('');
    if (!token) return setStatus('Token requerido. Pega el token o usa el enlace del correo.');
    if (!newPassword || newPassword.length < 6) return setStatus('La contraseña debe tener al menos 6 caracteres.');
    if (newPassword !== confirmPassword) return setStatus('Las contraseñas no coinciden.');

    setLoading(true);
    try {
      const res = await axios.post('/api/usuarios/reset-password', {
        token,
        newPassword,
      });
      if (res.data && res.data.ok) {
        setStatus('Contraseña restablecida correctamente. Redirigiendo al login...');
        setTimeout(() => navigate('/login', { replace: true }), 1800);
      } else {
        setStatus(res.data && res.data.error ? String(res.data.error) : 'No se pudo restablecer la contraseña.');
      }
    } catch (err) {
      setStatus(err.response?.data?.error || String(err.message || 'Error al conectar'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-bg">
      <style>{`
        .login-bg { position: relative; min-height: 100vh; overflow: hidden; }
        .login-bg .bg-slide { 
          position: absolute; 
          inset: 0; 
          background-image: url(${fondo}), url(${fondo}); 
          background-size: auto 100%; 
          background-repeat: repeat-x; 
          background-position: 0% 50%; 
          animation: slideBackground 30s linear infinite; 
        }
        .login-bg .bg-overlay { position: absolute; inset: 0; background: rgba(19, 71, 19, 0.35); }
        .login-card { color: #D4CDAD; border: none; background: transparent !important; box-shadow: none !important; }
        .login-card .form-label { color: #D4CDAD; font-weight: 600; }
        @keyframes slideBackground { 0% { background-position: 0% 50%; } 100% { background-position: 100% 50%; } }
      `}</style>
      <div className="bg-slide" />
      <div className="bg-overlay" />
      <div className="container position-relative min-vh-100 d-flex align-items-center" style={{ zIndex: 1 }}>
        <div className="row justify-content-center w-100">
          <div className="col-12 col-md-6">
            <div className="card p-4 login-card">
              <h4 className="mb-3">Restablecer contraseña</h4>
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Token (desde el correo)</label>
                  <input
                    type="text"
                    className="form-control"
                    value={token}
                    readOnly
                    placeholder="Token (no editable)"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Nueva contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Nueva contraseña"
                    required
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Confirmar contraseña</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirmar nueva contraseña"
                    required
                  />
                </div>
                {status && <div className="alert alert-info">{status}</div>}
                <div className="d-flex justify-content-end">
                  <button type="button" className="btn btn-secondary me-2" onClick={() => navigate('/login')}>Cancelar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? 'Procesando...' : 'Restablecer contraseña'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
      <VersionFooter />
    </div>
  );
}

export default ResetPassword;
