import React from 'react';
import EventPlanner from '../EventPlanner';
import SongLibrary from '../SongLibrary';
import TeamList from '../TeamList';

export function DirectorView({ profile, session, activeTab, orgData }) {
  const { members, events, songs, fetchData } = orgData;
  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner readOnly={false} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
        </div>
      )}
      {activeTab === 'library' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={false} refreshData={fetchData} session={session} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={true} refreshData={fetchData} />
        </div>
      )}
    </div>
  );
}

export function MemberView({ profile, session, activeTab, orgData }) {
  const { members, events, songs, fetchData } = orgData;
  const userFunctions = profile.functions || [];
  const canAccessLibrary = userFunctions.some(f => ['musico', 'audio', 'media'].includes(f));

  return (
    <div className="dashboard-grid" style={{ display: 'block' }}>
      {activeTab === 'planner' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <EventPlanner readOnly={true} events={events} members={members} orgId={profile.org_id} refreshData={fetchData} songs={songs} profile={profile} session={session} />
        </div>
      )}
      {activeTab === 'library' && canAccessLibrary && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <SongLibrary songs={songs} orgId={profile.org_id} readOnly={true} refreshData={fetchData} session={session} />
        </div>
      )}
      {activeTab === 'team' && (
        <div style={{ maxWidth: '800px', margin: '0 auto' }}>
          <TeamList members={members} isDirector={false} refreshData={fetchData} />
        </div>
      )}
    </div>
  );
}
