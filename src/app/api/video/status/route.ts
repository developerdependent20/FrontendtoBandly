import Mux from '@mux/mux-node';
import { NextResponse } from 'next/server';

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const uploadId = searchParams.get('uploadId');

  if (!uploadId) return NextResponse.json({ error: 'Falta uploadId' }, { status: 400 });

  try {
    const upload = await mux.video.uploads.retrieve(uploadId);
    
    if (upload.status === 'asset_created' && upload.asset_id) {
      const asset = await mux.video.assets.retrieve(upload.asset_id);
      return NextResponse.json({
        status: 'ready',
        playback_id: asset.playback_ids?.[0]?.id,
      });
    }

    return NextResponse.json({ status: upload.status });
  } catch (error) {
    return NextResponse.json({ error: 'Error consultando Mux' }, { status: 500 });
  }
}
