/**
 * Utilitário de Geração de E-mails Prontos para Microsoft Outlook (.eml)
 * Gera arquivos MIME RFC 822 / RFC 2046 com cabeçalho X-Unsent: 1.
 * Abre diretamente no Microsoft Outlook com Para, Cc, Assunto, Corpo HTML e Anexos pré-preenchidos.
 */

export interface OutlookEmlAttachment {
  filename: string;
  base64: string;
  contentType?: string;
}

export interface OutlookEmlOptions {
  subject: string;
  to: string[];
  cc?: string[];
  htmlBody: string;
  filename?: string;
  attachment?: OutlookEmlAttachment;
}

/**
 * Codifica texto para o padrão RFC 2047 Base64 (Subject / Headers).
 * Garante compatibilidade de acentuação (UTF-8) no Microsoft Outlook.
 */
export function encodeRFC2047Subject(subject: string): string {
  const utf8Bytes = new TextEncoder().encode(subject);
  let binary = '';
  utf8Bytes.forEach(b => (binary += String.fromCharCode(b)));
  return `=?UTF-8?B?${btoa(binary)}?=`;
}

/**
 * Divide uma string base64 em linhas de até 76 caracteres, conforme especificação MIME RFC 2045.
 */
export function chunkBase64(base64: string, lineLength = 76): string {
  const clean = base64.replace(/^data:[^;]+;base64,/, '').replace(/\s+/g, '');
  const chunks: string[] = [];
  for (let i = 0; i < clean.length; i += lineLength) {
    chunks.push(clean.substring(i, i + lineLength));
  }
  return chunks.join('\r\n');
}

/**
 * Constrói o Blob do arquivo .eml compatível com o Microsoft Outlook com a flag X-Unsent: 1
 * (abre diretamente a janela de Composição / Envio do Outlook).
 */
export function buildOutlookEmlBlob(options: OutlookEmlOptions): Blob {
  const { subject, to, cc = [], htmlBody, attachment } = options;

  const encodedSubject = encodeRFC2047Subject(subject);
  const cleanTo = to.filter(Boolean).map(e => e.trim());
  const cleanCc = cc.filter(Boolean).map(e => e.trim());

  if (attachment && attachment.base64 && attachment.base64.trim().length > 10) {
    const boundary = `====_NextPart_DCN_${Date.now()}_${Math.random().toString(36).substring(2, 9)}====`;
    const safeFilename = attachment.filename.replace(/["\r\n]/g, '_');
    const contentType = attachment.contentType || (safeFilename.toLowerCase().endsWith('.pdf') ? 'application/pdf' : 'application/octet-stream');
    const chunked = chunkBase64(attachment.base64);

    const headers: string[] = [
      `To: ${cleanTo.join(', ')}`,
      ...(cleanCc.length > 0 ? [`Cc: ${cleanCc.join(', ')}`] : []),
      `Subject: ${encodedSubject}`,
      `X-Unsent: 1`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/mixed; boundary="${boundary}"`,
      ''
    ];

    const bodyParts: string[] = [
      headers.join('\r\n'),
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      '',
      htmlBody,
      '',
      `--${boundary}`,
      `Content-Type: ${contentType}; name="${safeFilename}"`,
      `Content-Transfer-Encoding: base64`,
      `Content-Disposition: attachment; filename="${safeFilename}"`,
      '',
      chunked,
      '',
      `--${boundary}--`,
      ''
    ];

    return new Blob([bodyParts.join('\r\n')], { type: 'message/rfc822;charset=utf-8' });
  } else {
    const headers: string[] = [
      `To: ${cleanTo.join(', ')}`,
      ...(cleanCc.length > 0 ? [`Cc: ${cleanCc.join(', ')}`] : []),
      `Subject: ${encodedSubject}`,
      `X-Unsent: 1`,
      `MIME-Version: 1.0`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: 8bit`,
      '',
      htmlBody
    ];

    return new Blob([headers.join('\r\n')], { type: 'message/rfc822;charset=utf-8' });
  }
}

/**
 * Realiza o disparo do download do arquivo .eml para abertura imediata no Microsoft Outlook.
 */
export function downloadOutlookEml(options: OutlookEmlOptions): void {
  const blob = buildOutlookEmlBlob(options);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const downloadName = options.filename || `Email_Outlook_${options.subject.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 30)}.eml`;
  a.download = downloadName.endsWith('.eml') ? downloadName : `${downloadName}.eml`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
