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
    
    // Log no topo para capturar qualquer evento recebido
    console.log('📬 RECEBIDO DO WHATSAPP:', JSON.stringify(body, null, 2));

    const message = body.entry?.[0]?.changes?.[0]?.value?.messages?.[0];

    if (message && message.type === 'text') {
      const from = message.from;
      const textReceived = message.text.body;

      const response = await fetch(
        `https://graph.facebook.com/v20.0/${process.env.PHONE_NUMBER_ID}/messages`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.WHATSAPP_TOKEN}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            messaging_product: 'whatsapp',
            to: from,
            text: { body: `🤖 Bot Next.js: Recebi sua mensagem "${textReceived}"!` },
          }),
        }
      );

      const resData = await response.json();
      console.log('--- RESPOSTA DO ENVIO ---', resData);
    }

    return NextResponse.json({ status: 'success' }, { status: 200 });
  } catch (error) {
    console.error('Erro no webhook:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}