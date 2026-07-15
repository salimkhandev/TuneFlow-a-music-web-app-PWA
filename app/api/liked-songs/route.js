import { ensureSchema, pool } from "@/lib/db";
import { getServerSession } from "next-auth";
import { authOptions } from "../auth/[...nextauth]/route";

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (!pool) {
      return new Response(JSON.stringify({ items: [] }), { status: 200 });
    }
    
    const { searchParams } = new URL(request.url);
    const view = searchParams.get('view'); // ids | count | summary | full(default)

    if (view === 'ids') {
      const { data, error } = await pool
        .from('liked_songs')
        .select('song_id')
        .eq('user_email', session.user.email)
        .order('liked_at', { ascending: false });
        
      if (error) throw error;
      const ids = data.map(r => r.song_id);
      return new Response(JSON.stringify({ ids }), { status: 200 });
    }

    if (view === 'count') {
      const { count, error } = await pool
        .from('liked_songs')
        .select('*', { count: 'exact', head: true })
        .eq('user_email', session.user.email);
        
      if (error) throw error;
      return new Response(JSON.stringify({ count: count ?? 0 }), { status: 200 });
    }

    const { data, error } = await pool
      .from('liked_songs')
      .select('song_json')
      .eq('user_email', session.user.email)
      .order('liked_at', { ascending: false });
      
    if (error) throw error;
    const items = data.map(r => r.song_json);

    if (view === 'summary') {
      const summary = items.map(s => ({
        id: s?.id,
        name: s?.name,
        duration: s?.duration,
        artists: s?.artists?.primary?.map(a => a?.name) ?? [],
      }));
      return new Response(JSON.stringify({ items: summary }), { status: 200 });
    }

    console.log("[liked-songs][GET] fetched", items.length, "songs for", session.user.email);
    return new Response(JSON.stringify({ items }), { status: 200 });
  } catch (err) {
    console.error("[liked-songs][GET] error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 });
  }
}

export async function POST(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (!pool) {
      return new Response(JSON.stringify({ ok: false, message: "DB not configured" }), { status: 200 });
    }
    
    const payload = await request.json();
    const song = payload?.song;
    if (!song?.id) {
      return new Response(JSON.stringify({ error: "song.id required" }), { status: 400 });
    }
    
    const { error } = await pool
      .from('liked_songs')
      .upsert(
        { 
          user_email: session.user.email, 
          song_id: String(song.id), 
          song_json: song,
          liked_at: new Date().toISOString()
        },
        { onConflict: 'user_email,song_id' }
      );
      
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[liked-songs][POST] error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 });
  }
}

export async function DELETE(request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }
    if (!pool) {
      return new Response(JSON.stringify({ ok: false, message: "DB not configured" }), { status: 200 });
    }
    
    const { searchParams } = new URL(request.url);
    const songId = searchParams.get("songId");
    if (!songId) {
      return new Response(JSON.stringify({ error: "songId required" }), { status: 400 });
    }
    
    const { error } = await pool
      .from('liked_songs')
      .delete()
      .match({ user_email: session.user.email, song_id: String(songId) });
      
    if (error) throw error;
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  } catch (err) {
    console.error("[liked-songs][DELETE] error", err);
    return new Response(JSON.stringify({ error: String(err?.message || err) }), { status: 500 });
  }
}
