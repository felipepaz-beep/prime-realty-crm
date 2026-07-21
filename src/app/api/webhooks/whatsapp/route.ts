import { NextRequest, NextResponse } from 'next/server';
import { processarMensagemIa } from '@/features/ia/services/whatsapp-agent';

// Interface do Payload (adapte se a sua API de WhatsApp enviar um formato diferente)
interface WhatsAppWebhookBody {
  event?: string;
  data?: {
    key?: {
      remoteJid?: string;
      fromMe?: boolean;
      id?: string;
    };
    message?: {
      conversation?: string;
      extendedTextMessage?: {
        text?: string;
      };
    };
  };
}

export async function POST(req: NextRequest) {
  try {
    const body: WhatsAppWebhookBody = await req.json();

    // 1. Desestruturação segura das informações da mensagem
    const key = body?.data?.key;
    const messageContent = body?.data?.message;

    const ehMensagemMinha = key?.fromMe ?? false;
    const numeroTelefone = key?.remoteJid;
    const textoMensagem = messageContent?.conversation || messageContent?.extendedTextMessage?.text;

    // 2. Trava de segurança: Ignora se for enviado pelo próprio bot para evitar loop infinito
    if (ehMensagemMinha) {
      return NextResponse.json({ status: 'ignored', reason: 'Mensagem enviada pelo próprio sistema' }, { status: 200 });
    }

    // 3. Validação dos campos obrigatórios
    if (!numeroTelefone || !textoMensagem) {
      return NextResponse.json({ status: 'ignored', reason: 'Payload incompleto' }, { status: 200 });
    }

    // 4. Dispara a IA em background (Assíncrono) para não estourar o timeout da API de WhatsApp
    (async () => {
      try {
        await processarMensagemIa({
          telefone: numeroTelefone,
          mensagem: textoMensagem,
        });
      } catch (err) {
        console.error('[Webhook IA Error]: Falha ao processar mensagem do agente', err);
      }
    })();

    // 5. Retorna 200 OK imediatamente para a plataforma de WhatsApp
    return NextResponse.json({ success: true, message: 'Webhook recebido com sucesso' }, { status: 200 });

  } catch (error) {
    console.error('[Webhook Error]:', error);
    return NextResponse.json({ error: 'Erro interno ao processar webhook' }, { status: 500 });
  }
}
