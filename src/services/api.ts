import { DCN, Technician, MaterialItem, TrainingRecord, DCNAttachment, ImplementationChecklist, User } from '../types';
import { INITIAL_USERS } from '../data/initialUsers';

const API_BASE = '/api';

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const errorText = await res.text();
    throw new Error(`API Error [${res.status}]: ${errorText}`);
  }
  return res.json();
}

export const api = {
  // Auth & Session
  async login(login: string, senha: string): Promise<{ success: boolean; user: User; message: string; isOffline?: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ login, senha }),
      });

      if (!res.ok) {
        let errorMsg = `Erro na autenticação (${res.status})`;
        try {
          const errData = await res.json();
          if (errData?.error) errorMsg = errData.error;
        } catch {
          // Ignore
        }
        if (res.status === 400 || res.status === 401) {
          throw new Error(errorMsg);
        }
        throw new Error(errorMsg);
      }

      return await res.json();
    } catch (networkOrServerError: any) {
      if (
        networkOrServerError.message?.includes('Formato de usuário') ||
        networkOrServerError.message?.includes('Credenciais incorretas') ||
        networkOrServerError.message?.includes('não cadastrado')
      ) {
        throw networkOrServerError;
      }

      // Fallback offline / contingência se o servidor estiver indisponível
      console.warn('[Auth API] Servidor indisponível. Acionando validação offline:', networkOrServerError.message);
      const normalized = (login || '').trim().toUpperCase();
      const offlineUser = INITIAL_USERS.find(u => u.login.toUpperCase() === normalized);

      if (!offlineUser) {
        throw new Error(`[Contingência Offline] Usuário "${normalized}" não encontrado no cache do sistema.`);
      }

      if (offlineUser.senha !== senha) {
        throw new Error('Credenciais incorretas! Verifique sua senha e tente novamente.');
      }

      const { senha: _, ...safeUser } = offlineUser;
      return {
        success: true,
        user: safeUser,
        message: 'Autenticado com sucesso em modo de contingência offline.',
        isOffline: true
      };
    }
  },

  async getUsers(): Promise<User[]> {
    try {
      const res = await fetch(`${API_BASE}/users`);
      return handleResponse<User[]>(res);
    } catch {
      return INITIAL_USERS.map(({ senha: _, ...u }) => u);
    }
  },

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
  },

  // Anexos MinIO
  async uploadAttachment(
    dcnId: string,
    file: File,
    category = 'DOCUMENTO_COMPLEMENTAR',
    uploadedBy = 'Engenharia'
  ): Promise<DCNAttachment> {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);
    formData.append('uploadedBy', uploadedBy);

    const res = await fetch(`${API_BASE}/dcns/${dcnId}/attachments`, {
      method: 'POST',
      body: formData,
    });
    return handleResponse<DCNAttachment>(res);
  },

  async deleteAttachment(dcnId: string, attachmentId: string, user = 'Engenharia'): Promise<{ success: boolean }> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/attachments/${attachmentId}?user=${encodeURIComponent(user)}`, {
      method: 'DELETE',
    });
    return handleResponse<{ success: boolean }>(res);
  },

  getAttachmentFileUrl(attachmentId: string, download = false): string {
    return `${API_BASE}/attachments/${attachmentId}/file${download ? '?download=true' : ''}`;
  }
};
