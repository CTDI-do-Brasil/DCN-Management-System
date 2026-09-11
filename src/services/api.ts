import { DCN, Technician, MaterialItem, TrainingRecord, DCNAttachment, ImplementationChecklist } from '../types';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

export const api = {
  async checkHealth(): Promise<{ status: string; database: string }> {
    const res = await fetch(`${API_BASE}/health`);
    return handleResponse(res);
  },

  // DCNs
  async getDCNs(): Promise<DCN[]> {
    const res = await fetch(`${API_BASE}/dcns`);
    return handleResponse<DCN[]>(res);
  },

  async getDCN(id: string): Promise<DCN> {
    const res = await fetch(`${API_BASE}/dcns/${id}`);
    return handleResponse<DCN>(res);
  },

  async createDCN(dcn: Omit<DCN, 'id' | 'auditTrail'>): Promise<DCN> {
    const res = await fetch(`${API_BASE}/dcns`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dcn),
    });
    return handleResponse<DCN>(res);
  },

  async updateDCN(id: string, updates: Partial<DCN>, auditComment?: string, user?: string, userRole?: string): Promise<DCN> {
    const res = await fetch(`${API_BASE}/dcns/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...updates, auditComment, user, userRole }),
    });
    return handleResponse<DCN>(res);
  },

  async deleteDCN(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/dcns/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  // Materials
  async addMaterial(dcnId: string, item: Omit<MaterialItem, 'id'>): Promise<MaterialItem> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/materials`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(item),
    });
    return handleResponse<MaterialItem>(res);
  },

  async updateMaterial(dcnId: string, materialId: string, updates: Partial<MaterialItem>): Promise<MaterialItem> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/materials/${materialId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<MaterialItem>(res);
  },

  // Checklists
  async addChecklistItem(dcnId: string, title: string, mandatory = true, responsible = 'Engenharia'): Promise<ImplementationChecklist> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/checklists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, mandatory, responsible, completed: false }),
    });
    return handleResponse<ImplementationChecklist>(res);
  },

  async updateChecklistItem(dcnId: string, checklistId: string, updates: Partial<ImplementationChecklist>): Promise<ImplementationChecklist> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/checklists/${checklistId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<ImplementationChecklist>(res);
  },

  // Technicians
  async getTechnicians(): Promise<Technician[]> {
    const res = await fetch(`${API_BASE}/technicians`);
    return handleResponse<Technician[]>(res);
  },

  async createTechnician(tech: Omit<Technician, 'id' | 'createdAt' | 'trainedDCNIds'>): Promise<Technician> {
    const res = await fetch(`${API_BASE}/technicians`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(tech),
    });
    return handleResponse<Technician>(res);
  },

  async updateTechnician(id: string, updates: Partial<Technician>): Promise<Technician> {
    const res = await fetch(`${API_BASE}/technicians/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updates),
    });
    return handleResponse<Technician>(res);
  },

  async deleteTechnician(id: string): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/technicians/${id}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  }
};
