import net from 'net';
import tls from 'tls';
import { NotificationSettings } from '../src/types';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendMailOptions {
  settings: NotificationSettings;
  to: string[];
  cc?: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

function extractEmailAddress(raw: string): string {
  const match = raw.match(/<([^>]+)>/);
  return (match ? match[1] : raw).trim();
}

export async function sendSmtpEmail(options: SendMailOptions): Promise<{ sent: boolean; detail: string }> {
  const { settings, to, cc = [], subject, html, attachments = [] } = options;
  const host = (process.env.SMTP_HOST || settings.smtpHost || 'mail.ctdibrasil.com.br').trim();
  const port = Number(process.env.SMTP_PORT || settings.smtpPort || 587);
  const user = (process.env.SMTP_USER || settings.smtpUser || '').trim();
  const pass = process.env.SMTP_PASS || settings.smtpPass || '';
  const fromHeader = (process.env.SMTP_FROM || settings.smtpFrom || user || 'dcn@ctdibrasil.com.br').trim();
  const fromEnvelope = extractEmailAddress(fromHeader);

  const toRecipients = to.map(r => extractEmailAddress(r)).filter(Boolean);
  const ccRecipients = cc.map(r => extractEmailAddress(r)).filter(Boolean);
  const allEnvelopeRecipients = Array.from(new Set([...toRecipients, ...ccRecipients]));

  if (allEnvelopeRecipients.length === 0) {
    return { sent: false, detail: 'Nenhum destinatário informado.' };
  }

  return new Promise(resolve => {
    let socket: net.Socket | tls.TLSSocket;
    let buffer = '';
    let resolved = false;

    const finish = (sent: boolean, detail: string) => {
      if (resolved) return;
      resolved = true;
      try {
        socket?.destroy();
      } catch {
        // ignore
      }
      resolve({ sent, detail });
    };

    const timeout = setTimeout(() => {
      finish(false, `Tempo limite excedido ao conectar em ${host}:${port}`);
    }, 12000);

    const waitResponse = (): Promise<{ code: number; text: string }> => {
      return new Promise((res, rej) => {
        const onData = (chunk: Buffer) => {
          buffer += chunk.toString('utf8');
          const lines = buffer.split(/\r?\n/);
          // Keep incomplete last line in buffer
          for (let i = 0; i < lines.length - 1; i++) {
            const line = lines[i];
            if (/^\d{3} /.test(line)) {
              const code = parseInt(line.slice(0, 3), 10);
              const fullText = lines.slice(0, i + 1).join('\n');
              buffer = lines.slice(i + 1).join('\r\n');
              socket.off('data', onData);
              socket.off('error', onErr);
              res({ code, text: fullText });
              return;
            }
          }
        };
        const onErr = (err: Error) => {
          socket.off('data', onData);
          rej(err);
        };
        socket.on('data', onData);
        socket.once('error', onErr);
      });
    };

    const sendCmd = async (cmd: string, expectedCodes: number[]) => {
      socket.write(cmd + '\r\n');
      const resp = await waitResponse();
      if (!expectedCodes.includes(resp.code)) {
        throw new Error(`SMTP [${cmd.split(' ')[0]}] falhou (${resp.code}): ${resp.text}`);
      }
      return resp;
    };

    const runSession = async () => {
      try {
        const greeting = await waitResponse();
        if (greeting.code !== 220) {
          throw new Error(`Greeting inválido: ${greeting.text}`);
        }

        const ehloResp = await sendCmd(`EHLO dcn-ctdi.local`, [250]);

        // Upgrade STARTTLS se disponível e não estivermos na porta 465
        if (port !== 465 && ehloResp.text.toUpperCase().includes('STARTTLS')) {
          await sendCmd('STARTTLS', [220]);
          socket = await new Promise<tls.TLSSocket>((resTls, rejTls) => {
            const tlsSock = tls.connect(
              {
                socket,
                servername: host,
                rejectUnauthorized: false
              },
              () => resTls(tlsSock)
            );
            tlsSock.once('error', rejTls);
          });
          buffer = '';
          await sendCmd(`EHLO dcn-ctdi.local`, [250]);
        }

        // Autenticação AUTH LOGIN se usuário e senha foram preenchidos
        if (user && pass) {
          await sendCmd('AUTH LOGIN', [334]);
          await sendCmd(Buffer.from(user, 'utf8').toString('base64'), [334]);
          await sendCmd(Buffer.from(pass, 'utf8').toString('base64'), [235]);
        }

        await sendCmd(`MAIL FROM:<${fromEnvelope}>`, [250]);
        for (const rcpt of allEnvelopeRecipients) {
          await sendCmd(`RCPT TO:<${rcpt}>`, [250, 251]);
        }

        await sendCmd('DATA', [354]);

        const encodedSubject = `=?UTF-8?B?${Buffer.from(subject, 'utf8').toString('base64')}?=`;
        const headerLines = [
          `From: ${fromHeader}`,
          `To: ${toRecipients.length > 0 ? toRecipients.join(', ') : allEnvelopeRecipients.join(', ')}`
        ];
        if (ccRecipients.length > 0) {
          headerLines.push(`Cc: ${ccRecipients.join(', ')}`);
        }

        const hasAttachments = attachments && attachments.length > 0;
        let messagePayload = '';

        const fullHtmlDocument = html.includes('<html')
          ? html
          : `<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">
<html xmlns="http://www.w3.org/1999/xhtml" lang="pt-BR">
<head>
  <meta http-equiv="Content-Type" content="text/html; charset=UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: 'Segoe UI', Tahoma, Arial, sans-serif;">
  ${html}
</body>
</html>`;

        const base64Html =
          Buffer.from(fullHtmlDocument, 'utf8')
            .toString('base64')
            .match(/.{1,76}/g)
            ?.join('\r\n') || '';

        if (hasAttachments) {
          const boundary = `----=_Part_${Date.now()}_${Math.random().toString(36).substring(2, 10)}`;
          headerLines.push(
            `Subject: ${encodedSubject}`,
            `MIME-Version: 1.0`,
            `Content-Type: multipart/mixed; boundary="${boundary}"`,
            `Date: ${new Date().toUTCString()}`,
            ``
          );
          const messageHeaders = headerLines.join('\r\n');

          let mimeBody = `--${boundary}\r\n`;
          mimeBody += `Content-Type: text/html; charset=UTF-8\r\n`;
          mimeBody += `Content-Transfer-Encoding: base64\r\n\r\n`;
          mimeBody += `${base64Html}\r\n`;

          for (const att of attachments) {
            const base64Att = att.content.toString('base64').match(/.{1,76}/g)?.join('\r\n') || '';
            const mimeType = att.contentType || 'application/octet-stream';
            const safeFilename = (att.filename || 'anexo').replace(/"/g, '');

            mimeBody += `\r\n--${boundary}\r\n`;
            mimeBody += `Content-Type: ${mimeType}; name="${safeFilename}"\r\n`;
            mimeBody += `Content-Transfer-Encoding: base64\r\n`;
            mimeBody += `Content-Disposition: attachment; filename="${safeFilename}"; filename*="UTF-8''${encodeURIComponent(safeFilename)}"\r\n\r\n`;
            mimeBody += `${base64Att}\r\n`;
          }

          mimeBody += `\r\n--${boundary}--\r\n`;
          messagePayload = `${messageHeaders}\r\n${mimeBody}`;
        } else {
          headerLines.push(
            `Subject: ${encodedSubject}`,
            `MIME-Version: 1.0`,
            `Content-Type: text/html; charset=UTF-8`,
            `Content-Transfer-Encoding: base64`,
            `Date: ${new Date().toUTCString()}`,
            ``
          );
          const messageHeaders = headerLines.join('\r\n');
          messagePayload = `${messageHeaders}\r\n${base64Html}\r\n`;
        }

        await sendCmd(`${messagePayload}\r\n.`, [250]);
        await sendCmd('QUIT', [221, 250]);

        clearTimeout(timeout);
        finish(
          true,
          `E-mail enviado via SMTP (${host}:${port}) para: ${toRecipients.join(', ')}${
            ccRecipients.length > 0 ? ` [Cc: ${ccRecipients.join(', ')}]` : ''
          }${hasAttachments ? ` [${attachments.length} anexo(s)]` : ''}`
        );
      } catch (err: any) {
        clearTimeout(timeout);
        finish(false, err.message || 'Erro na sessão SMTP');
      }
    };

    try {
      if (port === 465) {
        socket = tls.connect({ host, port, rejectUnauthorized: false }, () => {
          runSession();
        });
      } else {
        socket = net.createConnection({ host, port }, () => {
          runSession();
        });
      }
      socket.on('error', err => {
        clearTimeout(timeout);
        finish(false, `Falha de conexão com ${host}:${port}: ${err.message}`);
      });
    } catch (err: any) {
      clearTimeout(timeout);
      finish(false, err.message);
    }
  });
}
