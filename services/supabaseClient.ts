import { CompletedAudit, HistorySnapshot } from '../types';

// --- PASO CRÍTICO DE CONFIGURACIÓN ---
// Por favor, reemplaza los siguientes dos valores con tu URL y tu clave anónima (public) de Supabase.
// Puedes encontrarlos en tu proyecto de Supabase -> Project Settings -> API.

// EJEMPLO DE CÓMO DEBERÍA QUEDAR:
// const SUPABASE_URL = 'https://abcdefghijklmonpqr.supabase.co';
// const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1vbnBxciIsImV4cCI6MTk4MjQyODk5OX0.XYZ...';

const SUPABASE_URL = 'https://vhfefzljhfrseqvzalyl.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZoZmVmemxqaGZyc2VxdnphbHlsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjE3Njc3NjQsImV4cCI6MjA3NzM0Mzc2NH0.18WH_FR6XYUf0BFZv31nLxxHx2Maxru7QXbBaJJ3opU';

// El resto del código funcionará automáticamente una vez que configures las dos líneas de arriba.


// --- Lógica del Cliente de Supabase ---

const headers = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=minimal',
};

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const errorText = await response.text();
    console.error('Error de Supabase:', errorText);
    throw new Error(`Error de red o Supabase: ${response.status} ${response.statusText}`);
  }
  // Si la respuesta no tiene contenido (como en DELETE o POST con return=minimal), no intentes parsear JSON.
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null as T;
  }
  return response.json();
}

const isConfigured = () => !SUPABASE_URL.includes('PON_TU_URL');

// --- Operaciones con Auditorías ---

export async function getAudits(): Promise<CompletedAudit[]> {
  if (!isConfigured()) return [];

  const response = await fetch(`${SUPABASE_URL}/rest/v1/audits?select=*`, {
    headers: { ...headers, 'Content-Type': undefined }, // GET no necesita Content-Type
  });
  const data = await handleResponse<any[]>(response);
  return data.map(item => ({ auditData: item.audit_data, answers: item.answers }));
}

export async function addAudit(audit: CompletedAudit): Promise<void> {
  if (!isConfigured()) throw new Error("Supabase no está configurado.");
  
  const body = {
    audit_data: audit.auditData,
    answers: audit.answers,
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/audits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

export async function deleteAllAudits(): Promise<void> {
    if (!isConfigured()) throw new Error("Supabase no está configurado.");

    const response = await fetch(`${SUPABASE_URL}/rest/v1/audits?id=not.is.null`, {
        method: 'DELETE',
        headers,
    });
    await handleResponse<void>(response);
}


// --- Operaciones con Snapshots ---

export async function getSnapshots(): Promise<HistorySnapshot[]> {
    if (!isConfigured()) return [];

    const response = await fetch(`${SUPABASE_URL}/rest/v1/snapshots?select=*`, {
        headers: { ...headers, 'Content-Type': undefined },
    });
    return handleResponse<HistorySnapshot[]>(response);
}

export async function addSnapshot(snapshot: HistorySnapshot): Promise<void> {
    if (!isConfigured()) throw new Error("Supabase no está configurado.");

    const response = await fetch(`${SUPABASE_URL}/rest/v1/snapshots`, {
        method: 'POST',
        headers,
        body: JSON.stringify(snapshot),
    });
    await handleResponse<void>(response);
}