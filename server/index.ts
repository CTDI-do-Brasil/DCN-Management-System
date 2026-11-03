import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import { prisma } from './db';
import {
  initMinio,
  uploadFileToMinio,
  getFileStreamFromMinio,
  getFileStatFromMinio,
  deleteFileFromMinio,
  MINIO_BUCKET,
  minioClient
} from './minio';
import { INITIAL_USERS, LEGACY_DEMO_USER_IDS, LEGACY_DEMO_USER_LOGINS } from '../src/data/initialUsers';
import { LEGACY_DEMO_DCN_IDS, LEGACY_DEMO_DCN_NUMBERS } from '../src/data/initialDCNs';
import { LEGACY_DEMO_TECH_IDS, LEGACY_DEMO_TECH_BADGES } from '../src/data/initialTechnicians';
import {
  DEFAULT_NOTIFICATION_SETTINGS,
  createNotificationLogEntry,
  buildNotificationEmailHTML,
  buildDCNClosureEmailHTML,
  resolveClosureRecipients,
  filterDCNsForRule,
  isBusinessDay,
  getWeekKey,
  getHolidayInfo
} from '../src/utils/notificationTemplates';
import { NotificationLogEntry, NotificationSettings } from '../src/types';
import { sendSmtpEmail } from './smtpClient';
import { generateTrainingEvidencePDF } from '../src/utils/pdfGenerator';

dotenv.config();


const app = express();
const PORT = process.env.PORT || 3001;

// Configuração do Multer para upload em memória (até 100MB para PDFs, Imagens, Vídeos)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 100 * 1024 * 1024 }
});

function formatFileSize(bytes: number): string {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function detectFileType(mime: string, filename: string): 'PDF' | 'IMG' | 'VIDEO' | 'DOC' | 'SPREADSHEET' {
  const ext = path.extname(filename).toLowerCase();
  if (mime.includes('pdf') || ext === '.pdf') return 'PDF';
  if (mime.startsWith('image/') || ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg'].includes(ext)) return 'IMG';
  if (mime.startsWith('video/') || ['.mp4', '.mov', '.avi', '.mkv', '.webm'].includes(ext)) return 'VIDEO';
  if (['.xls', '.xlsx', '.csv'].includes(ext) || mime.includes('spreadsheet') || mime.includes('excel')) return 'SPREADSHEET';
  return 'DOC';
}

function addBusinessDays(startDateStr: string, daysToAdd: number): string {
  if (!startDateStr) return '';
  const clean = startDateStr.split('T')[0].split(' ')[0].trim();
  const parts = clean.split('-').map(Number);
  if (parts.length !== 3) return startDateStr;

  const [year, month, day] = parts;
  const date = new Date(year, month - 1, day);
  let added = 0;
  while (added < daysToAdd) {
    date.setDate(date.getDate() + 1);
    const dayOfWeek = date.getDay();
    // 0 = Domingo, 6 = Sábado
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      added++;
    }
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

// ==========================================
// Persistência: PostgreSQL (Produção / Deploy) vs Local (Dev)
// ==========================================
const isDatabaseConfigured = Boolean(process.env.DATABASE_URL && process.env.DATABASE_URL.trim());
const DATA_DIR = path.join(process.cwd(), 'data');
if (!fs.existsSync(DATA_DIR)) {
  try {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  } catch {}
}
const DCNS_FILE = path.join(DATA_DIR, 'local_dcns.json');
const TECHS_FILE = path.join(DATA_DIR, 'local_technicians.json');
const NOTIF_SETTINGS_FILE = path.join(DATA_DIR, 'notification_settings.json');
const NOTIF_LOGS_FILE = path.join(DATA_DIR, 'notification_logs.json');

function loadLocalDCNs(): any[] {
  try {
    if (fs.existsSync(DCNS_FILE)) {
      const data = fs.readFileSync(DCNS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (d: any) => !LEGACY_DEMO_DCN_IDS.includes(d.id) && !LEGACY_DEMO_DCN_NUMBERS.includes(d.dcnNumber)
        );
      }
    }
  } catch (e) {
    console.error('[Persistence] Error reading local_dcns.json:', e);
  }
  return [];
}

function saveLocalDCNs(dcns: any[]): void {
  try {
    fs.writeFileSync(DCNS_FILE, JSON.stringify(dcns, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Persistence] Error writing local_dcns.json:', e);
  }
}

function loadLocalTechnicians(): any[] {
  try {
    if (fs.existsSync(TECHS_FILE)) {
      const data = fs.readFileSync(TECHS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter(
          (t: any) => !LEGACY_DEMO_TECH_IDS.includes(t.id) && !LEGACY_DEMO_TECH_BADGES.includes(t.badge || '')
        );
      }
    }
  } catch (e) {
    console.error('[Persistence] Error reading local_technicians.json:', e);
  }
  return [];
}

function saveLocalTechnicians(techs: any[]): void {
  try {
    fs.writeFileSync(TECHS_FILE, JSON.stringify(techs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Persistence] Error writing local_technicians.json:', e);
  }
}

function loadLocalNotificationSettings(): NotificationSettings {
  try {
    if (fs.existsSync(NOTIF_SETTINGS_FILE)) {
      const data = fs.readFileSync(NOTIF_SETTINGS_FILE, 'utf-8');
      return { ...DEFAULT_NOTIFICATION_SETTINGS, ...JSON.parse(data) };
    }
  } catch (e) {
    console.error('[Persistence] Error reading notification_settings.json:', e);
  }
  return { ...DEFAULT_NOTIFICATION_SETTINGS };
}

function saveLocalNotificationSettings(settings: NotificationSettings): void {
  try {
    fs.writeFileSync(NOTIF_SETTINGS_FILE, JSON.stringify(settings, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Persistence] Error writing notification_settings.json:', e);
  }
}

function loadLocalNotificationLogs(): NotificationLogEntry[] {
  try {
    if (fs.existsSync(NOTIF_LOGS_FILE)) {
      const data = fs.readFileSync(NOTIF_LOGS_FILE, 'utf-8');
      const parsed = JSON.parse(data);
      if (Array.isArray(parsed)) {
        return parsed.filter((l: NotificationLogEntry) => l.dcnCount && l.dcnCount > 0);
      }
    }
  } catch (e) {
    console.error('[Persistence] Error reading notification_logs.json:', e);
  }
  return [];
}

function saveLocalNotificationLogs(logs: NotificationLogEntry[]): void {
  try {
    fs.writeFileSync(NOTIF_LOGS_FILE, JSON.stringify(logs, null, 2), 'utf-8');
  } catch (e) {
    console.error('[Persistence] Error writing notification_logs.json:', e);
  }
}

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Healthcheck
app.get('/api/health', async (_req: Request, res: Response) => {
  let dbStatus = 'disconnected';
  if (isDatabaseConfigured) {
    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'connected';
    } catch {
      dbStatus = 'error';
    }
  }

  let minioStatus = 'disconnected';
  try {
    await minioClient.bucketExists(MINIO_BUCKET);
    minioStatus = 'connected';
  } catch {}

  const storageMode = (isDatabaseConfigured && dbStatus === 'connected') ? 'POSTGRESQL' : 'LOCAL_OFFLINE';

  if (isDatabaseConfigured && dbStatus !== 'connected') {
    return res.status(503).json({
      status: 'degraded',
      database: dbStatus,
      storageMode: 'POSTGRESQL',
      minio: minioStatus,
      message: 'PostgreSQL database configured but connection unreachable.',
      timestamp: new Date().toISOString()
    });
  }

  res.json({
    status: 'ok',
    database: dbStatus,
    storageMode,
    minio: minioStatus,
    timestamp: new Date().toISOString()
  });
});

// ==========================================
// Módulo de Autenticação (Estilo OLP_WEB)
// ==========================================

const USER_LOGIN_REGEX = /^[A-Z0-9\-_]+\.[A-Z0-9\-_]+$/;

// POST /api/auth/login - Autenticação corporativa com fallback
app.post('/api/auth/login', async (req: Request, res: Response) => {
  try {
    const { login, senha } = req.body;

    if (!login || typeof login !== 'string') {
      return res.status(400).json({ error: 'Usuário não informado.' });
    }

    const normalizedLogin = login.trim().toUpperCase();

    if (!USER_LOGIN_REGEX.test(normalizedLogin)) {
      return res.status(400).json({
        error: 'Formato de usuário inválido! Use NOME.SOBRENOME (ex: JONATAS.MIRANDA).'
      });
    }


    if (!senha || typeof senha !== 'string') {
      return res.status(400).json({ error: 'Senha não informada.' });
    }

    let foundUser: any = null;
    let dbAvailable = false;

    // 1. Tentar buscar no PostgreSQL
    try {
      if ((prisma as any).user) {
        const userCount = await (prisma as any).user.count();
        dbAvailable = true;

        // Se a tabela de usuários estiver vazia, garante carga inicial
        if (userCount === 0) {
          for (const u of INITIAL_USERS) {
            await (prisma as any).user.upsert({
              where: { login: u.login },
              update: {},
              create: {
                id: u.id,
                login: u.login,
                nome: u.nome,
                role: u.role,
                senha: u.senha
              }
            });
          }
        }

        foundUser = await (prisma as any).user.findUnique({
          where: { login: normalizedLogin }
        });
      }
    } catch (dbError: any) {
      console.warn('[Auth Server] Banco de dados offline/indisponível. Usando contingência:', dbError.message);
    }

    // 2. Fallback offline apenas caso o banco de dados não responda
    if (!dbAvailable && !foundUser) {
      foundUser = INITIAL_USERS.find(
        u => u.login.toUpperCase() === normalizedLogin
      );
    }

    if (!foundUser) {
      return res.status(401).json({
        error: `Usuário "${normalizedLogin}" não cadastrado no sistema.`
      });
    }

    // Validação da senha
    if (foundUser.senha !== senha) {
      return res.status(401).json({
        error: 'Credenciais incorretas! Verifique sua senha e tente novamente.'
      });
    }

    const safeUser = {
      id: foundUser.id,
      login: foundUser.login,
      nome: foundUser.nome,
      role: foundUser.role,
      createdAt: foundUser.createdAt,
      updatedAt: foundUser.updatedAt
    };

    return res.json({
      success: true,
      message: 'Autenticação realizada com sucesso!',
      user: safeUser
    });
  } catch (err: any) {
    console.error('[Auth Error]', err);
    return res.status(500).json({
      error: 'Erro interno ao processar autenticação.',
      details: err.message
    });
  }
});

// GET /api/users - Listagem de usuários (Safe)
app.get('/api/users', async (_req: Request, res: Response) => {
  try {
    let usersList: any[] = [];
    let dbAvailable = false;
    try {
      if ((prisma as any).user) {
        const count = await (prisma as any).user.count();
        dbAvailable = true;
        if (count === 0) {
          for (const u of INITIAL_USERS) {
            await (prisma as any).user.upsert({
              where: { login: u.login },
              update: {},
              create: {
                id: u.id,
                login: u.login,
                nome: u.nome,
                role: u.role,
                senha: u.senha
              }
            });
          }
        }
        usersList = await (prisma as any).user.findMany({
          where: {
            AND: [
              { id: { notIn: LEGACY_DEMO_USER_IDS } },
              { login: { notIn: LEGACY_DEMO_USER_LOGINS } }
            ]
          },
          select: {
            id: true,
            login: true,
            nome: true,
            role: true,
            createdAt: true,
            updatedAt: true
          },
          orderBy: { nome: 'asc' }
        });
      }
    } catch {
      // DB offline, use INITIAL_USERS
    }

    if (!dbAvailable && (!usersList || usersList.length === 0)) {
      usersList = INITIAL_USERS.map(({ senha, ...u }) => u);
    }

    res.json(usersList);
  } catch (error: any) {
    res.status(500).json({ error: 'Falha ao buscar usuários', details: error.message });
  }
});

// POST /api/users - Criar novo usuário no PostgreSQL
app.post('/api/users', async (req: Request, res: Response) => {
  try {
    const { login, nome, role, senha } = req.body;

    if (!login || typeof login !== 'string') {
      return res.status(400).json({ error: 'O login do usuário é obrigatório.' });
    }

    const normalizedLogin = login.trim().toUpperCase();
    if (!USER_LOGIN_REGEX.test(normalizedLogin)) {
      return res.status(400).json({
        error: 'Formato de login inválido! Utilize NOME.SOBRENOME (ex: JOAO.SILVA).'
      });
    }

    if (!nome || typeof nome !== 'string' || !nome.trim()) {
      return res.status(400).json({ error: 'O nome completo do usuário é obrigatório.' });
    }

    const validRoles = ['ADMIN', 'ENGINEER', 'OPERATOR'];
    const normalizedRole = validRoles.includes(role) ? role : 'OPERATOR';

    if (!senha || typeof senha !== 'string' || senha.trim().length < 3) {
      return res.status(400).json({ error: 'Informe uma senha válida (mínimo 3 caracteres).' });
    }

    const existing = await (prisma as any).user.findUnique({
      where: { login: normalizedLogin }
    });

    if (existing) {
      return res.status(409).json({
        error: `Já existe um usuário cadastrado com o login "${normalizedLogin}".`
      });
    }

    const created = await (prisma as any).user.create({
      data: {
        login: normalizedLogin,
        nome: nome.trim(),
        role: normalizedRole,
        senha: senha
      },
      select: {
        id: true,
        login: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.status(201).json(created);
  } catch (error: any) {
    console.error('[Create User Error]', error);
    res.status(500).json({ error: 'Falha ao criar usuário no banco de dados', details: error.message });
  }
});

// PUT /api/users/:id - Atualizar dados, perfil ou senha do usuário no PostgreSQL
app.put('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { login, nome, role, senha } = req.body;

    const existing = await (prisma as any).user.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado no banco de dados.' });
    }

    let normalizedLogin = existing.login;
    if (login && typeof login === 'string') {
      normalizedLogin = login.trim().toUpperCase();
      if (!USER_LOGIN_REGEX.test(normalizedLogin)) {
        return res.status(400).json({
          error: 'Formato de login inválido! Utilize NOME.SOBRENOME (ex: JOAO.SILVA).'
        });
      }

      if (normalizedLogin !== existing.login) {
        const duplicate = await (prisma as any).user.findUnique({
          where: { login: normalizedLogin }
        });
        if (duplicate) {
          return res.status(409).json({
            error: `O login "${normalizedLogin}" já está em uso por outro usuário.`
          });
        }
      }
    }

    const validRoles = ['ADMIN', 'ENGINEER', 'OPERATOR'];
    const updatedRole = role && validRoles.includes(role) ? role : existing.role;

    // Impedir rebaixamento do último Administrador
    if (existing.role === 'ADMIN' && updatedRole !== 'ADMIN') {
      const adminCount = await (prisma as any).user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Não é permitido alterar o perfil do único Administrador ativo do sistema.'
        });
      }
    }

    const updateData: any = {
      login: normalizedLogin,
      nome: nome && typeof nome === 'string' && nome.trim() ? nome.trim() : existing.nome,
      role: updatedRole
    };

    if (senha && typeof senha === 'string' && senha.trim().length > 0) {
      if (senha.trim().length < 3) {
        return res.status(400).json({ error: 'A nova senha deve ter pelo menos 3 caracteres.' });
      }
      updateData.senha = senha;
    }

    const updated = await (prisma as any).user.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        login: true,
        nome: true,
        role: true,
        createdAt: true,
        updatedAt: true
      }
    });

    res.json(updated);
  } catch (error: any) {
    console.error('[Update User Error]', error);
    res.status(500).json({ error: 'Falha ao atualizar usuário no banco de dados', details: error.message });
  }
});

// DELETE /api/users/:id - Excluir usuário do PostgreSQL
app.delete('/api/users/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    const existing = await (prisma as any).user.findUnique({
      where: { id }
    });

    if (!existing) {
      return res.status(404).json({ error: 'Usuário não encontrado.' });
    }

    if (existing.role === 'ADMIN') {
      const adminCount = await (prisma as any).user.count({ where: { role: 'ADMIN' } });
      if (adminCount <= 1) {
        return res.status(400).json({
          error: 'Não é possível excluir o único Administrador do sistema.'
        });
      }
    }

    await (prisma as any).user.delete({
      where: { id }
    });

    res.json({ success: true, message: `Usuário ${existing.login} excluído com sucesso.` });
  } catch (error: any) {
    console.error('[Delete User Error]', error);
    res.status(500).json({ error: 'Falha ao excluir usuário do banco de dados', details: error.message });
  }
});


// GET /api/dcns - List all DCNs with relations
app.get('/api/dcns', async (_req: Request, res: Response) => {
  if (isDatabaseConfigured) {
    try {
      const dcns = await prisma.dCN.findMany({
        include: {
          materials: true,
          training: {
            include: {
              attendeesList: true
            }
          },
          implementationChecklist: true,
          attachments: true,
          auditTrail: {
            orderBy: { createdAt: 'desc' }
          }
        },
        orderBy: { createdAt: 'desc' }
      });
      return res.json(dcns);
    } catch (error: any) {
      console.error('[PostgreSQL] Erro ao buscar DCNs no banco:', error);
      return res.status(500).json({ error: 'Erro ao buscar DCNs no PostgreSQL', details: error.message });
    }
  }

  // Execução local sem PostgreSQL configurado
  const localDcns = loadLocalDCNs();
  return res.json(localDcns);
});

// GET /api/dcns/:id - Single DCN
app.get('/api/dcns/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      const dcn = await prisma.dCN.findFirst({
        where: { OR: [{ id }, { dcnNumber: id }] },
        include: {
          materials: true,
          training: {
            include: {
              attendeesList: true
            }
          },
          implementationChecklist: true,
          attachments: true,
          auditTrail: {
            orderBy: { createdAt: 'desc' }
          }
        }
      });

      if (!dcn) {
        return res.status(404).json({ error: 'DCN não encontrada no PostgreSQL.' });
      }
      return res.json(dcn);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao consultar DCN no PostgreSQL', details: error.message });
    }
  }

  const local = loadLocalDCNs().find(d => d.id === id || d.dcnNumber === id);
  if (local) {
    return res.json(local);
  }
  return res.status(404).json({ error: 'DCN not found' });
});

// POST /api/dcns - Create new DCN
app.post('/api/dcns', async (req: Request, res: Response) => {
  const {
    id,
    dcnNumber,
    revision,
    productFamily,
    title,
    description,
    area,
    responsible,
    receivedDate,
    dueDate,
    status,
    priority,
    needsMaterial,
    materials = [],
    needsTraining,
    training,
    implementationChecklist = [],
    attachments = [],
    auditTrail = [],
    engineeringReview
  } = req.body;

  if (isDatabaseConfigured) {
    try {
      const newDCN = await prisma.dCN.create({
        data: {
          id: id || undefined,
          dcnNumber,
          revision: revision || null,
          productFamily: productFamily || null,
          title,
          description: description || '',
          area,
          responsible,
          receivedDate,
          dueDate,
          status: status || 'RECEBIDA',
          priority: priority || 'MEDIA',
          needsMaterial: Boolean(needsMaterial),
          needsTraining: Boolean(needsTraining),
          engineeringReview: engineeringReview || null,
          materials: {
            create: materials.map((m: any) => ({
              code: m.code,
              description: m.description,
              quantity: Number(m.quantity) || 1,
              unit: m.unit || 'UN',
              supplier: m.supplier || '',
              expectedDate: m.expectedDate || '',
              arrivalDate: m.arrivalDate || null,
              status: m.status || 'PENDENTE',
              notes: m.notes || null
            }))
          },
          training: training ? {
            create: {
              instructor: training.instructor || '',
              targetAudience: training.targetAudience || '',
              department: training.department || '',
              estimatedHours: Number(training.estimatedHours) || 30,
              scheduledDate: training.scheduledDate || null,
              completionDate: training.completionDate || null,
              totalTrained: Number(training.totalTrained) || 0,
              totalPlanned: Number(training.totalPlanned) || 0,
              status: training.status || (training.scheduledDate ? 'AGENDADO' : 'PENDENTE'),
              trainingTopics: training.trainingTopics || [],
              evidenceDoc: training.evidenceDoc || null,
              attendeesList: {
                create: (training.attendeesList || []).map((a: any) => ({
                  technicianId: a.technicianId || null,
                  name: a.name,
                  badge: a.badge || '',
                  department: a.department || '',
                  signedDate: a.signedDate || null,
                  status: a.status || 'PENDENTE',
                  score: a.score !== undefined ? Number(a.score) : null
                }))
              }
            }
          } : undefined,
          implementationChecklist: {
            create: implementationChecklist.map((c: any) => ({
              title: c.title,
              responsible: c.responsible,
              completed: Boolean(c.completed),
              completedAt: c.completedAt || null,
              mandatory: c.mandatory !== undefined ? Boolean(c.mandatory) : true
            }))
          },
          attachments: {
            create: attachments.map((a: any) => ({
              name: a.name,
              type: a.type || 'PDF',
              size: a.size || '1MB',
              category: a.category || 'DOCUMENTO_COMPLEMENTAR',
              uploadedAt: a.uploadedAt || new Date().toISOString(),
              uploadedBy: a.uploadedBy || responsible,
              url: a.url || null
            }))
          },
          auditTrail: {
            create: [
              ...(auditTrail && auditTrail.length > 0 ? auditTrail.map((entry: any) => ({
                timestamp: entry.timestamp || new Date().toISOString(),
                user: entry.user || responsible,
                userRole: entry.userRole || 'Engenheiro de Processos',
                action: entry.action || 'DCN Cadastrada',
                fromStatus: entry.fromStatus || null,
                toStatus: entry.toStatus || status || 'RECEBIDA',
                comment: entry.comment || 'Criação inicial no sistema'
              })) : [{
                timestamp: new Date().toISOString(),
                user: responsible,
                userRole: 'Engenheiro de Processos',
                action: 'DCN Cadastrada',
                fromStatus: null,
                toStatus: status || 'RECEBIDA',
                comment: 'Criação da DCN'
              }])
            ]
          }
        },
        include: {
          materials: true,
          training: {
            include: { attendeesList: true }
          },
          implementationChecklist: true,
          attachments: true,
          auditTrail: true
        }
      });
      return res.status(201).json(newDCN);
    } catch (error: any) {
      console.error('[PostgreSQL] Erro ao criar DCN:', error);
      let msg = 'Falha ao criar DCN no PostgreSQL.';
      if (error.code === 'P2002') {
        msg = `Já existe uma DCN cadastrada com o número informado (${dcnNumber || ''}).`;
      }
      return res.status(500).json({ error: msg, details: error.message });
    }
  }

  // Fallback offline (apenas em dev local sem PostgreSQL)
  const localDCN = {
    id: id || `dcn-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    dcnNumber,
    revision: revision || null,
    productFamily: productFamily || null,
    title,
    description: description || '',
    area,
    responsible,
    receivedDate: receivedDate || new Date().toISOString().split('T')[0],
    dueDate: dueDate || new Date().toISOString().split('T')[0],
    status: status || 'RECEBIDA',
    priority: priority || 'MEDIA',
    needsMaterial: Boolean(needsMaterial),
    needsTraining: Boolean(needsTraining),
    engineeringReview: engineeringReview || null,
    materials: (materials || []).map((m: any) => ({
      id: m.id || `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      code: m.code,
      description: m.description,
      quantity: Number(m.quantity) || 1,
      unit: m.unit || 'UN',
      supplier: m.supplier || '',
      expectedDate: m.expectedDate || '',
      arrivalDate: m.arrivalDate || null,
      status: m.status || 'PENDENTE',
      notes: m.notes || null
    })),
    training: training ? {
      id: training.id || `trn-${Date.now()}`,
      instructor: training.instructor || '',
      targetAudience: training.targetAudience || '',
      department: training.department || '',
      estimatedHours: Number(training.estimatedHours) || 30,
      scheduledDate: training.scheduledDate || null,
      completionDate: training.completionDate || null,
      totalTrained: Number(training.totalTrained) || 0,
      totalPlanned: Number(training.totalPlanned) || 0,
      status: training.status || (training.scheduledDate ? 'AGENDADO' : 'PENDENTE'),
      trainingTopics: training.trainingTopics || [],
      evidenceDoc: training.evidenceDoc || null,
      attendeesList: (training.attendeesList || []).map((a: any) => ({
        id: a.id || `att-tech-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
        technicianId: a.technicianId || null,
        name: a.name,
        badge: a.badge || '',
        department: a.department || '',
        signedDate: a.signedDate || null,
        status: a.status || 'PENDENTE',
        score: a.score !== undefined ? Number(a.score) : null
      }))
    } : null,
    implementationChecklist: (implementationChecklist || []).map((c: any) => ({
      id: c.id || `chk-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      title: c.title,
      responsible: c.responsible,
      completed: Boolean(c.completed),
      completedAt: c.completedAt || null,
      mandatory: c.mandatory !== undefined ? Boolean(c.mandatory) : true
    })),
    attachments: (attachments || []).map((a: any) => ({
      id: a.id || `att-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      name: a.name,
      type: a.type || 'PDF',
      size: a.size || '1MB',
      category: a.category || 'DOCUMENTO_COMPLEMENTAR',
      uploadedAt: a.uploadedAt || new Date().toISOString(),
      uploadedBy: a.uploadedBy || responsible,
      url: a.url || null
    })),
    auditTrail: (auditTrail && auditTrail.length > 0) ? auditTrail : [{
      id: `aud-${Date.now()}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      user: responsible,
      userRole: 'Engenheiro de Processos',
      action: 'DCN Cadastrada',
      fromStatus: null,
      toStatus: status || 'RECEBIDA',
      comment: 'Criação da DCN'
    }],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  const localDcns = loadLocalDCNs();
  const existingIdx = localDcns.findIndex(d => d.id === localDCN.id || d.dcnNumber === localDCN.dcnNumber);
  if (existingIdx >= 0) {
    localDcns[existingIdx] = localDCN;
  } else {
    localDcns.unshift(localDCN);
  }
  saveLocalDCNs(localDcns);

  return res.status(201).json(localDCN);
});

// PUT /api/dcns/:id - Update DCN fields & audit
app.put('/api/dcns/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { auditComment, user, userRole, ...fields } = req.body;

  if (isDatabaseConfigured) {
    try {
      const currentDCN = await prisma.dCN.findFirst({
        where: { OR: [{ id }, { dcnNumber: id }] }
      });

      if (!currentDCN) {
        return res.status(404).json({ error: 'DCN não encontrada no PostgreSQL.' });
      }

      const isClosing = fields.status === 'ENCERRADA' && currentDCN.status !== 'ENCERRADA';

      if (fields.status === 'IMPLEMENTADA' && currentDCN.status === 'PRONTA_IMPLEMENTACAO') {
        const training = await prisma.trainingRecord.findUnique({ where: { dcnId: currentDCN.id } });
        if (!training?.scheduledDate || !training.scheduledDate.trim()) {
          return res.status(400).json({ error: 'O treinamento precisa estar agendado antes de avançar para a etapa de Implementação.' });
        }
      }

      const updated = await prisma.$transaction(async (tx) => {
        if (auditComment || (fields.status && fields.status !== currentDCN.status)) {
          await tx.auditLogEntry.create({
            data: {
              dcnId: currentDCN.id,
              timestamp: new Date().toISOString(),
              user: user || 'Engenharia CTDI',
              userRole: userRole || 'Engenheiro Responsável',
              action: fields.status && fields.status !== currentDCN.status ? `Status alterado para ${fields.status}` : 'Atualização de dados',
              fromStatus: currentDCN.status,
              toStatus: fields.status || currentDCN.status,
              comment: auditComment || 'Atualização via sistema'
            }
          });
        }

        const updateData: any = {};
        const allowedFields = [
          'dcnNumber', 'revision', 'productFamily', 'title', 'description', 'area', 'responsible', 'receivedDate', 'dueDate',
          'status', 'priority', 'needsMaterial', 'needsTraining', 'implementationDate',
          'implementedBy', 'engineeringReview', 'closureNotes', 'closedAt', 'closedBy'
        ];

        for (const field of allowedFields) {
          if (fields[field] !== undefined) {
            updateData[field] = fields[field];
          }
        }

        if (Array.isArray(fields.materials)) {
          await tx.materialItem.deleteMany({ where: { dcnId: currentDCN.id } });
          if (fields.materials.length > 0) {
            await tx.materialItem.createMany({
              data: fields.materials.map((m: any) => ({
                dcnId: currentDCN.id,
                code: m.code || '',
                description: m.description || '',
                quantity: Number(m.quantity) || 1,
                unit: m.unit || 'UN',
                supplier: m.supplier || '',
                expectedDate: m.expectedDate || '',
                arrivalDate: m.arrivalDate || null,
                status: m.status || 'PENDENTE',
                notes: m.notes || null
              }))
            });
          }
        }

        if (fields.training && typeof fields.training === 'object') {
          const scheduledDateVal = fields.training.scheduledDate || null;
          await tx.trainingRecord.upsert({
            where: { dcnId: currentDCN.id },
            update: {
              instructor: fields.training.instructor || fields.responsible || currentDCN.responsible,
              targetAudience: fields.training.targetAudience || 'Líderes e Técnicos',
              department: fields.training.department || fields.area || currentDCN.area,
              scheduledDate: scheduledDateVal,
              status: scheduledDateVal ? 'AGENDADO' : 'PENDENTE'
            },
            create: {
              dcnId: currentDCN.id,
              instructor: fields.training.instructor || fields.responsible || currentDCN.responsible,
              targetAudience: fields.training.targetAudience || 'Líderes e Técnicos',
              department: fields.training.department || fields.area || currentDCN.area,
              scheduledDate: scheduledDateVal,
              status: scheduledDateVal ? 'AGENDADO' : 'PENDENTE'
            }
          });
        }

        return tx.dCN.update({
          where: { id: currentDCN.id },
          data: updateData,
          include: {
            materials: true,
            training: { include: { attendeesList: true } },
            implementationChecklist: true,
            attachments: true,
            auditTrail: { orderBy: { createdAt: 'desc' } }
          }
        });
      });

      if (isClosing) {
        sendDCNClosureNotification(currentDCN.id, user || currentDCN.closedBy || 'Engenharia CTDI', updated).catch(err => {
          console.warn('[DCN Closure] Falha ao enviar notificação de encerramento:', err);
        });
      }

      return res.json(updated);
    } catch (error: any) {
      console.error('[PostgreSQL] Erro ao atualizar DCN:', error);
      return res.status(500).json({ error: 'Erro ao atualizar DCN no PostgreSQL', details: error.message });
    }
  }

  // Fallback offline (execução local sem PostgreSQL)
  const local = loadLocalDCNs().find(d => d.id === id || d.dcnNumber === id);
  const currentDCN = local || null;
  const isClosing = fields.status === 'ENCERRADA' && (!currentDCN || currentDCN.status !== 'ENCERRADA');

  const localDcns = loadLocalDCNs();
  const index = localDcns.findIndex(d => d.id === id || d.dcnNumber === id);
  let savedDCN: any;

  if (index !== -1) {
    const existing = localDcns[index];
    const newAudit = [...(existing.auditTrail || [])];
    if (auditComment || (fields.status && fields.status !== existing.status)) {
      newAudit.push({
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: user || 'Engenharia CTDI',
        userRole: userRole || 'Engenheiro Responsável',
        action: fields.status && fields.status !== existing.status ? `Status alterado para ${fields.status}` : 'Atualização de dados',
        fromStatus: existing.status,
        toStatus: fields.status || existing.status,
        comment: auditComment || 'Atualização via sistema'
      });
    }

    savedDCN = {
      ...existing,
      ...fields,
      auditTrail: newAudit,
      updatedAt: new Date().toISOString()
    };
    localDcns[index] = savedDCN;
  } else {
    savedDCN = {
      id,
      ...fields,
      status: fields.status || 'RECEBIDA',
      auditTrail: [{
        id: `aud-${Date.now()}`,
        timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
        user: user || 'Engenharia CTDI',
        userRole: userRole || 'Engenheiro Responsável',
        action: 'Atualização offline',
        comment: auditComment || 'DCN atualizada em modo contingência'
      }],
      updatedAt: new Date().toISOString()
    };
    localDcns.push(savedDCN);
  }

  saveLocalDCNs(localDcns);

  if (isClosing) {
    sendDCNClosureNotification(id, user || 'Engenharia CTDI', savedDCN).catch(err => {
      console.warn('[DCN Closure Fallback] Falha ao enviar notificação de encerramento:', err);
    });
  }

  return res.json(savedDCN);
});

// DELETE /api/dcns/:id
app.delete('/api/dcns/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      await prisma.dCN.delete({ where: { id } });
      return res.json({ success: true, message: 'DCN excluída com sucesso do PostgreSQL.' });
    } catch (error: any) {
      return res.status(500).json({ error: 'Falha ao excluir DCN no PostgreSQL', details: error.message });
    }
  }

  const localDcns = loadLocalDCNs().filter(d => d.id !== id && d.dcnNumber !== id);
  saveLocalDCNs(localDcns);
  return res.json({ success: true, message: 'DCN deleted successfully (modo local)' });
});

// Material Endpoints
app.post('/api/dcns/:id/materials', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      const material = await prisma.materialItem.create({
        data: {
          dcnId: id,
          ...req.body
        }
      });
      return res.status(201).json(material);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao cadastrar material no PostgreSQL', details: error.message });
    }
  }

  // Execução local sem PostgreSQL
  const newMaterial = {
    id: `mat-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    dcnId: id,
    code: req.body.code || '',
    description: req.body.description || '',
    quantity: Number(req.body.quantity) || 1,
    unit: req.body.unit || 'UN',
    supplier: req.body.supplier || '',
    expectedDate: req.body.expectedDate || '',
    arrivalDate: req.body.arrivalDate || null,
    status: req.body.status || 'PENDENTE',
    notes: req.body.notes || null
  };
  const localDcns = loadLocalDCNs();
  const dcn = localDcns.find(d => d.id === id || d.dcnNumber === id);
  if (dcn) {
    dcn.materials = dcn.materials || [];
    dcn.materials.push(newMaterial);
    dcn.needsMaterial = true;
    saveLocalDCNs(localDcns);
  }
  return res.status(201).json(newMaterial);
});

app.put('/api/dcns/:id/materials/:materialId', async (req: Request, res: Response) => {
  const { id, materialId } = req.params;
  const today = new Date().toISOString().split('T')[0];

  const updateData = { ...req.body };
  if ((updateData.status === 'RECEBIDO_ESTOQUE' || updateData.status === 'INSPECIONADO_APROVADO') && !updateData.arrivalDate) {
    updateData.arrivalDate = today;
  }

  if (isDatabaseConfigured) {
    try {
      const material = await prisma.materialItem.update({
        where: { id: materialId },
        data: updateData
      });

      const currentDCN = await prisma.dCN.findUnique({
        where: { id },
        include: { materials: true }
      });

      if (currentDCN && currentDCN.status === 'AGUARDANDO_MATERIAL') {
        const allReady = currentDCN.materials.length > 0 && currentDCN.materials.every(
          m => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO'
        );

        if (allReady) {
          const newDueDate = addBusinessDays(today, 3);
          await prisma.dCN.update({
            where: { id },
            data: { dueDate: newDueDate }
          });
          await prisma.auditLogEntry.create({
            data: {
              dcnId: id,
              timestamp: new Date().toISOString(),
              user: req.body.user || 'Controle de Materiais',
              userRole: 'Controle de Materiais',
              action: 'SLA Atualizado: 3 Dias Úteis pós-materiais',
              fromStatus: currentDCN.status,
              toStatus: currentDCN.status,
              comment: `Todos os materiais foram recebidos em estoque em ${today}. O SLA foi recalculado para 3 dias úteis: ${newDueDate}.`
            }
          });
        }
      }

      return res.json(material);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar material no PostgreSQL', details: error.message });
    }
  }

  // Execução local sem PostgreSQL
  const localDcns = loadLocalDCNs();
  const dcn = localDcns.find(d => d.id === id || d.dcnNumber === id);
  let updatedMaterial: any = null;
  if (dcn && dcn.materials) {
    const matIndex = dcn.materials.findIndex((m: any) => m.id === materialId);
    if (matIndex !== -1) {
      dcn.materials[matIndex] = { ...dcn.materials[matIndex], ...updateData };
      updatedMaterial = dcn.materials[matIndex];

      const allReady = dcn.materials.length > 0 && dcn.materials.every(
        (m: any) => m.status === 'RECEBIDO_ESTOQUE' || m.status === 'INSPECIONADO_APROVADO'
      );
      if (dcn.status === 'AGUARDANDO_MATERIAL' && allReady) {
        dcn.dueDate = addBusinessDays(today, 3);
        dcn.auditTrail = dcn.auditTrail || [];
        dcn.auditTrail.push({
          id: `aud-${Date.now()}-sla`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: req.body.user || 'Controle de Materiais',
          userRole: 'Controle de Materiais',
          action: 'SLA Atualizado: 3 Dias Úteis pós-materiais',
          comment: `Todos os materiais foram recebidos em estoque em ${today}. O SLA foi recalculado para 3 dias úteis: ${dcn.dueDate}.`
        });
      }

      saveLocalDCNs(localDcns);
    }
  }

  return res.json(updatedMaterial || { id: materialId, ...updateData });
});

// Checklist Endpoints
app.post('/api/dcns/:id/checklists', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      const item = await prisma.implementationChecklist.create({
        data: {
          dcnId: id,
          ...req.body
        }
      });
      return res.status(201).json(item);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao cadastrar checklist no PostgreSQL', details: error.message });
    }
  }

  const localItem = {
    id: `chk-${Date.now()}`,
    dcnId: id,
    ...req.body
  };
  return res.status(201).json(localItem);
});

app.put('/api/dcns/:id/checklists/:checklistId', async (req: Request, res: Response) => {
  const { checklistId } = req.params;
  if (isDatabaseConfigured) {
    try {
      const item = await prisma.implementationChecklist.update({
        where: { id: checklistId },
        data: req.body
      });
      return res.json(item);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar checklist no PostgreSQL', details: error.message });
    }
  }

  return res.json({ id: checklistId, ...req.body });
});

// Training Endpoints
app.put('/api/dcns/:id/training', async (req: Request, res: Response) => {
  const { id } = req.params;
  const trainingData = req.body;

  if (isDatabaseConfigured) {
    try {
      const existing = await prisma.trainingRecord.findUnique({
        where: { dcnId: id },
        include: { attendeesList: true }
      });

      let result;
      if (existing) {
        result = await prisma.trainingRecord.update({
          where: { dcnId: id },
          data: {
            instructor: trainingData.instructor !== undefined ? trainingData.instructor : existing.instructor,
            targetAudience: trainingData.targetAudience !== undefined ? trainingData.targetAudience : existing.targetAudience,
            department: trainingData.department !== undefined ? trainingData.department : existing.department,
            estimatedHours: trainingData.estimatedHours !== undefined ? Number(trainingData.estimatedHours) : existing.estimatedHours,
            scheduledDate: trainingData.scheduledDate !== undefined ? trainingData.scheduledDate : existing.scheduledDate,
            completionDate: trainingData.completionDate !== undefined ? trainingData.completionDate : existing.completionDate,
            status: trainingData.status !== undefined ? trainingData.status : existing.status,
            trainingTopics: trainingData.trainingTopics !== undefined ? trainingData.trainingTopics : existing.trainingTopics,
            totalTrained: trainingData.totalTrained !== undefined ? Number(trainingData.totalTrained) : existing.totalTrained,
            totalPlanned: trainingData.totalPlanned !== undefined ? Number(trainingData.totalPlanned) : existing.totalPlanned,
            evidenceDoc: trainingData.evidenceDoc !== undefined ? trainingData.evidenceDoc : existing.evidenceDoc
          },
          include: { attendeesList: true }
        });

        if (Array.isArray(trainingData.attendeesList)) {
          await prisma.trainingAttendee.deleteMany({
            where: { trainingId: existing.id }
          });
          for (const att of trainingData.attendeesList) {
            await prisma.trainingAttendee.create({
              data: {
                trainingId: existing.id,
                name: att.name,
                badge: att.badge || null,
                technicianId: att.technicianId || null,
                department: att.department || 'Produção',
                status: att.status || 'PENDENTE',
                signedDate: att.signedDate || null
              }
            });
          }
          result = await prisma.trainingRecord.findUnique({
            where: { dcnId: id },
            include: { attendeesList: true }
          });
        }
      } else {
        result = await prisma.trainingRecord.create({
          data: {
            dcnId: id,
            instructor: trainingData.instructor || 'Engenharia CTDI',
            targetAudience: trainingData.targetAudience || 'Líderes, Técnicos de Reparo e Inspetores de CQ.',
            department: trainingData.department || 'Produção',
            estimatedHours: Number(trainingData.estimatedHours) || 30,
            scheduledDate: trainingData.scheduledDate || null,
            completionDate: trainingData.completionDate || null,
            totalTrained: Number(trainingData.totalTrained) || 0,
            totalPlanned: Number(trainingData.totalPlanned) || 0,
            status: trainingData.status || (trainingData.scheduledDate ? 'AGENDADO' : 'PENDENTE'),
            trainingTopics: trainingData.trainingTopics || ['Instrução de Trabalho revisada', 'Parâmetros técnicos e tolerâncias de qualidade'],
            evidenceDoc: trainingData.evidenceDoc || null
          },
          include: { attendeesList: true }
        });

        if (Array.isArray(trainingData.attendeesList) && trainingData.attendeesList.length > 0) {
          for (const att of trainingData.attendeesList) {
            await prisma.trainingAttendee.create({
              data: {
                trainingId: result.id,
                name: att.name,
                badge: att.badge || null,
                technicianId: att.technicianId || null,
                department: att.department || 'Produção',
                status: att.status || 'PENDENTE',
                signedDate: att.signedDate || null
              }
            });
          }
          result = await prisma.trainingRecord.findUnique({
            where: { dcnId: id },
            include: { attendeesList: true }
          });
        }

        await prisma.dCN.update({
          where: { id },
          data: { needsTraining: true }
        });
      }

      return res.json(result);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar treinamento no PostgreSQL', details: error.message });
    }
  }

  // Execução local sem PostgreSQL
  const localDcns = loadLocalDCNs();
  const dcn = localDcns.find(d => d.id === id || d.dcnNumber === id);
  if (dcn) {
    dcn.training = {
      ...(dcn.training || {}),
      ...trainingData
    };
    dcn.needsTraining = true;
    saveLocalDCNs(localDcns);
    return res.json(dcn.training);
  }
  return res.json(trainingData);
});

// Technicians Endpoints
app.get('/api/technicians', async (_req: Request, res: Response) => {
  if (isDatabaseConfigured) {
    try {
      const techs = await prisma.technician.findMany({
        orderBy: { name: 'asc' }
      });
      return res.json(techs);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao listar técnicos no PostgreSQL', details: error.message });
    }
  }
  return res.json(loadLocalTechnicians());
});

app.post('/api/technicians', async (req: Request, res: Response) => {
  const data = {
    ...req.body,
    badge: req.body.badge || `TECH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
    shift: req.body.shift || '',
    department: req.body.department || ''
  };

  if (isDatabaseConfigured) {
    try {
      const tech = await prisma.technician.create({ data });
      return res.status(201).json(tech);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao cadastrar técnico no PostgreSQL', details: error.message });
    }
  }

  const localTechs = loadLocalTechnicians();
  const newTech = {
    id: `tech-${Date.now()}`,
    ...data,
    active: true,
    createdAt: new Date().toISOString().split('T')[0]
  };
  localTechs.push(newTech);
  saveLocalTechnicians(localTechs);
  return res.status(201).json(newTech);
});

app.put('/api/technicians/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      const tech = await prisma.technician.update({
        where: { id },
        data: req.body
      });
      return res.json(tech);
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao atualizar técnico no PostgreSQL', details: error.message });
    }
  }

  const localTechs = loadLocalTechnicians();
  const idx = localTechs.findIndex(t => t.id === id);
  if (idx !== -1) {
    localTechs[idx] = { ...localTechs[idx], ...req.body };
    saveLocalTechnicians(localTechs);
    return res.json(localTechs[idx]);
  }
  return res.json({ id, ...req.body });
});

app.delete('/api/technicians/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  if (isDatabaseConfigured) {
    try {
      await prisma.technician.delete({ where: { id } });
      return res.json({ success: true });
    } catch (error: any) {
      return res.status(500).json({ error: 'Erro ao excluir técnico no PostgreSQL', details: error.message });
    }
  }

  const localTechs = loadLocalTechnicians().filter(t => t.id !== id);
  saveLocalTechnicians(localTechs);
  return res.json({ success: true });
});

// ==========================================
// Rotas de Anexos com MinIO (PDF / Imagens / Vídeos / Documentos)
// ==========================================

// Upload de anexo vinculado a uma DCN com contingência local
app.post('/api/dcns/:id/attachments', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { category = 'DOCUMENTO_COMPLEMENTAR', uploadedBy = 'Engenharia' } = req.body;

    const fileExt = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const objectKey = `dcns/${id}/${Date.now()}-${sanitizedBase}${fileExt}`;
    const localFileName = objectKey.replace(/\//g, '_');

    // 1. Salvar cópia local em uploads/
    try {
      const uploadsDir = path.join(process.cwd(), 'uploads');
      if (!fs.existsSync(uploadsDir)) {
        fs.mkdirSync(uploadsDir, { recursive: true });
      }
      fs.writeFileSync(path.join(uploadsDir, localFileName), file.buffer);
    } catch (fsErr) {
      console.warn('[Uploads FS] Falha ao gravar cópia local:', fsErr);
    }

    // 2. Upload MinIO se disponível
    try {
      await uploadFileToMinio(objectKey, file.buffer, file.size, file.mimetype);
    } catch (minioErr) {
      // MinIO indisponível
    }

    let dcn: any = null;
    try {
      dcn = await prisma.dCN.findFirst({
        where: { OR: [{ id }, { dcnNumber: id }] }
      });
    } catch {}

    const newAttachment = {
      id: `att-${Date.now()}`,
      dcnId: dcn ? dcn.id : id,
      name: file.originalname,
      type: detectFileType(file.mimetype, file.originalname),
      size: formatFileSize(file.size),
      category: category as any,
      uploadedAt: new Date().toISOString().split('T')[0],
      uploadedBy: uploadedBy,
      objectKey: objectKey,
      mimeType: file.mimetype,
      url: `/api/attachments/${localFileName}/file`
    };

    if (isDatabaseConfigured) {
      if (!dcn) {
        return res.status(404).json({ error: 'DCN não encontrada no banco de dados' });
      }
      try {
        const attachment = await prisma.dCNAttachment.create({
          data: newAttachment
        });
        await prisma.dCNAttachment.update({
          where: { id: attachment.id },
          data: { url: `/api/attachments/${attachment.id}/file` }
        });
        await prisma.auditLogEntry.create({
          data: {
            dcnId: dcn.id,
            timestamp: new Date().toISOString(),
            user: uploadedBy,
            userRole: 'Engenheiro Responsável',
            action: 'Anexo Adicionado',
            comment: `Arquivo "${file.originalname}" (${formatFileSize(file.size)}) adicionado aos anexos.`
          }
        });
        return res.status(201).json(attachment);
      } catch (error: any) {
        console.error('[Upload Anexo] Erro PostgreSQL:', error);
        return res.status(500).json({ error: 'Falha ao processar upload do anexo no PostgreSQL', details: error.message });
      }
    }

    // Sincronizar em contingência local (desenvolvimento offline)
    try {
      const localDcns = loadLocalDCNs();
      const target = localDcns.find(d => d.id === id || d.dcnNumber === id);
      if (target) {
        target.attachments = target.attachments || [];
        target.attachments.unshift(newAttachment);
        target.auditTrail = target.auditTrail || [];
        target.auditTrail.unshift({
          id: `aud-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
          user: uploadedBy,
          userRole: 'Engenheiro Responsável',
          action: 'Anexo Adicionado',
          comment: `Arquivo "${file.originalname}" (${formatFileSize(file.size)}) adicionado aos anexos.`
        });
        saveLocalDCNs(localDcns);
      }
    } catch {}

    return res.status(201).json(newAttachment);
  } catch (error: any) {
    console.error('[Upload Anexo] Erro:', error);
    res.status(500).json({ error: 'Falha ao processar upload do anexo', details: error.message });
  }
});

function getUploadCandidateDirs(): string[] {
  const currentDir = typeof __dirname !== 'undefined' ? __dirname : process.cwd();
  const candidates = [
    path.join(process.cwd(), 'uploads'),
    path.join(currentDir, '..', 'uploads'),
    path.join(currentDir, 'uploads')
  ];
  return Array.from(new Set(candidates.filter(dir => fs.existsSync(dir))));
}

// Helper para obter Buffer de anexo (via MinIO ou contingência local)
async function getAttachmentBuffer(objectKey: string): Promise<Buffer | null> {
  try {
    const stream = await getFileStreamFromMinio(objectKey);
    const chunks: Buffer[] = [];
    return await new Promise<Buffer>((resolve, reject) => {
      stream.on('data', (chunk: any) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err: any) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  } catch (minioErr) {
    // MinIO indisponível ou erro no streaming
  }

  const sanitizedKey = objectKey.replace(/\//g, '_');
  for (const dir of getUploadCandidateDirs()) {
    try {
      const localPath = path.join(dir, sanitizedKey);
      if (fs.existsSync(localPath)) {
        return fs.readFileSync(localPath);
      }
    } catch (fsErr) {
      console.warn(`[Attachment Buffer] Erro ao ler arquivo local para ${objectKey}:`, fsErr);
    }
  }

  return null;
}

// Streaming / Download de anexo armazenado no MinIO ou contingência local uploads/
app.get('/api/attachments/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;

    // 1. Verificar contingência direta no diretório local uploads/
    for (const uploadsDir of getUploadCandidateDirs()) {
      try {
        const directLocal = path.join(uploadsDir, id);
        if (fs.existsSync(directLocal)) {
          const stat = fs.statSync(directLocal);
          const isDownload = req.query.download === 'true';
          const isPdf = id.toLowerCase().endsWith('.pdf');
          res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
          res.setHeader('Content-Length', stat.size);
          res.setHeader(
            'Content-Disposition',
            `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(id)}"`
          );
          return fs.createReadStream(directLocal).pipe(res);
        }

        // 1.1 Se o id não for o nome exato, buscar arquivo que contenha o id
        const files = fs.readdirSync(uploadsDir);
        const match = files.find(f => f === id || f.includes(id) || (id.startsWith('att-') && f.includes(id.replace('att-', ''))));
        if (match) {
          const fullPath = path.join(uploadsDir, match);
          const stat = fs.statSync(fullPath);
          const isDownload = req.query.download === 'true';
          const isPdf = match.toLowerCase().endsWith('.pdf');
          res.setHeader('Content-Type', isPdf ? 'application/pdf' : 'application/octet-stream');
          res.setHeader('Content-Length', stat.size);
          res.setHeader(
            'Content-Disposition',
            `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(match)}"`
          );
          return fs.createReadStream(fullPath).pipe(res);
        }
      } catch {}
    }

    let attachment: any = null;
    try {
      attachment = await prisma.dCNAttachment.findUnique({ where: { id } });
    } catch {
      // Prisma offline
    }

    if (!attachment || !attachment.objectKey) {
      return res.status(404).json({ error: 'Arquivo do anexo não encontrado ou sem chave MinIO.' });
    }

    let stream: any = null;
    let size = 0;
    try {
      const stat = await getFileStatFromMinio(attachment.objectKey);
      stream = await getFileStreamFromMinio(attachment.objectKey);
      size = stat.size;
    } catch (minioErr) {
      let foundStream: any = null;
      const sanitizedKey = attachment.objectKey.replace(/\//g, '_');
      for (const dir of getUploadCandidateDirs()) {
        const localPath = path.join(dir, sanitizedKey);
        if (fs.existsSync(localPath)) {
          const localStat = fs.statSync(localPath);
          size = localStat.size;
          foundStream = fs.createReadStream(localPath);
          break;
        }
      }
      if (foundStream) {
        stream = foundStream;
      } else {
        throw minioErr;
      }
    }

    const isDownload = req.query.download === 'true';

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', size);
    res.setHeader(
      'Content-Disposition',
      `${isDownload ? 'attachment' : 'inline'}; filename="${encodeURIComponent(attachment.name)}"`
    );

    stream.pipe(res);
  } catch (error: any) {
    console.error('[Download Anexo MinIO] Erro:', error);
    res.status(500).json({ error: 'Falha ao buscar arquivo no MinIO', details: error.message });
  }
});

// Exclusão de anexo no MinIO e no banco de dados
app.delete('/api/dcns/:id/attachments/:attachmentId', async (req: Request, res: Response) => {
  const { id, attachmentId } = req.params;
  const user = (req.query.user as string) || 'Engenharia';

  if (isDatabaseConfigured) {
    try {
      const attachment = await prisma.dCNAttachment.findUnique({
        where: { id: attachmentId }
      });

      if (attachment) {
        if (attachment.objectKey) {
          await deleteFileFromMinio(attachment.objectKey).catch(() => {});
        }

        await prisma.dCNAttachment.delete({
          where: { id: attachmentId }
        });

        await prisma.auditLogEntry.create({
          data: {
            dcnId: id,
            timestamp: new Date().toISOString(),
            user: user,
            userRole: 'Engenheiro Responsável',
            action: 'Anexo Removido',
            comment: `Arquivo "${attachment.name}" removido do MinIO e do sistema.`
          }
        });
      }
      return res.json({ success: true, message: 'Anexo excluído com sucesso do PostgreSQL.' });
    } catch (error: any) {
      console.error('[Exclusão Anexo PostgreSQL] Erro:', error);
      return res.status(500).json({ error: 'Erro ao excluir anexo no PostgreSQL', details: error.message });
    }
  }

  // Fallback offline (desenvolvimento local)
  try {
    const localDcns = loadLocalDCNs();
    const target = localDcns.find(d => d.id === id || d.dcnNumber === id);
    if (target && target.attachments) {
      target.attachments = target.attachments.filter((a: any) => a.id !== attachmentId);
      saveLocalDCNs(localDcns);
    }
  } catch {}

  return res.json({ success: true, message: 'Anexo excluído com sucesso.' });
});

// ==========================================
// Serviço de Notificações Recorrentes
// ==========================================
let notificationSettingsMemory: NotificationSettings = loadLocalNotificationSettings();
let notificationLogsMemory: NotificationLogEntry[] = loadLocalNotificationLogs();
const lastExecutedRuleDate: Record<string, string> = {};

app.get('/api/notifications/settings', (_req: Request, res: Response) => {
  res.json(notificationSettingsMemory);
});

app.put('/api/notifications/settings', (req: Request, res: Response) => {
  notificationSettingsMemory = {
    ...notificationSettingsMemory,
    ...req.body
  };
  saveLocalNotificationSettings(notificationSettingsMemory);
  res.json(notificationSettingsMemory);
});

app.get('/api/notifications/logs', (_req: Request, res: Response) => {
  notificationLogsMemory = notificationLogsMemory.filter(l => l.dcnCount && l.dcnCount > 0);
  res.json(notificationLogsMemory);
});

app.delete('/api/notifications/logs', (_req: Request, res: Response) => {
  notificationLogsMemory = [];
  saveLocalNotificationLogs(notificationLogsMemory);
  res.json({ success: true, message: 'Histórico de notificações limpo com sucesso.' });
});

// ==========================================
// Envio Automático de E-mail de Encerramento da DCN
// ==========================================
const lastClosureNotificationSent: Record<string, number> = {};

async function sendDCNClosureNotification(
  dcnId: string,
  performedBy?: string,
  clientDcn?: any,
  clientAttachment?: { base64: string; filename: string; contentType?: string },
  forceSend = false
): Promise<{ success: boolean; smtpSent?: boolean; detail?: string; error?: string }> {
  try {
    let fullDcn: any = null;
    try {
      fullDcn = await prisma.dCN.findFirst({
        where: { OR: [{ id: dcnId }, { dcnNumber: dcnId }] },
        include: {
          materials: true,
          training: { include: { attendeesList: true } },
          implementationChecklist: true,
          attachments: true,
          auditTrail: { orderBy: { createdAt: 'desc' } }
        }
      });
    } catch {
      // Prisma offline
    }

    if (!fullDcn && clientDcn) {
      fullDcn = clientDcn;
    }

    if (!fullDcn && !isDatabaseConfigured) {
      const local = loadLocalDCNs().find(d => d.id === dcnId || d.dcnNumber === dcnId);
      if (local) fullDcn = local;
    }

    if (!fullDcn) {
      console.warn(`[sendDCNClosureNotification] DCN ${dcnId} não localizada no banco nem no payload.`);
      return { success: false, detail: 'DCN não encontrada' };
    }

    const dcnKey = fullDcn.dcnNumber || dcnId;
    const now = Date.now();
    if (!forceSend && lastClosureNotificationSent[dcnKey] && (now - lastClosureNotificationSent[dcnKey] < 8000)) {
      console.log(`[sendDCNClosureNotification] Notificação de encerramento para ${dcnKey} já disparada há menos de 8s. Deduplicação aplicada.`);
      return { success: true, smtpSent: true, detail: 'Notificação já processada recentemente para esta DCN.' };
    }

    let usersList: any[] = [];
    try {
      usersList = await prisma.user.findMany();
    } catch {
      usersList = INITIAL_USERS;
    }

    // 1. Localizar e preparar arquivo oficial de treinamento (categoria REGISTRO_TREINAMENTO)
    const attachmentsToSend: { filename: string; content: Buffer; contentType?: string }[] = [];
    let hasTrainingAttachment = false;
    let attachmentName: string | undefined = undefined;

    // A) Se anexo veio do cliente em base64
    if (clientAttachment && clientAttachment.base64 && clientAttachment.base64.trim()) {
      try {
        const cleanBase64 = clientAttachment.base64.includes(',')
          ? clientAttachment.base64.split(',')[1]
          : clientAttachment.base64;
        const buf = Buffer.from(cleanBase64, 'base64');
        if (buf.length > 0) {
          hasTrainingAttachment = true;
          attachmentName = clientAttachment.filename || 'Registro_Treinamento.pdf';
          attachmentsToSend.push({
            filename: attachmentName,
            content: buf,
            contentType: clientAttachment.contentType || 'application/pdf'
          });
        }
      } catch (err: any) {
        console.warn('[DCN Encerramento] Erro ao decodificar base64 do cliente:', err.message);
      }
    }

    // B) Se não veio do cliente, buscar nos anexos da DCN
    if (!hasTrainingAttachment) {
      let trainingAttachment = (fullDcn.attachments || []).find(
        (att: any) => att.category === 'REGISTRO_TREINAMENTO'
      );

      // Fallback: se não houver categoria REGISTRO_TREINAMENTO, pegar o primeiro PDF anexado ou primeiro anexo
      if (!trainingAttachment && (fullDcn.attachments || []).length > 0) {
        trainingAttachment = (fullDcn.attachments || []).find(
          (att: any) => att.type === 'PDF' || (att.name && att.name.toLowerCase().endsWith('.pdf'))
        ) || fullDcn.attachments[0];
      }

      if (trainingAttachment) {
        attachmentName = trainingAttachment.name;

        // 1. Tentar ler de base64 no anexo
        if (trainingAttachment.base64) {
          try {
            const clean = trainingAttachment.base64.includes(',')
              ? trainingAttachment.base64.split(',')[1]
              : trainingAttachment.base64;
            const buf = Buffer.from(clean, 'base64');
            if (buf.length > 0) {
              hasTrainingAttachment = true;
              attachmentsToSend.push({
                filename: trainingAttachment.name,
                content: buf,
                contentType: trainingAttachment.mimeType || 'application/pdf'
              });
            }
          } catch {}
        }

        // 2. Tentar via MinIO ou uploads/
        if (!hasTrainingAttachment && trainingAttachment.objectKey) {
          const buffer = await getAttachmentBuffer(trainingAttachment.objectKey);
          if (buffer) {
            hasTrainingAttachment = true;
            attachmentsToSend.push({
              filename: trainingAttachment.name,
              content: buffer,
              contentType: trainingAttachment.mimeType || 'application/pdf'
            });
          }
        }

        // 3. Fallback: buscar nas pastas uploads/ por nome de arquivo ou ID da DCN
        if (!hasTrainingAttachment) {
          for (const uploadsDir of getUploadCandidateDirs()) {
            try {
              const files = fs.readdirSync(uploadsDir);
              const cleanTarget = (trainingAttachment.name || '').toLowerCase().replace(/[^a-z0-9]/g, '');
              const match = files.find(f => {
                const cleanF = f.toLowerCase().replace(/[^a-z0-9]/g, '');
                return (cleanTarget && cleanF.includes(cleanTarget)) || (f.includes(dcnId) && f.toLowerCase().endsWith('.pdf'));
              });
              if (match) {
                const buf = fs.readFileSync(path.join(uploadsDir, match));
                hasTrainingAttachment = true;
                attachmentsToSend.push({
                  filename: trainingAttachment.name,
                  content: buf,
                  contentType: trainingAttachment.mimeType || 'application/pdf'
                });
                console.log(`[sendDCNClosureNotification] Anexo recuperado da pasta uploads/ (${match}): ${buf.length} bytes`);
                break;
              }
            } catch (diskErr: any) {
              console.warn('[DCN Encerramento] Erro ao ler uploads local:', diskErr.message);
            }
          }
        }
      }
    }

    // C) Se ainda não encontrou, verificar nas pastas uploads/ qualquer arquivo desta DCN ou de treinamento
    if (!hasTrainingAttachment) {
      for (const uploadsDir of getUploadCandidateDirs()) {
        try {
          const files = fs.readdirSync(uploadsDir);
          const dcnKey = dcnId ? dcnId.toLowerCase() : '';
          const dcnNum = fullDcn.dcnNumber ? fullDcn.dcnNumber.toLowerCase().replace(/[^a-z0-9]/g, '') : '';
          const match = files.reverse().find(f => {
            const cleanF = f.toLowerCase();
            return (
              (dcnKey && cleanF.includes(dcnKey)) ||
              (dcnNum && cleanF.replace(/[^a-z0-9]/g, '').includes(dcnNum)) ||
              cleanF.includes('training') ||
              cleanF.includes('treinamento')
            ) && cleanF.endsWith('.pdf');
          });

          if (match) {
            const buf = fs.readFileSync(path.join(uploadsDir, match));
            hasTrainingAttachment = true;
            const parts = match.split('_');
            const originalName = parts.length > 2 ? parts.slice(2).join('_') : match;
            attachmentName = originalName || 'Registro_Treinamento.pdf';
            attachmentsToSend.push({
              filename: attachmentName,
              content: buf,
              contentType: 'application/pdf'
            });
            console.log(`[sendDCNClosureNotification] Anexo original recuperado de uploads/ (${match}): ${buf.length} bytes`);
            break;
          }
        } catch (e: any) {
          console.warn('[sendDCNClosureNotification] Erro ao buscar em uploads:', e.message);
        }
      }
    }

    // 1.1 Se após todas as tentativas não houver binário mas a DCN possui registro ou anexo de treinamento
    if (!hasTrainingAttachment) {
      try {
        const generatedBase64 = generateTrainingEvidencePDF(fullDcn as any);
        const buf = Buffer.from(generatedBase64, 'base64');
        if (buf.length > 0) {
          hasTrainingAttachment = true;
          attachmentName = 'Registro_Treinamento.pdf';
          attachmentsToSend.push({
            filename: attachmentName,
            content: buf,
            contentType: 'application/pdf'
          });
          console.log(`[sendDCNClosureNotification] Anexo gerado automaticamente a partir dos dados da DCN: ${buf.length} bytes`);
        }
      } catch (genErr: any) {
        console.warn('[sendDCNClosureNotification] Falha ao sintetizar PDF de treinamento:', genErr.message);
      }
    }

    console.log(`[DCN Encerramento] Preparando envio de e-mail. Anexos anexados: ${attachmentsToSend.length} (${attachmentsToSend.map(a => a.filename).join(', ')})`);

    // 2. Destinatários: Para (diretos + responsável) e Cc (cópia fixa)
    const { to, cc } = resolveClosureRecipients(fullDcn as any, usersList, notificationSettingsMemory);

    const safeTo = to.length > 0 ? to : (notificationSettingsMemory.fixedRecipients || []);
    const safeCc = to.length > 0 ? cc : [];

    if (safeTo.length === 0 && safeCc.length === 0) {
      console.log(`[DCN Encerramento] Sem destinatários configurados para ${fullDcn.dcnNumber}.`);
      return { success: false, detail: 'Nenhum destinatário configurado nas opções de notificação.' };
    }

    // 3. Montar corpo de e-mail corporativo simplificado
    const { subject, html } = buildDCNClosureEmailHTML(
      fullDcn as any,
      hasTrainingAttachment,
      attachmentName
    );

    // 4. Enviar via SMTP
    let smtpSent = false;
    let detailMsg = '';
    if (notificationSettingsMemory.smtpEnabled) {
      const smtpRes = await sendSmtpEmail({
        settings: notificationSettingsMemory,
        to: safeTo,
        cc: safeCc,
        subject,
        html,
        attachments: attachmentsToSend
      });
      smtpSent = smtpRes.sent;
      detailMsg = smtpRes.detail;
      if (smtpSent) {
        lastClosureNotificationSent[dcnKey] = now;
      }
      console.log(`[DCN Encerramento SMTP] ${detailMsg}`);
    } else {
      detailMsg = 'SMTP desabilitado nas configurações';
    }

    // 5. Histórico de Notificações
    const closureLog: NotificationLogEntry = {
      id: `notif-closure-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString().replace('T', ' ').slice(0, 16),
      ruleType: 'WEEKLY_PENDING' as any,
      title: `Encerramento de DCN (${fullDcn.dcnNumber})`,
      subject,
      recipients: safeTo,
      ccRecipients: safeCc,
      dcnCount: 1,
      dcnNumbers: [fullDcn.dcnNumber],
      triggerMode: 'AUTOMATICO',
      status: smtpSent ? 'ENVIADO_SMTP' : 'REGISTRADO_SISTEMA',
      htmlPreview: html
    };
    notificationLogsMemory = [closureLog, ...notificationLogsMemory.filter(l => l.dcnCount && l.dcnCount > 0)].slice(0, 100);
    saveLocalNotificationLogs(notificationLogsMemory);

    // 6. Trilha de Auditoria (protegido se DB offline)
    try {
      await prisma.auditLogEntry.create({
        data: {
          dcnId: fullDcn.id,
          timestamp: new Date().toISOString(),
          user: performedBy || fullDcn.closedBy || 'Sistema',
          userRole: 'Engenharia de Processos',
          action: 'Notificação de Encerramento',
          comment: `Comunicado de encerramento enviado por e-mail para: [${safeTo.join(', ')}]${safeCc.length > 0 ? ` (Cc: [${safeCc.join(', ')}])` : ''}${hasTrainingAttachment ? ` com anexo de treinamento "${attachmentName}"` : ' (sem anexo de treinamento)'}. Status: ${smtpSent ? 'Enviado via SMTP' : 'Gravado no sistema'}.`
        }
      });
    } catch {}

    return { success: true, smtpSent, detail: detailMsg };
  } catch (err: any) {
    console.error('[sendDCNClosureNotification] Erro:', err);
    return { success: false, error: err.message };
  }
}

// Rota explícita para notificação de encerramento
app.post('/api/dcns/:id/notify-closure', async (req: Request, res: Response) => {
  const { id } = req.params;
  const { user, dcn, attachmentBase64, attachmentName, attachmentType, settings, force } = req.body || {};
  if (settings) {
    notificationSettingsMemory = { ...notificationSettingsMemory, ...settings };
  }
  const result = await sendDCNClosureNotification(
    id,
    user,
    dcn,
    attachmentBase64 ? { base64: attachmentBase64, filename: attachmentName, contentType: attachmentType } : undefined,
    force !== false
  );
  res.json(result);
});

app.post('/api/notifications/trigger', async (req: Request, res: Response) => {
  const { entry, settings } = req.body;
  if (settings) {
    notificationSettingsMemory = { ...notificationSettingsMemory, ...settings };
  }
  if (!entry) {
    return res.status(400).json({ error: 'Dados da notificação não informados.' });
  }

  // Se não houver DCNs elegíveis (dcnCount === 0), não envia e-mail e não salva no histórico de envios
  if (!entry.dcnCount || entry.dcnCount === 0 || !entry.dcnNumbers || entry.dcnNumbers.length === 0) {
    console.log(`[Notification Service] Disparo ignorado (${entry.triggerMode}): 0 DCNs associadas à regra ${entry.ruleType}.`);
    return res.json({
      ...entry,
      status: 'SEM_PENDENCIAS',
      skipped: true,
      message: 'Nenhum e-mail enviado pois não há DCNs elegíveis (não encerradas ou com SLA vencido).'
    });
  }

  let smtpSent = false;
  let smtpDetail = '';
  if (notificationSettingsMemory.smtpEnabled && ((entry.recipients && entry.recipients.length > 0) || (entry.ccRecipients && entry.ccRecipients.length > 0))) {
    const result = await sendSmtpEmail({
      settings: notificationSettingsMemory,
      to: entry.recipients || [],
      cc: entry.ccRecipients || [],
      subject: entry.subject,
      html: entry.htmlPreview
    });
    smtpSent = result.sent;
    smtpDetail = result.detail;
    console.log(`[SMTP Poste.io] ${result.detail}`);
  } else if (!notificationSettingsMemory.smtpEnabled) {
    smtpDetail = 'O envio externo via SMTP está desativado nas configurações.';
  } else {
    smtpDetail = 'Nenhum destinatário informado para recebimento.';
  }

  const savedEntry: NotificationLogEntry = {
    ...entry,
    status: smtpSent ? 'ENVIADO_SMTP' : 'REGISTRADO_SISTEMA',
    message: smtpDetail
  };
  notificationLogsMemory = [savedEntry, ...notificationLogsMemory.filter(l => l.dcnCount && l.dcnCount > 0)].slice(0, 100);
  saveLocalNotificationLogs(notificationLogsMemory);
  console.log(
    `[Notification Service] Disparo (${savedEntry.triggerMode}): "${savedEntry.subject}" -> [${savedEntry.recipients.join(', ')}] (${savedEntry.dcnCount} DCNs) - Status: ${savedEntry.status} (${smtpDetail})`
  );
  res.json(savedEntry);
});

app.post('/api/notifications/test-smtp', async (req: Request, res: Response) => {
  const settings: NotificationSettings = {
    ...notificationSettingsMemory,
    ...(req.body?.settings || {})
  };
  const customRecipient = (req.body?.testRecipient || '').trim();
  if (customRecipient) {
    settings.fixedRecipients = [
      customRecipient,
      ...(settings.fixedRecipients || []).filter(
        r => r.toLowerCase() !== customRecipient.toLowerCase() && r !== 'jmiranda@ctdi.com' && r !== 'jmiranda@ctdibrasil.com.br'
      )
    ];
  }
  notificationSettingsMemory = settings;

  const recipients = customRecipient
    ? [customRecipient]
    : settings.fixedRecipients && settings.fixedRecipients.length > 0
    ? settings.fixedRecipients
    : [settings.smtpUser || 'admin@ctdibrasil.com.br'];

  let dcnsList: any[] = Array.isArray(req.body?.dcns) ? req.body.dcns : [];
  if (dcnsList.length === 0) {
    try {
      if (process.env.DATABASE_URL) {
        dcnsList = await prisma.dCN.findMany({
          include: {
            materials: true,
            training: { include: { attendeesList: true } },
            attachments: true,
            auditTrail: true,
            implementationChecklist: true
          }
        });
      }
    } catch {
      dcnsList = [];
    }
    if (!isDatabaseConfigured && (!dcnsList || dcnsList.length === 0)) {
      dcnsList = loadLocalDCNs();
    }
  }

  const openDcns = filterDCNsForRule(dcnsList as any, 'WEEKLY_PENDING', settings);
  const { subject, html } = buildNotificationEmailHTML('WEEKLY_PENDING', openDcns, settings);

  const result = await sendSmtpEmail({
    settings,
    to: recipients,
    subject,
    html
  });

  if (!result.sent) {
    return res.status(400).json({ error: result.detail });
  }
  res.json({ success: true, message: result.detail });
});

// Agendador recorrente em background (verifica a cada 60 segundos)
setInterval(async () => {
  try {
    const now = new Date();
    const todayKey = now.toISOString().split('T')[0];
    const currentHHMM = now.toTimeString().slice(0, 5);
    const currentDay = now.getDay();

    const checkAndRun = async (ruleKey: 'WEEKLY_PENDING' | 'DAILY_OVERDUE' | 'SLA_APPROACHING') => {
      const execKey = `${ruleKey}_${todayKey}`;
      if (lastExecutedRuleDate[execKey]) return;
      lastExecutedRuleDate[execKey] = currentHHMM;

      let dcnsList: any[] = [];
      try {
        if (process.env.DATABASE_URL) {
          dcnsList = await prisma.dCN.findMany({
            include: { materials: true, training: { include: { attendeesList: true } }, attachments: true }
          });
        }
      } catch {
        dcnsList = [];
      }
      if (!isDatabaseConfigured && (!dcnsList || dcnsList.length === 0)) {
        dcnsList = loadLocalDCNs();
      }

      // Validação: não envia e-mail se não houver DCNs elegíveis (não encerradas / com SLA vencido)
      const targetDCNs = filterDCNsForRule(dcnsList as any, ruleKey, notificationSettingsMemory);
      if (!targetDCNs || targetDCNs.length === 0) {
        console.log(`[Scheduler Recorrente] Regra ${ruleKey} verificada às ${currentHHMM}: 0 DCNs elegíveis (nenhuma DCN não encerrada ou com SLA vencido). Envio de e-mail dispensado.`);
        return;
      }

      const entry = createNotificationLogEntry(
        ruleKey,
        dcnsList as any,
        INITIAL_USERS,
        notificationSettingsMemory,
        'AUTOMATICO',
        undefined,
        false
      );
      if (notificationSettingsMemory.smtpEnabled && ((entry.recipients && entry.recipients.length > 0) || (entry.ccRecipients && entry.ccRecipients.length > 0)) && entry.dcnCount > 0) {
        const resSmtp = await sendSmtpEmail({
          settings: notificationSettingsMemory,
          to: entry.recipients || [],
          cc: entry.ccRecipients || [],
          subject: entry.subject,
          html: entry.htmlPreview
        });
        if (resSmtp.sent) {
          entry.status = 'ENVIADO_SMTP';
        }
      }
      notificationLogsMemory = [entry, ...notificationLogsMemory.filter(l => l.dcnCount && l.dcnCount > 0)].slice(0, 100);
      saveLocalNotificationLogs(notificationLogsMemory);
      console.log(`[Scheduler Recorrente] Executado ${ruleKey} às ${currentHHMM}: ${entry.subject} (${entry.dcnCount} DCNs)`);
    };

    // 1. Regra Semanal (WEEKLY_PENDING):
    // Verifica se hoje é o dia alvo (ex: Segunda-feira às 08:00) OU se é o 1º dia útil subsequente caso o dia alvo tenha caído em feriado
    if (notificationSettingsMemory.weeklyPendingEnabled && currentHHMM === notificationSettingsMemory.weeklyTime) {
      const weekKey = getWeekKey(now);
      const weeklyExecKey = `WEEKLY_PENDING_${weekKey}`;

      if (!lastExecutedRuleDate[weeklyExecKey]) {
        const targetDay = notificationSettingsMemory.weeklyDayOfWeek ?? 1; // 1 = Segunda-feira
        const isTodayBusinessDay = isBusinessDay(now, notificationSettingsMemory.customHolidays);
        let shouldExecuteWeekly = false;

        if (isTodayBusinessDay) {
          if (currentDay === targetDay) {
            // Hoje é exatamente o dia configurado e é dia útil
            shouldExecuteWeekly = true;
          } else if (
            notificationSettingsMemory.postponeHolidayToNextBusinessDay !== false &&
            currentDay > targetDay
          ) {
            // Se hoje é posterior ao dia alvo na mesma semana, verificar se todos os dias anteriores desde targetDay foram feriados/não-úteis
            let allPreviousDaysWereNonBusiness = true;
            for (let d = targetDay; d < currentDay; d++) {
              const pastDate = new Date(now);
              pastDate.setDate(pastDate.getDate() - (currentDay - d));
              if (isBusinessDay(pastDate, notificationSettingsMemory.customHolidays)) {
                allPreviousDaysWereNonBusiness = false;
                break;
              }
            }
            if (allPreviousDaysWereNonBusiness) {
              shouldExecuteWeekly = true;
              console.log(`[Scheduler Recorrente] Envio semanal postergado de feriado sendo executado no 1º dia útil da semana (${todayKey}).`);
            }
          }
        }

        if (shouldExecuteWeekly) {
          await checkAndRun('WEEKLY_PENDING');
          lastExecutedRuleDate[weeklyExecKey] = todayKey;
        }
      }
    }

    // 2. Regras Diárias (DAILY_OVERDUE e SLA_APPROACHING):
    // Respeitam skipHolidaysAndWeekends para não incomodar colaboradores em dias de folga/feriados
    const isTodayBusinessDay = isBusinessDay(now, notificationSettingsMemory.customHolidays);
    const allowDaily = notificationSettingsMemory.skipHolidaysAndWeekends !== false ? isTodayBusinessDay : true;

    if (allowDaily) {
      if (
        notificationSettingsMemory.dailyOverdueEnabled &&
        currentHHMM === notificationSettingsMemory.dailyTime
      ) {
        await checkAndRun('DAILY_OVERDUE');
      }

      if (
        notificationSettingsMemory.slaApproachingEnabled &&
        currentHHMM === notificationSettingsMemory.slaTime
      ) {
        await checkAndRun('SLA_APPROACHING');
      }
    }
  } catch (err: any) {
    console.warn('[Scheduler Recorrente] Erro na verificação periódica:', err.message);
  }
}, 60 * 1000);

// 404 handler for unmatched API routes
app.all('/api/*', (_req: Request, res: Response) => {
  res.status(404).json({ error: 'Endpoint da API não encontrado' });
});

// Serve frontend static build in production (dist directory)
const distPath = path.resolve(process.cwd(), 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get('*', (_req: Request, res: Response) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

async function syncDatabaseOnStartup() {
  if (!isDatabaseConfigured) {
    return;
  }
  try {
    // 0. Garantir que as colunas revision e productFamily existam na tabela dcns
    try {
      await prisma.$executeRawUnsafe('ALTER TABLE "dcns" ADD COLUMN IF NOT EXISTS "revision" TEXT;');
      await prisma.$executeRawUnsafe('ALTER TABLE "dcns" ADD COLUMN IF NOT EXISTS "productFamily" TEXT;');
    } catch {
      // ignora se a tabela ainda não existir
    }

    // 1. Remover DCNs e Técnicos de simulação legados caso existam no banco (apenas números de simulação)
    if (LEGACY_DEMO_DCN_NUMBERS.length > 0) {
      const deletedDCNs = await prisma.dCN.deleteMany({
        where: {
          dcnNumber: { in: LEGACY_DEMO_DCN_NUMBERS }
        }
      });
      if (deletedDCNs.count > 0) {
        console.log(`[Startup Cleanup] ${deletedDCNs.count} DCN(s) de simulação removida(s) do PostgreSQL.`);
      }
    }

    const deletedTechs = await prisma.technician.deleteMany({
      where: {
        OR: [
          { id: { in: LEGACY_DEMO_TECH_IDS } },
          { badge: { in: LEGACY_DEMO_TECH_BADGES } }
        ]
      }
    });
    if (deletedTechs.count > 0) {
      console.log(`[Startup Cleanup] ${deletedTechs.count} técnico(s) de simulação removido(s) do PostgreSQL.`);
    }

    // 2. Garantir usuários iniciais e remover usuários fictícios legados
    if ((prisma as any).user) {
      await (prisma as any).user.deleteMany({
        where: {
          OR: [
            { id: { in: LEGACY_DEMO_USER_IDS } },
            { login: { in: LEGACY_DEMO_USER_LOGINS } }
          ]
        }
      });
      const userCount = await (prisma as any).user.count();
      if (userCount === 0) {
        for (const u of INITIAL_USERS) {
          await (prisma as any).user.upsert({
            where: { login: u.login },
            update: {},
            create: {
              id: u.id,
              login: u.login,
              nome: u.nome,
              role: u.role,
              senha: u.senha
            }
          });
        }
        console.log(`[Startup Users] ${INITIAL_USERS.length} usuários iniciais provisionados no PostgreSQL.`);
      }
    }
  } catch (err: any) {
    console.warn(`[Startup Sync] Aviso ao sincronizar banco de dados na inicialização: ${err.message}`);
  }
}

app.listen(PORT, () => {
  console.log(`[DCN API Server] Running on http://localhost:${PORT}`);
  syncDatabaseOnStartup();
  initMinio().catch(err => {
    console.warn(`[MinIO] Não foi possível conectar ao inicializar: ${err.message}`);
  });
});
