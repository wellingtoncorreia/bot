import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  if (mode === 'subscribe' && token === process.env.WEBHOOK_VERIFY_TOKEN) {
    return new Response(challenge, { status: 200 });
  }
  return new Response('Token inválido', { status: 403 });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Log para depuração na Vercel
    console.log('📬 RECEBIDO DO WHATSAPP:', JSON.stringify(body, null, 2));

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from;
      const textReceived = message.text.body;

      // =========================================================
      // INTEGRAÇÃO COM WHATSAPP (META CLOUD API)
      // =========================================================
      const WHATSAPP_TOKEN = process.env.WHATSAPP_TOKEN;
      const PHONE_NUMBER_ID = process.env.PHONE_NUMBER_ID;

      if (!WHATSAPP_TOKEN || !PHONE_NUMBER_ID) {
        throw new Error('Faltam variáveis de ambiente do WhatsApp.');
      }

      const response = await fetch(
        `https://graph.facebook.com/v20.0/${PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            recipient_type: 'individual', // Declarar explicitamente
            to: from,
            type: 'text', // Declarar explicitamente
            text: { body: `🤖 Bot Next.js: Recebi sua mensagem "${textReceived}"!` },
          }),
        }
      );

      const resData = await response.json();

      // O fetch não cai no catch automaticamente em erros HTTP (400, 500)
      // Forçamos o erro para cair no catch e manter o padrão de tratamento
      if (!response.ok) {
        throw resData; 
      }

      console.log('✅ Mensagem enviada com sucesso ao WhatsApp!', resData);
    }

    // A Meta exige sempre um status 200 rápido para não reenviar o webhook
    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error: any) {
    // Captura o erro exato da Meta (adaptado para o fetch)
    const detalhesErro = error.error || error.message || error;
    console.error('❌ Erro na API do WhatsApp:', JSON.stringify(detalhesErro, null, 2));

    // Tratamento elegante para a Janela de 24 horas (Erro 131047)
    if (detalhesErro?.code === 131047) {
      console.error('Aviso: O destinatário precisa enviar uma mensagem para o bot no WhatsApp para liberar a conversa.');
    }

    return NextResponse.json({ 
      error: 'Erro na integração com WhatsApp',
      detalhes: detalhesErro 
    }, { status: 200 }); 
  }
}