import { supabase } from '../supabaseClient';

export const sendNotification = async ({ orgId, targetProfileIds, actorId, eventId, type, message }) => {
  if (!targetProfileIds || targetProfileIds.length === 0) return;
  
  try {
    const inserts = targetProfileIds.map(id => ({
      org_id: orgId,
      profile_id: id,
      actor_id: actorId,
      event_id: eventId,
      type,
      message
    }));
    
    await supabase.from('notifications').insert(inserts);
  } catch (e) {
    console.error("Error enviando notificación:", e);
  }
};
