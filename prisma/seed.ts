import { PrismaClient } from '@prisma/client';
import { INITIAL_TECHNICIANS } from '../src/data/initialTechnicians';
import { INITIAL_DCNS } from '../src/data/initialDCNs';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Carga Inicial no PostgreSQL (Seed) ---');

  // 1. Inserir Técnicos
  console.log(`Cadastrando ${INITIAL_TECHNICIANS.length} técnicos...`);
  for (const tech of INITIAL_TECHNICIANS) {
    await prisma.technician.upsert({
      where: { badge: tech.badge },
      update: {
        name: tech.name,
        department: tech.department,
        shift: tech.shift,
        role: tech.role,
        email: tech.email || null,
        phone: tech.phone || null,
        active: tech.active,
        skills: tech.skills || [],
        trainedDCNIds: tech.trainedDCNIds || [],
        notes: tech.notes || null,
      },
      create: {
        id: tech.id,
        name: tech.name,
        badge: tech.badge,
        department: tech.department,
        shift: tech.shift,
        role: tech.role,
        email: tech.email || null,
        phone: tech.phone || null,
        active: tech.active,
        skills: tech.skills || [],
        trainedDCNIds: tech.trainedDCNIds || [],
        notes: tech.notes || null,
      }
    });
  }
  console.log('✓ Técnicos cadastrados com sucesso.');

  // 2. Inserir DCNs com entidades filhas
  console.log(`Cadastrando ${INITIAL_DCNS.length} DCNs...`);
  for (const dcn of INITIAL_DCNS) {
    // Upsert DCN
    const existing = await prisma.dCN.findUnique({
      where: { dcnNumber: dcn.dcnNumber }
    });

    if (existing) {
      console.log(`DCN ${dcn.dcnNumber} já existe, pulando.`);
      continue;
    }

    await prisma.dCN.create({
      data: {
        id: dcn.id,
        dcnNumber: dcn.dcnNumber,
        title: dcn.title,
        description: dcn.description,
        area: dcn.area,
        responsible: dcn.responsible,
        receivedDate: dcn.receivedDate,
        dueDate: dcn.dueDate,
        status: dcn.status,
        priority: dcn.priority,
        needsMaterial: dcn.needsMaterial,
        needsTraining: dcn.needsTraining,
        implementationDate: dcn.implementationDate || null,
        implementedBy: dcn.implementedBy || null,
        engineeringReview: (dcn.engineeringReview as any) || null,
        closureNotes: dcn.closureNotes || null,
        closedAt: dcn.closedAt || null,
        closedBy: dcn.closedBy || null,
        materials: {
          create: (dcn.materials || []).map((m) => ({
            id: m.id,
            code: m.code,
            description: m.description,
            quantity: m.quantity,
            unit: m.unit,
            supplier: m.supplier,
            expectedDate: m.expectedDate,
            arrivalDate: m.arrivalDate || null,
            status: m.status,
            notes: m.notes || null
          }))
        },
        training: dcn.training ? {
          create: {
            id: dcn.training.id,
            instructor: dcn.training.instructor,
            targetAudience: dcn.training.targetAudience,
            department: dcn.training.department,
            estimatedHours: dcn.training.estimatedHours,
            scheduledDate: dcn.training.scheduledDate || null,
            completionDate: dcn.training.completionDate || null,
            totalTrained: dcn.training.totalTrained,
            totalPlanned: dcn.training.totalPlanned,
            status: dcn.training.status,
            trainingTopics: dcn.training.trainingTopics || [],
            evidenceDoc: dcn.training.evidenceDoc || null,
            attendeesList: {
              create: (dcn.training.attendeesList || []).map((a) => ({
                technicianId: a.technicianId || null,
                name: a.name,
                badge: a.badge,
                department: a.department,
                signedDate: a.signedDate || null,
                status: a.status || 'CONCLUIDO',
                score: a.score || null
              }))
            }
          }
        } : undefined,
        implementationChecklist: {
          create: (dcn.implementationChecklist || []).map((c) => ({
            id: c.id,
            title: c.title,
            responsible: c.responsible,
            completed: c.completed,
            completedAt: c.completedAt || null,
            mandatory: c.mandatory
          }))
        },
        attachments: {
          create: (dcn.attachments || []).map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            size: a.size,
            category: a.category,
            uploadedAt: a.uploadedAt,
            uploadedBy: a.uploadedBy,
            url: a.url || null
          }))
        },
        auditTrail: {
          create: (dcn.auditTrail || []).map((entry) => ({
            id: entry.id,
            timestamp: entry.timestamp,
            user: entry.user,
            userRole: entry.userRole,
            action: entry.action,
            fromStatus: entry.fromStatus || null,
            toStatus: entry.toStatus || null,
            comment: entry.comment || null
          }))
        }
      }
    });
  }

  console.log('✓ Carga inicial do banco concluída com sucesso!');
}

main()
  .catch((e) => {
    console.error('Erro durante o seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
