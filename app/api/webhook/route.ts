import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const mode = searchParams.get('hub.mode');
  const token = searchParams.get('hub.verify_token');
  const challenge = searchParams.get('hub.challenge');

  console.log('🔐 VERIFICAÇÃO WEBHOOK');
  console.log('Mode:', mode);
  console.log('Token recebido:', token ? 'SIM' : 'NÃO');

  if (
    mode === 'subscribe' &&
    token === process.env.WEBHOOK_VERIFY_TOKEN
  ) {
    console.log('✅ Webhook verificado');

    return new Response(challenge, {
      status: 200,
    });
  }

  console.error('❌ Token de verificação inválido');

  return new Response('Token inválido', {
    status: 403,
  });
}


export async function POST(req: Request) {
  try {
    const body = await req.json();

    console.log(
      '📬 RECEBIDO DO WHATSAPP:',
      JSON.stringify(body, null, 2)
    );

    const message =
      body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    // Eventos que não são mensagens podem chegar pelo webhook.
    if (!message) {
      console.log('ℹ️ Evento recebido sem mensagem');

      return NextResponse.json(
        { status: 'ignored' },
        { status: 200 }
      );
    }

    console.log('📨 Mensagem encontrada:', message);

    if (message.type !== 'text') {
      console.log(
        'ℹ️ Tipo de mensagem não suportado:',
        message.type
      );

      return NextResponse.json(
        { status: 'ignored' },
        { status: 200 }
      );
    }

    const from = message.from;
    const textReceived = message.text?.body;

    console.log('👤 De:', from);
    console.log('💬 Mensagem:', textReceived);

    const phoneNumberId = process.env.PHONE_NUMBER_ID;
    const whatsappToken = process.env.WHATSAPP_TOKEN;

    if (!phoneNumberId) {
      console.error('❌ PHONE_NUMBER_ID não configurado');
      return NextResponse.json(
        { error: 'PHONE_NUMBER_ID não configurado' },
        { status: 500 }
      );
    }

    if (!whatsappToken) {
      console.error('❌ WHATSAPP_TOKEN não configurado');
      return NextResponse.json(
        { error: 'WHATSAPP_TOKEN não configurado' },
        { status: 500 }
      );
    }

    console.log('📤 Enviando resposta para:', from);

    const response = await fetch(
      `https://graph.facebook.com/v23.0/${phoneNumberId}/messages`,
      {
        method: 'POST',

        headers: {
          Authorization: `Bearer ${whatsappToken}`,
          'Content-Type': 'application/json',
        },

        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: from,
          type: 'text',
          text: {
            body: `🤖 Bot Next.js: Recebi sua mensagem "${textReceived}"!`,
          },
        }),
      }
    );

    const responseText = await response.text();

    console.log('📡 STATUS META:', response.status);
    console.log('📡 RESPOSTA META:', responseText);

    if (!response.ok) {
      console.error(
        '❌ ERRO AO ENVIAR MENSAGEM PELO WHATSAPP'
      );

      return NextResponse.json(
        {
          error: 'Erro ao enviar mensagem',
          status: response.status,
          meta: responseText,
        },
        { status: 500 }
      );
    }

    console.log('✅ MENSAGEM ENVIADA COM SUCESSO');

    return NextResponse.json(
      {
        status: 'success',
        whatsapp: responseText,
      },
      { status: 200 }
    );

  } catch (error) {
    console.error('🔥 ERRO NO WEBHOOK:', error);

    return NextResponse.json(
      {
        error: 'Erro interno',
      },
      { status: 500 }
    );
  }
}
