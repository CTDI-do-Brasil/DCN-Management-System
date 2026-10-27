-- =============================================================================
-- DCN Management System - Schema PostgreSQL
-- Executar no Adminer (https://dbadmin.ctdibrasil.com.br)
-- Banco: DCN-Management-System | Schema: public
-- =============================================================================

-- Tabela de DCNs (Document Change Notices)
CREATE TABLE IF NOT EXISTS "dcns" (
    "id" TEXT NOT NULL,
    "dcnNumber" TEXT NOT NULL,
    "revision" TEXT,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "area" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "receivedDate" TEXT NOT NULL,
    "dueDate" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'RECEBIDA',
    "priority" TEXT NOT NULL DEFAULT 'MEDIA',
    "needsMaterial" BOOLEAN NOT NULL DEFAULT false,
    "needsTraining" BOOLEAN NOT NULL DEFAULT false,
    "implementationDate" TEXT,
    "implementedBy" TEXT,
    "engineeringReview" JSONB,
    "closureNotes" TEXT,
    "closedAt" TEXT,
    "closedBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "dcns_pkey" PRIMARY KEY ("id")
);

-- Tabela de Materiais Vinculados
CREATE TABLE IF NOT EXISTS "materials" (
    "id" TEXT NOT NULL,
    "dcnId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "quantity" DOUBLE PRECISION NOT NULL,
    "unit" TEXT NOT NULL,
    "supplier" TEXT NOT NULL,
    "expectedDate" TEXT NOT NULL,
    "arrivalDate" TEXT,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- Tabela de Técnicos Cadastrados
CREATE TABLE IF NOT EXISTS "technicians" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "shift" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "email" TEXT,
    "phone" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "skills" JSONB,
    "trainedDCNIds" JSONB,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "technicians_pkey" PRIMARY KEY ("id")
);

-- Tabela de Treinamentos
CREATE TABLE IF NOT EXISTS "training_records" (
    "id" TEXT NOT NULL,
    "dcnId" TEXT NOT NULL,
    "instructor" TEXT NOT NULL,
    "targetAudience" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "estimatedHours" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "scheduledDate" TEXT,
    "completionDate" TEXT,
    "totalTrained" INTEGER NOT NULL DEFAULT 0,
    "totalPlanned" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDENTE',
    "trainingTopics" JSONB,
    "evidenceDoc" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "training_records_pkey" PRIMARY KEY ("id")
);

-- Tabela de Participantes do Treinamento
CREATE TABLE IF NOT EXISTS "training_attendees" (
    "id" TEXT NOT NULL,
    "trainingId" TEXT NOT NULL,
    "technicianId" TEXT,
    "name" TEXT NOT NULL,
    "badge" TEXT NOT NULL,
    "department" TEXT NOT NULL,
    "signedDate" TEXT,
    "status" TEXT DEFAULT 'PENDENTE',
    "score" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "training_attendees_pkey" PRIMARY KEY ("id")
);

-- Tabela de Checklist de Implementação
CREATE TABLE IF NOT EXISTS "implementation_checklists" (
    "id" TEXT NOT NULL,
    "dcnId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "responsible" TEXT NOT NULL,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "completedAt" TEXT,
    "mandatory" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "implementation_checklists_pkey" PRIMARY KEY ("id")
);

-- Tabela de Anexos (Armazenados no MinIO S3)
CREATE TABLE IF NOT EXISTS "dcn_attachments" (
    "id" TEXT NOT NULL,
    "dcnId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "size" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "uploadedAt" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "url" TEXT,
    "objectKey" TEXT,
    "mimeType" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dcn_attachments_pkey" PRIMARY KEY ("id")
);

-- Trilha de Auditoria
CREATE TABLE IF NOT EXISTS "audit_logs" (
    "id" TEXT NOT NULL,
    "dcnId" TEXT NOT NULL,
    "timestamp" TEXT NOT NULL,
    "user" TEXT NOT NULL,
    "userRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "fromStatus" TEXT,
    "toStatus" TEXT,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- Índices e Unicidade
CREATE UNIQUE INDEX IF NOT EXISTS "dcns_dcnNumber_key" ON "dcns"("dcnNumber");
CREATE UNIQUE INDEX IF NOT EXISTS "technicians_badge_key" ON "technicians"("badge");
CREATE UNIQUE INDEX IF NOT EXISTS "training_records_dcnId_key" ON "training_records"("dcnId");

-- Chaves Estrangeiras (Relacionamentos)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'materials_dcnId_fkey') THEN
        ALTER TABLE "materials" ADD CONSTRAINT "materials_dcnId_fkey" FOREIGN KEY ("dcnId") REFERENCES "dcns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_records_dcnId_fkey') THEN
        ALTER TABLE "training_records" ADD CONSTRAINT "training_records_dcnId_fkey" FOREIGN KEY ("dcnId") REFERENCES "dcns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_attendees_trainingId_fkey') THEN
        ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_trainingId_fkey" FOREIGN KEY ("trainingId") REFERENCES "training_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'training_attendees_technicianId_fkey') THEN
        ALTER TABLE "training_attendees" ADD CONSTRAINT "training_attendees_technicianId_fkey" FOREIGN KEY ("technicianId") REFERENCES "technicians"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'implementation_checklists_dcnId_fkey') THEN
        ALTER TABLE "implementation_checklists" ADD CONSTRAINT "implementation_checklists_dcnId_fkey" FOREIGN KEY ("dcnId") REFERENCES "dcns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'dcn_attachments_dcnId_fkey') THEN
        ALTER TABLE "dcn_attachments" ADD CONSTRAINT "dcn_attachments_dcnId_fkey" FOREIGN KEY ("dcnId") REFERENCES "dcns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'audit_logs_dcnId_fkey') THEN
        ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_dcnId_fkey" FOREIGN KEY ("dcnId") REFERENCES "dcns"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;

-- Tabela de Usuários do Sistema (Autenticação Corporativa)
CREATE TABLE IF NOT EXISTS "users" (
    "id" TEXT NOT NULL,
    "login" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'OPERATOR',
    "senha" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "users_login_key" ON "users"("login");

