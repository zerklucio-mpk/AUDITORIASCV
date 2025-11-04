import { CompletedAudit, HistorySnapshot, Question, Area, ExtinguisherArea, Extinguisher, InspectionRecord, InspectionAnswers, FirstAidKitArea, FirstAidKit, FirstAidKitAnswers } from '../types';

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

const baseHeaders = {
  'apikey': SUPABASE_ANON_KEY,
  'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
  'Content-Type': 'application/json',
};

// Cabeceras para operaciones que escriben datos (POST, DELETE, PATCH)
const writeHeaders = {
  ...baseHeaders,
  'Prefer': 'return=minimal',
};

// Cabeceras para operaciones de lectura (GET) para evitar caché
const readHeaders = {
  ...baseHeaders,
  'Cache-Control': 'no-cache, no-store, must-revalidate',
  'Pragma': 'no-cache',
  'Expires': '0',
};


async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let errorMessage = `Error de red o Supabase: ${response.status} ${response.statusText}`;
    try {
        const errorJson = await response.json();
        errorMessage = errorJson.message || errorMessage;
        console.error('Error de Supabase:', errorJson);
    } catch (e) {
        const errorText = await response.text();
        console.error('Error de Supabase (respuesta no JSON):', errorText);
    }
    throw new Error(errorMessage);
  }
  if (response.status === 204 || response.headers.get('content-length') === '0') {
    return null as T;
  }
  return response.json();
}

const isConfigured = () => SUPABASE_URL && SUPABASE_ANON_KEY && !SUPABASE_URL.includes('YOUR_SUPABASE_URL');

if (!isConfigured()) {
  const errorMsg = "Por favor, configura tu URL y clave anónima de Supabase en el archivo 'services/supabaseClient.ts'. Debes reemplazar 'YOUR_SUPABASE_URL' y 'YOUR_SUPABASE_ANON_KEY' con tus credenciales reales.";
  console.error(errorMsg);
  // Lanzar el error aquí previene que la app intente hacer llamadas a una API no configurada.
  throw new Error(errorMsg);
}


// --- Operaciones con Auditorías ---

export async function getAudits(): Promise<CompletedAudit[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/audits?select=id,audit_data,answers`, {
    headers: readHeaders,
  });
  const data = await handleResponse<any[]>(response);
  return data.map(item => ({ id: item.id, auditData: item.audit_data, answers: item.answers }));
}

export async function addAudit(audit: Omit<CompletedAudit, 'id'>): Promise<void> {
  const body = {
    audit_data: audit.auditData,
    answers: audit.answers,
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/audits`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

export async function deleteAuditsByIds(ids: string[]): Promise<void> {
    if (ids.length === 0) return;

    const response = await fetch(`${SUPABASE_URL}/rest/v1/audits?id=in.(${ids.join(',')})`, {
        method: 'DELETE',
        headers: writeHeaders,
    });
    await handleResponse<void>(response);
}

export async function deleteAllAudits(): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/audits?id=not.is.null`, {
        method: 'DELETE',
        headers: writeHeaders,
    });
    await handleResponse<void>(response);
}


// --- Operaciones con Snapshots ---

export async function getSnapshots(): Promise<HistorySnapshot[]> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/snapshots?select=*`, {
        headers: readHeaders,
    });
    return handleResponse<HistorySnapshot[]>(response);
}

export async function addSnapshot(snapshot: HistorySnapshot): Promise<void> {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/snapshots`, {
        method: 'POST',
        headers: writeHeaders,
        body: JSON.stringify(snapshot),
    });
    await handleResponse<void>(response);
}

// --- Operaciones con Datos de Configuración ---

export async function getQuestions(): Promise<Question[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/questions?select=*&is_active=eq.true&order=display_order.asc`, {
    headers: readHeaders,
  });
  return handleResponse<Question[]>(response);
}

export async function getAreas(): Promise<Area[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/areas?select=*&order=name.asc`, {
    headers: readHeaders,
  });
  return handleResponse<Area[]>(response);
}

// --- Operaciones con Áreas de Extintores ---

export async function getExtinguisherAreas(): Promise<ExtinguisherArea[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_areas?select=*&order=created_at.desc`, {
    headers: readHeaders,
  });
  return handleResponse<ExtinguisherArea[]>(response);
}

export async function addExtinguisherArea(name: string): Promise<void> {
  const body = { name };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_areas`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

export async function deleteExtinguisherArea(id: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_areas?id=eq.${id}`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}

// --- Operaciones con Extintores ---

export async function getAllExtinguishers(): Promise<Extinguisher[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguishers?select=*&order=created_at.asc`, {
    headers: readHeaders,
  });
  return handleResponse<Extinguisher[]>(response);
}

type AddExtinguisherData = {
  area_id: string;
  location: string;
  series: string;
  type: string;
  capacity: string;
};

export async function addExtinguisher(data: AddExtinguisherData): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguishers`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(data),
  });
  await handleResponse<void>(response);
}

type UpdateExtinguisherData = Omit<Extinguisher, 'id' | 'created_at' | 'area_id'>;

export async function updateExtinguisher(id: string, data: UpdateExtinguisherData): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguishers?id=eq.${id}`, {
    method: 'PATCH',
    headers: writeHeaders,
    body: JSON.stringify(data),
  });
  await handleResponse<void>(response);
}


export async function deleteExtinguisher(id: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguishers?id=eq.${id}`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}

// --- Operaciones con Inspecciones de Extintores ---

export async function getExtinguisherInspections(): Promise<InspectionRecord[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_inspections?select=*`, {
    headers: readHeaders,
  });
  return handleResponse<InspectionRecord[]>(response);
}

export async function addInspection(extinguisher_id: string, answers: InspectionAnswers): Promise<void> {
  const body: Omit<InspectionRecord, 'id' | 'created_at'> = {
    extinguisher_id,
    answers
  };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_inspections`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

export async function deleteAllInspections(): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/extinguisher_inspections?id=not.is.null`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}

// --- Operaciones con Áreas de Botiquines ---

export async function getFirstAidKitAreas(): Promise<FirstAidKitArea[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kit_areas?select=*&order=created_at.desc`, {
    headers: readHeaders,
  });
  return handleResponse<FirstAidKitArea[]>(response);
}

export async function addFirstAidKitArea(name: string): Promise<void> {
  const body = { name };
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kit_areas`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(body),
  });
  await handleResponse<void>(response);
}

export async function deleteFirstAidKitArea(id: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kit_areas?id=eq.${id}`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}

// --- Operaciones con Botiquines ---

export async function getFirstAidKits(): Promise<FirstAidKit[]> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kits?select=*&order=created_at.asc`, {
    headers: readHeaders,
  });
  return handleResponse<FirstAidKit[]>(response);
}

type AddFirstAidKitData = {
  area_id: string;
  location: string;
  inspection_data: FirstAidKitAnswers;
};

export async function addFirstAidKit(data: AddFirstAidKitData): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kits`, {
    method: 'POST',
    headers: writeHeaders,
    body: JSON.stringify(data),
  });
  await handleResponse<void>(response);
}

export async function deleteFirstAidKit(id: string): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kits?id=eq.${id}`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}

export async function deleteAllFirstAidKits(): Promise<void> {
  const response = await fetch(`${SUPABASE_URL}/rest/v1/first_aid_kits?id=not.is.null`, {
    method: 'DELETE',
    headers: writeHeaders,
  });
  await handleResponse<void>(response);
}