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
      dcnNumber,
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
        dcnNumber,
        title,
        description,
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
            estimatedHours: Number(training.estimatedHours) || 1,
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
                badge: a.badge,
                department: a.department,
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
    res.status(500).json({ error: 'Failed to create DCN', details: error.message });
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
        'title', 'description', 'area', 'responsible', 'receivedDate', 'dueDate',
        'status', 'priority', 'needsMaterial', 'needsTraining', 'implementationDate',
        'implementedBy', 'engineeringReview', 'closureNotes', 'closedAt', 'closedBy'
      ];

      for (const field of allowedFields) {
        if (fields[field] !== undefined) {
          updateData[field] = fields[field];
        }
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
    const { materialId } = req.params;
    const material = await prisma.materialItem.update({
      where: { id: materialId },
      data: req.body
    });
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
    const tech = await prisma.technician.create({
      data: req.body
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

    // Verificar se a DCN existe
    const dcn = await prisma.dCN.findUnique({ where: { id } });
    if (!dcn) {
      return res.status(404).json({ error: 'DCN não encontrada.' });
    }

    const fileExt = path.extname(file.originalname);
    const sanitizedBase = path.basename(file.originalname, fileExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const objectKey = `dcns/${id}/${Date.now()}-${sanitizedBase}${fileExt}`;

    // Upload do buffer para o bucket do MinIO
    await uploadFileToMinio(objectKey, file.buffer, file.size, file.mimetype);

    // Salvar registro no banco de dados via Prisma
    const attachment = await prisma.dCNAttachment.create({
      data: {
        dcnId: id,
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
        dcnId: id,
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

app.listen(PORT, () => {
  console.log(`[DCN API Server] Running on http://localhost:${PORT}`);
  initMinio().catch(err => {
    console.warn(`[MinIO] Não foi possível conectar ao inicializar: ${err.message}`);
  });
});
