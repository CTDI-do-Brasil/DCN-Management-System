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
  filterDCNsForRule
} from '../src/utils/notificationTemplates';
import { NotificationLogEntry, NotificationSettings } from '../src/types';
import { sendSmtpEmail } from './smtpClient';

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

app.use(cors());
app.use(express.json());

// Healthcheck
app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    let minioStatus = 'connected';
    try {
      await minioClient.bucketExists(MINIO_BUCKET);
    } catch {
      minioStatus = 'disconnected';
    }
    res.json({ status: 'ok', database: 'connected', minio: minioStatus, timestamp: new Date().toISOString() });
  } catch (error: any) {
    res.status(503).json({
      status: 'degraded',
      database: 'disconnected',
      message: 'PostgreSQL database connection pending or unreachable.',
      error: error.message
    });
  }
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

    res.json(dcns);
  } catch (error: any) {
    console.error('Error fetching DCNs:', error);
    res.status(500).json({ error: 'Failed to fetch DCNs', details: error.message });
  }
});

// GET /api/dcns/:id - Single DCN
app.get('/api/dcns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const dcn = await prisma.dCN.findUnique({
      where: { id },
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
      return res.status(404).json({ error: 'DCN not found' });
    }

    res.json(dcn);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch DCN', details: error.message });
  }
});

// POST /api/dcns - Create new DCN
app.post('/api/dcns', async (req: Request, res: Response) => {
  try {
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
            status: training.status || 'PENDENTE',
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
            ...(auditTrail.length > 0 ? auditTrail.map((entry: any) => ({
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

    res.status(201).json(newDCN);
  } catch (error: any) {
    console.error('Error creating DCN:', error);
    let msg = 'Failed to create DCN';
    if (error.code === 'P2002') {
      msg = `Já existe uma DCN cadastrada com o número informado (${req.body?.dcnNumber || ''}).`;
    }
    res.status(500).json({ error: msg, details: error.message });
  }
});

// PUT /api/dcns/:id - Update DCN fields & audit
app.put('/api/dcns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { auditComment, user, userRole, ...fields } = req.body;

    const currentDCN = await prisma.dCN.findUnique({ where: { id } });
    if (!currentDCN) {
      return res.status(404).json({ error: 'DCN not found' });
    }

    if (fields.status === 'IMPLEMENTADA' && currentDCN.status === 'PRONTA_IMPLEMENTACAO') {
      const training = await prisma.trainingRecord.findUnique({ where: { dcnId: id } });
      if (!training?.scheduledDate || !training.scheduledDate.trim()) {
        return res.status(400).json({ error: 'O treinamento precisa estar agendado antes de avançar para a etapa de Implementação.' });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Create audit entry if status changed or comment provided
      if (auditComment || (fields.status && fields.status !== currentDCN.status)) {
        await tx.auditLogEntry.create({
          data: {
            dcnId: id,
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

      // Filter scalar fields for direct update
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

      // Sync materials if provided in update payload
      if (Array.isArray(fields.materials)) {
        await tx.materialItem.deleteMany({ where: { dcnId: id } });
        if (fields.materials.length > 0) {
          await tx.materialItem.createMany({
            data: fields.materials.map((m: any) => ({
              dcnId: id,
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

      // Sync training if provided in update payload
      if (fields.training && typeof fields.training === 'object') {
        const scheduledDateVal = fields.training.scheduledDate || null;
        await tx.trainingRecord.upsert({
          where: { dcnId: id },
          update: {
            instructor: fields.training.instructor || fields.responsible || currentDCN.responsible,
            targetAudience: fields.training.targetAudience || 'Líderes e Técnicos',
            department: fields.training.department || fields.area || currentDCN.area,
            scheduledDate: scheduledDateVal,
            status: scheduledDateVal ? 'AGENDADO' : 'PENDENTE'
          },
          create: {
            dcnId: id,
            instructor: fields.training.instructor || fields.responsible || currentDCN.responsible,
            targetAudience: fields.training.targetAudience || 'Líderes e Técnicos',
            department: fields.training.department || fields.area || currentDCN.area,
            scheduledDate: scheduledDateVal,
            status: scheduledDateVal ? 'AGENDADO' : 'PENDENTE'
          }
        });
      }

      return tx.dCN.update({
        where: { id },
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

    res.json(updated);
  } catch (error: any) {
    console.error('Error updating DCN:', error);
    res.status(500).json({ error: 'Failed to update DCN', details: error.message });
  }
});

// DELETE /api/dcns/:id
app.delete('/api/dcns/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.dCN.delete({ where: { id } });
    res.json({ success: true, message: 'DCN deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete DCN', details: error.message });
  }
});

// Material Endpoints
app.post('/api/dcns/:id/materials', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const material = await prisma.materialItem.create({
      data: {
        dcnId: id,
        ...req.body
      }
    });
    res.status(201).json(material);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add material', details: error.message });
  }
});

app.put('/api/dcns/:id/materials/:materialId', async (req: Request, res: Response) => {
  try {
    const { id, materialId } = req.params;
    const today = new Date().toISOString().split('T')[0];

    const updateData = { ...req.body };
    if ((updateData.status === 'RECEBIDO_ESTOQUE' || updateData.status === 'INSPECIONADO_APROVADO') && !updateData.arrivalDate) {
      updateData.arrivalDate = today;
    }

    const material = await prisma.materialItem.update({
      where: { id: materialId },
      data: updateData
    });

    // Se a DCN está no status AGUARDANDO_MATERIAL e agora todos os materiais estão recebidos em estoque,
    // recalcular o SLA para 3 dias úteis a contar do recebimento
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

    res.json(material);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update material', details: error.message });
  }
});

// Checklist Endpoints
app.post('/api/dcns/:id/checklists', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const item = await prisma.implementationChecklist.create({
      data: {
        dcnId: id,
        ...req.body
      }
    });
    res.status(201).json(item);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to add checklist item', details: error.message });
  }
});

app.put('/api/dcns/:id/checklists/:checklistId', async (req: Request, res: Response) => {
  try {
    const { checklistId } = req.params;
    const item = await prisma.implementationChecklist.update({
      where: { id: checklistId },
      data: req.body
    });
    res.json(item);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update checklist item', details: error.message });
  }
});

// Training Endpoints
app.put('/api/dcns/:id/training', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const trainingData = req.body;

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

    res.json(result);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update training record', details: error.message });
  }
});

// Technicians Endpoints
app.get('/api/technicians', async (_req: Request, res: Response) => {
  try {
    const techs = await prisma.technician.findMany({
      orderBy: { name: 'asc' }
    });
    res.json(techs);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to fetch technicians', details: error.message });
  }
});

app.post('/api/technicians', async (req: Request, res: Response) => {
  try {
    const data = {
      ...req.body,
      badge: req.body.badge || `TECH-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`,
      shift: req.body.shift || '',
      department: req.body.department || ''
    };
    const tech = await prisma.technician.create({
      data
    });
    res.status(201).json(tech);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to create technician', details: error.message });
  }
});

app.put('/api/technicians/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const tech = await prisma.technician.update({
      where: { id },
      data: req.body
    });
    res.json(tech);
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to update technician', details: error.message });
  }
});

app.delete('/api/technicians/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    await prisma.technician.delete({ where: { id } });
    res.json({ success: true });
  } catch (error: any) {
    res.status(500).json({ error: 'Failed to delete technician', details: error.message });
  }
});

// ==========================================
// Rotas de Anexos com MinIO (PDF / Imagens / Vídeos / Documentos)
// ==========================================

// Upload de anexo vinculado a uma DCN
app.post('/api/dcns/:id/attachments', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'Nenhum arquivo enviado.' });
    }

    const { category = 'DOCUMENTO_COMPLEMENTAR', uploadedBy = 'Engenharia' } = req.body;

    // Verificar se a DCN existe (por ID interno ou dcnNumber)
    const dcn = await prisma.dCN.findFirst({
      where: {
        OR: [
          { id },
          { dcnNumber: id }
        ]
      }
    });
    if (!dcn) {
      return res.status(404).json({ error: 'DCN não encontrada.' });
    }

    const fileExt = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const objectKey = `dcns/${dcn.id}/${Date.now()}-${sanitizedBase}${fileExt}`;

    // Upload do buffer para o bucket do MinIO
    await uploadFileToMinio(objectKey, file.buffer, file.size, file.mimetype);

    // Salvar registro no banco de dados via Prisma
    const attachment = await prisma.dCNAttachment.create({
      data: {
        dcnId: dcn.id,
        name: file.originalname,
        type: detectFileType(file.mimetype, file.originalname),
        size: formatFileSize(file.size),
        category: category,
        uploadedAt: new Date().toISOString().split('T')[0],
        uploadedBy: uploadedBy,
        objectKey: objectKey,
        mimeType: file.mimetype,
        url: '' // atualizado a seguir
      }
    });

    const updatedAttachment = await prisma.dCNAttachment.update({
      where: { id: attachment.id },
      data: { url: `/api/attachments/${attachment.id}/file` }
    });

    // Registrar na trilha de auditoria da DCN
    await prisma.auditLogEntry.create({
      data: {
        dcnId: dcn.id,
        timestamp: new Date().toISOString(),
        user: uploadedBy,
        userRole: 'Engenheiro Responsável',
        action: 'Anexo Adicionado',
        comment: `Arquivo "${file.originalname}" (${formatFileSize(file.size)}) enviado para o MinIO.`
      }
    });

    res.status(201).json(updatedAttachment);
  } catch (error: any) {
    console.error('[Upload Anexo MinIO] Erro:', error);
    res.status(500).json({ error: 'Falha ao processar upload do anexo no MinIO', details: error.message });
  }
});

// Streaming / Download de anexo armazenado no MinIO
app.get('/api/attachments/:id/file', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const attachment = await prisma.dCNAttachment.findUnique({ where: { id } });

    if (!attachment || !attachment.objectKey) {
      return res.status(404).json({ error: 'Arquivo do anexo não encontrado ou sem chave MinIO.' });
    }

    const stat = await getFileStatFromMinio(attachment.objectKey);
    const stream = await getFileStreamFromMinio(attachment.objectKey);
    const isDownload = req.query.download === 'true';

    res.setHeader('Content-Type', attachment.mimeType || 'application/octet-stream');
    res.setHeader('Content-Length', stat.size);
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
  try {
    const { id, attachmentId } = req.params;
    const user = (req.query.user as string) || 'Engenharia';

    const attachment = await prisma.dCNAttachment.findUnique({
      where: { id: attachmentId }
    });

    if (!attachment) {
      return res.status(404).json({ error: 'Anexo não encontrado.' });
    }

    // Excluir objeto do MinIO se houver chave associada
    if (attachment.objectKey) {
      await deleteFileFromMinio(attachment.objectKey);
    }

    // Excluir registro do Prisma
    await prisma.dCNAttachment.delete({
      where: { id: attachmentId }
    });

    // Auditoria
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

    res.json({ success: true, message: 'Anexo excluído com sucesso.' });
  } catch (error: any) {
    console.error('[Exclusão Anexo MinIO] Erro:', error);
    res.status(500).json({ error: 'Falha ao remover anexo', details: error.message });
  }
});

// ==========================================
// Serviço de Notificações Recorrentes
// ==========================================
let notificationSettingsMemory: NotificationSettings = { ...DEFAULT_NOTIFICATION_SETTINGS };
let notificationLogsMemory: NotificationLogEntry[] = [];
const lastExecutedRuleDate: Record<string, string> = {};

app.get('/api/notifications/settings', (_req: Request, res: Response) => {
  res.json(notificationSettingsMemory);
});

app.put('/api/notifications/settings', (req: Request, res: Response) => {
  notificationSettingsMemory = {
    ...notificationSettingsMemory,
    ...req.body
  };
  res.json(notificationSettingsMemory);
});

app.get('/api/notifications/logs', (_req: Request, res: Response) => {
  res.json(notificationLogsMemory);
});

app.post('/api/notifications/trigger', async (req: Request, res: Response) => {
  const { entry, settings } = req.body;
  if (settings) {
    notificationSettingsMemory = { ...notificationSettingsMemory, ...settings };
  }
  if (!entry) {
    return res.status(400).json({ error: 'Dados da notificação não informados.' });
  }

  let smtpSent = false;
  if (notificationSettingsMemory.smtpEnabled && ((entry.recipients && entry.recipients.length > 0) || (entry.ccRecipients && entry.ccRecipients.length > 0))) {
    const result = await sendSmtpEmail({
      settings: notificationSettingsMemory,
      to: entry.recipients || [],
      cc: entry.ccRecipients || [],
      subject: entry.subject,
      html: entry.htmlPreview
    });
    smtpSent = result.sent;
    console.log(`[SMTP Poste.io] ${result.detail}`);
  }

  const savedEntry: NotificationLogEntry = {
    ...entry,
    status: smtpSent ? 'ENVIADO_SMTP' : entry.status
  };
  notificationLogsMemory = [savedEntry, ...notificationLogsMemory].slice(0, 100);
  console.log(
    `[Notification Service] Disparo (${savedEntry.triggerMode}): "${savedEntry.subject}" -> [${savedEntry.recipients.join(', ')}]`
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
      dcnsList = await prisma.dCN.findMany({
        include: {
          materials: true,
          training: { include: { attendeesList: true } },
          attachments: true,
          auditTrail: true,
          implementationChecklist: true
        }
      });
    } catch {
      dcnsList = [];
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
        dcnsList = await prisma.dCN.findMany({
          include: { materials: true, training: { include: { attendeesList: true } }, attachments: true }
        });
      } catch {
        dcnsList = [];
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
      notificationLogsMemory = [entry, ...notificationLogsMemory].slice(0, 100);
      console.log(`[Scheduler Recorrente] Executado ${ruleKey} às ${currentHHMM}: ${entry.subject}`);
    };

    if (
      notificationSettingsMemory.weeklyPendingEnabled &&
      currentDay === notificationSettingsMemory.weeklyDayOfWeek &&
      currentHHMM === notificationSettingsMemory.weeklyTime
    ) {
      await checkAndRun('WEEKLY_PENDING');
    }

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
