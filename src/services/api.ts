import {
  DCN,
  Technician,
  MaterialItem,
  TrainingRecord,
  DCNAttachment,
  ImplementationChecklist,
  User,
  UserRole,
  NotificationSettings,
  NotificationLogEntry,
  NotificationRuleType
} from '../types';
import { INITIAL_USERS, LEGACY_DEMO_USER_IDS, LEGACY_DEMO_USER_LOGINS, LocalAuthUser } from '../data/initialUsers';
import { DEFAULT_NOTIFICATION_SETTINGS, createNotificationLogEntry } from '../utils/notificationTemplates';

const API_BASE = '/api';
const LOCAL_USERS_STORAGE_KEY = 'dcn_users_local_cache_v2';
const LEGACY_USERS_STORAGE_KEY = 'dcn_users_local_cache_v1';
const LOCAL_NOTIF_SETTINGS_KEY = 'dcn_notification_settings_v1';
const LOCAL_NOTIF_LOGS_KEY = 'dcn_notification_logs_v1';

function getLocalCachedUsers(): LocalAuthUser[] {
  try {
    localStorage.removeItem(LEGACY_USERS_STORAGE_KEY);
    const raw = localStorage.getItem(LOCAL_USERS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed.filter(
          (u: LocalAuthUser) =>
            !LEGACY_DEMO_USER_IDS.includes(u.id) &&
            !LEGACY_DEMO_USER_LOGINS.includes((u.login || '').toUpperCase())
        );
        if (filtered.length > 0) {
          return filtered;
        }
      }
    }
  } catch {
    // ignore
  }
  return [...INITIAL_USERS];
}

function saveLocalCachedUsers(users: LocalAuthUser[]) {
  try {
    localStorage.setItem(LOCAL_USERS_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // ignore
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorMessage = `API Error [${res.status}]`;
    try {
      const text = await res.text();
      try {
        const errData = JSON.parse(text);
        if (errData?.error) {
          errorMessage = errData.error;
        } else if (errData?.message) {
          errorMessage = errData.message;
        }
      } catch {
        if (text && text.trim()) {
          errorMessage = text.length > 200 ? `${errorMessage}: ${text.slice(0, 200)}...` : text;
        }
      }
    } catch {
      // ignore
    }
    throw new Error(errorMessage);
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
      const localUsers = getLocalCachedUsers();
      const offlineUser = localUsers.find(u => u.login.toUpperCase() === normalized);

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
      return await handleResponse<User[]>(res);
    } catch {
      return getLocalCachedUsers().map(({ senha: _, ...u }) => u);
    }
  },

  async createUser(payload: { login: string; nome: string; email?: string; role: UserRole; senha: string }): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await handleResponse<User>(res);
    } catch (err: any) {
      if (
        err.message?.includes('Já existe') ||
        err.message?.includes('Formato de login') ||
        err.message?.includes('obrigatório') ||
        err.message?.includes('senha válida')
      ) {
        throw err;
      }
      // Contingência offline se backend não estiver rodando localmente
      const localUsers = getLocalCachedUsers();
      const normalizedLogin = payload.login.trim().toUpperCase();
      if (localUsers.some(u => u.login.toUpperCase() === normalizedLogin)) {
        throw new Error(`Já existe um usuário cadastrado com o login "${normalizedLogin}".`);
      }
      const now = new Date().toISOString();
      const newUser: LocalAuthUser = {
        id: `user-${Date.now()}`,
        login: normalizedLogin,
        nome: payload.nome.trim(),
        email: payload.email?.trim() || `${normalizedLogin.toLowerCase()}@ctdi.com`,
        role: payload.role,
        senha: payload.senha,
        createdAt: now,
        updatedAt: now
      };
      saveLocalCachedUsers([...localUsers, newUser]);
      const { senha: _, ...safeUser } = newUser;
      return safeUser;
    }
  },

  async updateUser(id: string, payload: { login?: string; nome?: string; email?: string; role?: UserRole; senha?: string }): Promise<User> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      return await handleResponse<User>(res);
    } catch (err: any) {
      if (
        err.message?.includes('já está em uso') ||
        err.message?.includes('Formato de login') ||
        err.message?.includes('único Administrador') ||
        err.message?.includes('nova senha')
      ) {
        throw err;
      }
      const localUsers = getLocalCachedUsers();
      const idx = localUsers.findIndex(u => u.id === id);
      if (idx === -1) throw new Error('Usuário não encontrado.');
      const updatedUser: LocalAuthUser = {
        ...localUsers[idx],
        login: payload.login ? payload.login.trim().toUpperCase() : localUsers[idx].login,
        nome: payload.nome ? payload.nome.trim() : localUsers[idx].nome,
        email: payload.email !== undefined ? payload.email.trim() : localUsers[idx].email,
        role: payload.role || localUsers[idx].role,
        senha: payload.senha && payload.senha.trim() ? payload.senha : localUsers[idx].senha,
        updatedAt: new Date().toISOString()
      };
      localUsers[idx] = updatedUser;
      saveLocalCachedUsers(localUsers);
      const { senha: _, ...safeUser } = updatedUser;
      return safeUser;
    }
  },

  async deleteUser(id: string): Promise<{ success: boolean }> {
    try {
      const res = await fetch(`${API_BASE}/users/${id}`, {
        method: 'DELETE',
      });
      return await handleResponse<{ success: boolean }>(res);
    } catch (err: any) {
      if (err.message?.includes('único Administrador')) {
        throw err;
      }
      const localUsers = getLocalCachedUsers();
      const target = localUsers.find(u => u.id === id);
      if (target?.role === 'ADMIN' && localUsers.filter(u => u.role === 'ADMIN').length <= 1) {
        throw new Error('Não é possível excluir o único Administrador do sistema.');
      }
      saveLocalCachedUsers(localUsers.filter(u => u.id !== id));
      return { success: true };
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

  async notifyDCNClosure(
    id: string,
    user?: string,
    dcn?: DCN,
    attachmentData?: { base64: string; filename: string; contentType?: string },
    settings?: NotificationSettings
  ): Promise<{ success: boolean; smtpSent?: boolean; detail?: string; error?: string }> {
    const res = await fetch(`${API_BASE}/dcns/${id}/notify-closure`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        user,
        dcn,
        attachmentBase64: attachmentData?.base64,
        attachmentName: attachmentData?.filename,
        attachmentType: attachmentData?.contentType,
        settings
      }),
    });
    return handleResponse<{ success: boolean; smtpSent?: boolean; detail?: string; error?: string }>(res);
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

  // Training
  async updateTraining(dcnId: string, trainingData: Partial<TrainingRecord>): Promise<TrainingRecord> {
    const res = await fetch(`${API_BASE}/dcns/${dcnId}/training`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainingData),
    });
    return handleResponse<TrainingRecord>(res);
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
  },

  // Notificações Recorrentes
  async getNotificationSettings(): Promise<NotificationSettings> {
    try {
      const res = await fetch(`${API_BASE}/notifications/settings`);
      const data = await handleResponse<NotificationSettings>(res);
      localStorage.setItem(LOCAL_NOTIF_SETTINGS_KEY, JSON.stringify(data));
      return data;
    } catch {
      try {
        const raw = localStorage.getItem(LOCAL_NOTIF_SETTINGS_KEY);
        if (raw) {
          return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(raw) };
        }
      } catch {
        // ignore
      }
      return { ...DEFAULT_NOTIFICATION_SETTINGS };
    }
  },

  async saveNotificationSettings(settings: NotificationSettings): Promise<NotificationSettings> {
    localStorage.setItem(LOCAL_NOTIF_SETTINGS_KEY, JSON.stringify(settings));
    try {
      const res = await fetch(`${API_BASE}/notifications/settings`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(settings)
      });
      return await handleResponse<NotificationSettings>(res);
    } catch {
      return settings;
    }
  },

  async getNotificationLogs(): Promise<NotificationLogEntry[]> {
    try {
      const res = await fetch(`${API_BASE}/notifications/logs`);
      const logs = await handleResponse<NotificationLogEntry[]>(res);
      const validLogs = (Array.isArray(logs) ? logs : []).filter(l => l.dcnCount && l.dcnCount > 0);
      localStorage.setItem(LOCAL_NOTIF_LOGS_KEY, JSON.stringify(validLogs));
      return validLogs;
    } catch {
      try {
        const raw = localStorage.getItem(LOCAL_NOTIF_LOGS_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          return (Array.isArray(parsed) ? parsed : []).filter(l => l.dcnCount && l.dcnCount > 0);
        }
      } catch {
        // ignore
      }
      return [];
    }
  },

  async clearNotificationLogs(): Promise<void> {
    try {
      await fetch(`${API_BASE}/notifications/logs`, { method: 'DELETE' });
    } catch {
      // ignore
    }
    localStorage.removeItem(LOCAL_NOTIF_LOGS_KEY);
  },

  async triggerNotification(params: {
    ruleType: NotificationRuleType;
    dcns: DCN[];
    users: User[];
    settings: NotificationSettings;
    triggerMode?: 'AUTOMATICO' | 'MANUAL';
    targetResponsible?: string;
  }): Promise<NotificationLogEntry> {
    const entry = createNotificationLogEntry(
      params.ruleType,
      params.dcns,
      params.users,
      params.settings,
      params.triggerMode || 'MANUAL',
      params.targetResponsible
    );

    // Se não houver DCNs elegíveis, nem envia e-mail e nem grava histórico vazio
    if (!entry.dcnCount || entry.dcnCount === 0) {
      return {
        ...entry,
        status: 'SEM_PENDENCIAS',
        skipped: true,
        message: 'Nenhum e-mail enviado pois não há DCNs elegíveis.'
      };
    }

    try {
      const res = await fetch(`${API_BASE}/notifications/trigger`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entry, settings: params.settings })
      });
      const saved = await handleResponse<NotificationLogEntry>(res);
      if (saved && saved.dcnCount > 0 && !saved.skipped) {
        const currentLogs = await this.getNotificationLogs();
        localStorage.setItem(LOCAL_NOTIF_LOGS_KEY, JSON.stringify([saved, ...currentLogs.filter(l => l.id !== saved.id && l.dcnCount > 0)].slice(0, 100)));
      }
      return saved;
    } catch {
      try {
        if (entry.dcnCount > 0) {
          const raw = localStorage.getItem(LOCAL_NOTIF_LOGS_KEY);
          const existing: NotificationLogEntry[] = raw ? JSON.parse(raw) : [];
          const updated = [entry, ...existing.filter(l => l.dcnCount > 0)].slice(0, 100);
          localStorage.setItem(LOCAL_NOTIF_LOGS_KEY, JSON.stringify(updated));
        }
      } catch {
        // ignore
      }
      return entry;
    }
  },

  async testSmtpConnection(
    settings: NotificationSettings,
    testRecipient?: string,
    dcns?: DCN[]
  ): Promise<{ success: boolean; message: string }> {
    const res = await fetch(`${API_BASE}/notifications/test-smtp`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings, testRecipient, dcns })
    });
    return handleResponse<{ success: boolean; message: string }>(res);
  }
};
