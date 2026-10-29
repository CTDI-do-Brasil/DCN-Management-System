import { PrismaClient } from '@prisma/client';
import { LEGACY_DEMO_TECH_IDS, LEGACY_DEMO_TECH_BADGES } from '../src/data/initialTechnicians';
import { LEGACY_DEMO_DCN_IDS, LEGACY_DEMO_DCN_NUMBERS } from '../src/data/initialDCNs';
import { INITIAL_USERS, LEGACY_DEMO_USER_IDS, LEGACY_DEMO_USER_LOGINS } from '../src/data/initialUsers';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Iniciando Sincronização Inicial no PostgreSQL (Seed Limpo) ---');

  // 1. Limpar dados fictícios de simulação caso existam no banco (apenas números de simulação)
  if (LEGACY_DEMO_DCN_NUMBERS.length > 0) {
    const deletedDCNs = await prisma.dCN.deleteMany({
      where: {
        dcnNumber: { in: LEGACY_DEMO_DCN_NUMBERS }
      }
    });
    if (deletedDCNs.count > 0) {
      console.log(`✓ ${deletedDCNs.count} DCN(s) de simulação removida(s) do banco.`);
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
    console.log(`✓ ${deletedTechs.count} técnico(s) de simulação removido(s) do banco.`);
  }

  // 2. Remover usuários fictícios legados e garantir Administrador principal
  await prisma.user.deleteMany({
    where: {
      OR: [
        { id: { in: LEGACY_DEMO_USER_IDS } },
        { login: { in: LEGACY_DEMO_USER_LOGINS } }
      ]
    }
  });
  const existingUsersCount = await prisma.user.count();
  if (existingUsersCount === 0) {
    console.log(`Cadastrando ${INITIAL_USERS.length} usuários iniciais...`);
    for (const user of INITIAL_USERS) {
      await prisma.user.upsert({
        where: { login: user.login },
        update: {},
        create: {
          id: user.id,
          login: user.login,
          nome: user.nome,
          role: user.role,
          senha: user.senha
        }
      });
    }
    console.log('✓ Usuários iniciais cadastrados com sucesso.');
  } else {
    const rootAdmin = INITIAL_USERS[0];
    if (rootAdmin) {
      await prisma.user.upsert({
        where: { login: rootAdmin.login },
        update: {},
        create: {
          id: rootAdmin.id,
          login: rootAdmin.login,
          nome: rootAdmin.nome,
          role: rootAdmin.role,
          senha: rootAdmin.senha
        }
      });
    }
    console.log('✓ Usuários já configurados no banco (mantendo alterações realizadas via Web).');
  }

  console.log('--- Sincronização Concluída! ---');
}

main()
  .catch((e) => {
    console.error('Erro durante execução do seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
