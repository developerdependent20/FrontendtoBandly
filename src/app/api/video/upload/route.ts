import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST() {
  try {
    const upload = await mux.video.uploads.create({
      new_asset_settings: {
        playback_policy: ['public'],
      },
      cors_origin: '*', // En producción podrías limitarlo a tu dominio
    });

    return NextResponse.json({
      url: upload.url,
      id: upload.id,
    });
  } catch (error: any) {
    console.error('Error creating Mux upload:', error);
    return NextResponse.json({ error: 'Error al crear la subida a Mux' }, { status: 500 });
  }
}
