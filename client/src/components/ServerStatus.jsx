import React, { useEffect, useState } from 'react';
import axios from 'axios';

export default function ServerStatus() {
  const [status, setStatus] = useState('checking'); // 'checking' | 'ok' | 'error'

  const check = async () => {
    setStatus('checking');
    try {
      // Intenta una petición simple al prefijo /api para detectar errores de red
      await axios.get('/api', { timeout: 3000 });
      setStatus('ok');
    } catch (err) {
      // Si hay respuesta pero con error HTTP, consideramos que el servidor respondió
      if (err.response) {
        setStatus('ok');
      } else {
        setStatus('error');
      }
    }
  };

  useEffect(() => {
    check();
    // No hacemos polling continuo por ahora; podría añadirse si lo deseas
  }, []);

  if (status === 'ok' || status === 'checking') return null;

  return (
    <div className="container mt-2">
      <div className="alert alert-danger d-flex justify-content-between align-items-center" role="alert">
        <div>
          <strong>Error de conexión:</strong> no se pudo conectar con el servidor de API.
          Verifica que esté accesible.
        </div>
        <div>
          <button className="btn btn-sm btn-outline-light" onClick={check}>Reintentar</button>
        </div>
      </div>
    </div>
  );
}
