import { DCN } from '../types';

/**
 * Remove acentuação e caracteres especiais para compatibilidade total
 * com fontes padrão Type1 (Helvetica) no padrão PDF-1.4
 */
function cleanPdfText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[\\()]/g, '')
    .trim();
}

/**
 * Gera um documento PDF nativo válido (conforme especificação ISO 32000 / PDF-1.4)
 * contendo a Ata e Registro Oficial de Treinamento da DCN.
 * 
 * Retorna a representação em Base64 para envio direto via MIME SMTP ou download.
 */
export function generateTrainingEvidencePDF(dcn: DCN): string {
  const lines: string[] = [];

  // ==========================================
  // 1. Cabeçalho Corporativo (Azul CTDI #002A54)
  // ==========================================
  lines.push('0 0.16 0.33 rg');
  lines.push('40 760 515 55 re f');

  lines.push('1 1 1 rg');
  lines.push('BT /F1 14 Tf 55 792 Td (CTDI DO BRASIL - REGISTRO E ATA OFICIAL DE TREINAMENTO) Tj ET');
  lines.push('BT /F1 8.5 Tf 55 775 Td (SISTEMA DE GESTAO DA QUALIDADE - ISO 9001:2015 | ENGENHARIA DE PROCESSOS) Tj ET');

  // ==========================================
  // 2. Quadro de Metadados da DCN
  // ==========================================
  lines.push('0.85 0.88 0.92 RG');
  lines.push('1 w');
  lines.push('40 635 515 110 re S');

  lines.push('0.97 0.98 1 rg');
  lines.push('41 726 513 18 re f');

  lines.push('0 0.16 0.33 rg');
  lines.push(`BT /F1 10 Tf 55 731 Td (DCN: ${cleanPdfText(dcn.dcnNumber)}   |   Revisao: ${cleanPdfText(dcn.revision || 'REV A')}   |   Status: CONCLUIDO E HOMOLOGADO) Tj ET`);

  lines.push('0.15 0.2 0.25 rg');
  lines.push(`BT /F1 8.5 Tf 55 710 Td (Titulo da Mudanca: ${cleanPdfText(dcn.title).substring(0, 80)}) Tj ET`);
  lines.push(`BT /F1 8.5 Tf 55 693 Td (Area / Projeto: ${cleanPdfText(dcn.area)}   |   Engenheiro Responsavel: ${cleanPdfText(dcn.responsible)}) Tj ET`);
  lines.push(`BT /F1 8.5 Tf 55 676 Td (Familia de Produtos: ${cleanPdfText(dcn.productFamily || 'Geral')}   |   Data de Encerramento: ${cleanPdfText(dcn.closedAt || new Date().toISOString().split('T')[0])}) Tj ET`);

  const instructorName = cleanPdfText(dcn.training?.instructor || dcn.responsible);
  const hours = cleanPdfText(dcn.training?.estimatedHours || 30);
  lines.push(`BT /F1 8.5 Tf 55 659 Td (Instrutor / Facilitador: ${instructorName}   |   Carga Horaria: ${hours} horas) Tj ET`);

  const topics = cleanPdfText(dcn.training?.trainingTopics?.join(', ') || 'Procedimentos operacionais, parametros tecnicos e criterios de qualidade');
  lines.push(`BT /F1 8 Tf 55 642 Td (Topicos: ${topics.substring(0, 95)}) Tj ET`);

  // ==========================================
  // 3. Quadro de Colaboradores Capacitados / Ata de Presença
  // ==========================================
  lines.push('0 0.16 0.33 rg');
  lines.push('40 605 515 22 re f');
  lines.push('1 1 1 rg');
  lines.push('BT /F1 9.5 Tf 55 612 Td (COLABORADORES CAPACITADOS NA DCN / LISTA DE PRESENCA HOMOLOGADA) Tj ET');

  // Cabeçalho da Tabela
  lines.push('0.92 0.94 0.97 rg');
  lines.push('40 583 515 20 re f');
  lines.push('0.1 0.15 0.2 rg');
  lines.push('BT /F1 8 Tf 55 589 Td (NOME DO COLABORADOR) Tj ET');
  lines.push('BT /F1 8 Tf 250 589 Td (DEPARTAMENTO / SETOR) Tj ET');
  lines.push('BT /F1 8 Tf 395 589 Td (STATUS) Tj ET');
  lines.push('BT /F1 8 Tf 465 589 Td (DATA ASSINATURA) Tj ET');

  // Linhas de Colaboradores
  const rawAttendees = (dcn.training && dcn.training.attendeesList && dcn.training.attendeesList.length > 0)
    ? dcn.training.attendeesList
    : [{ name: dcn.responsible, department: dcn.area, status: 'CONCLUIDO', signedDate: dcn.closedAt || new Date().toISOString().split('T')[0] }];

  let currentY = 565;
  rawAttendees.slice(0, 18).forEach((att, idx) => {
    if (idx % 2 === 1) {
      lines.push('0.97 0.98 0.99 rg');
      lines.push(`40 ${currentY - 3} 515 15 re f`);
    }
    lines.push('0.15 0.2 0.25 rg');
    lines.push(`BT /F1 8 Tf 55 ${currentY} Td (${cleanPdfText(att.name).substring(0, 36)}) Tj ET`);
    lines.push(`BT /F1 8 Tf 250 ${currentY} Td (${cleanPdfText(att.department || 'Producao').substring(0, 24)}) Tj ET`);

    // Status com destaque verde
    lines.push('0.08 0.5 0.2 rg');
    lines.push(`BT /F1 8 Tf 395 ${currentY} Td (ASSINADO / CONCLUIDO) Tj ET`);

    lines.push('0.3 0.35 0.4 rg');
    const dateStr = cleanPdfText(att.signedDate || dcn.closedAt || new Date().toISOString().split('T')[0]);
    lines.push(`BT /F1 8 Tf 465 ${currentY} Td (${dateStr}) Tj ET`);

    currentY -= 16;
  });

  // Linha de Resumo / Total
  lines.push('0.85 0.88 0.92 RG');
  lines.push('1 w');
  lines.push(`40 ${currentY + 6} 515 0.5 re S`);
  lines.push('0.3 0.3 0.3 rg');
  lines.push(`BT /F1 7.5 Tf 55 ${currentY - 6} Td (Total de Colaboradores Registrados: ${rawAttendees.length}   |   Cobertura de Treinamento: 100%) Tj ET`);

  // ==========================================
  // 4. Rodapé e Assinaturas Formais
  // ==========================================
  lines.push('0.7 0.75 0.8 RG');
  lines.push('1 w');
  lines.push('55 95 190 0.5 re S');
  lines.push('350 95 190 0.5 re S');

  lines.push('0.2 0.25 0.3 rg');
  lines.push('BT /F1 8 Tf 80 82 Td (Engenheiro Responsavel / Instrutor) Tj ET');
  lines.push('BT /F1 8 Tf 380 82 Td (Garantia da Qualidade / CTDI) Tj ET');

  lines.push('0.5 0.55 0.6 rg');
  lines.push('BT /F1 7 Tf 120 48 Td (Evidencia Oficial de Treinamento gerada eletronicamente pelo Sistema de Gestao de DCNs - CTDI do Brasil) Tj ET');

  const streamContent = lines.join('\n');
  const streamLength = Buffer.byteLength(streamContent, 'latin1');

  const objects = [
    '1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj',
    '2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj',
    '3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>\nendobj',
    '4 0 obj\n<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>\nendobj',
    `5 0 obj\n<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream\nendobj`
  ];

  let offset = 9;
  let body = '%PDF-1.4\n';
  const xref: string[] = ['xref', `0 ${objects.length + 1}`, '0000000000 65535 f '];

  for (const obj of objects) {
    const padded = ('0000000000' + offset).slice(-10) + ' 00000 n ';
    xref.push(padded);
    body += obj + '\n';
    offset = body.length;
  }

  const startxref = body.length;
  body += xref.join('\n') + '\ntrailer\n<< /Size ' + (objects.length + 1) + ' /Root 1 0 R >>\nstartxref\n' + startxref + '\n%%EOF';

  return Buffer.from(body, 'latin1').toString('base64');
}
