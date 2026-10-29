import React, { useEffect, useRef, useState } from 'react';
import { Zap, Flame, Coffee, Heart, Activity, Dumbbell, Forward, StickyNote, MessageCircle, Send, Users } from 'lucide-react';
import Avatar from '../components/Avatar';
import { ScreenHeader, Card, Segmented, Skeleton, Empty, Chip, RankBadge } from '../components/ui';
import { supabase, getAllUsers, getAllLiveStatuses, getActivityFeed, getReactionsForWorkouts, getCommentsForWorkouts, toggleReaction, addComment, computeUserStats } from '../supabase';
import { mergeCardioMobilityPairs, formatDuration, heaviestOf } from '../lib/workouts';
import { relativeTime, startOfWeek } from '../lib/date';
import { useToast } from '../components/Toast';

const REACTIONS = ['💪', '🔥', '👏', '⚡'];

export default function DashboardScreen({ user, optionalDays = new Set() }) {
  const showToast = useToast();
  const [users, setUsers] = useState([]);
  const [liveStatuses, setLiveStatuses] = useState([]);
  const [feed, setFeed] = useState([]);
  const [reactions, setReactions] = useState({});
  const [comments, setComments] = useState({});
  const [openComments, setOpenComments] = useState(null); // workoutId
  const [commentInputs, setCommentInputs] = useState({}); // workoutId -> text
  const [allWorkoutsByUser, setAllWorkoutsByUser] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [tab, setTab] = useState('leaderboard');
  const [lbFilter, setLbFilter] = useState('week');

  const loadTimeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const loadAll = async () => {
    try {
      const [allUsers, statuses, feedRows] = await Promise.all([
        getAllUsers(),
        getAllLiveStatuses(),
        getActivityFeed(200),
      ]);
      if (!mountedRef.current) return;
      setUsers(allUsers);
      const threeMinAgo = Date.now() - 3 * 60 * 1000;
      setLiveStatuses(statuses.filter(s =>
        s.user_id !== user.id && new Date(s.updated_at).getTime() > threeMinAgo
      ));
      setFeed(mergeCardioMobilityPairs(feedRows));

      const ids = feedRows.map(w => w.id);
      const [reactionsMap, commentsMap] = await Promise.all([
        getReactionsForWorkouts(ids),
        getCommentsForWorkouts(ids),
      ]);
      if (!mountedRef.current) return;
      setReactions(reactionsMap);
      setComments(commentsMap);

      const byUser = {};
      feedRows.forEach(w => {
        if (!byUser[w.user_id]) byUser[w.user_id] = [];
        byUser[w.user_id].push(w);
      });
      Object.keys(byUser).forEach(uid => { byUser[uid] = mergeCardioMobilityPairs(byUser[uid]); });
      setAllWorkoutsByUser(byUser);
      setError(false);
    } catch (e) {
      console.error('Dashboard load error:', e);
      if (mountedRef.current) setError(true);
    }
    if (mountedRef.current) setLoading(false);
  };

  const debouncedLoad = () => {
    if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    loadTimeoutRef.current = setTimeout(loadAll, 1500);
  };

  useEffect(() => {
    mountedRef.current = true;
    loadAll();
    const channel = supabase
      .channel('dashboard-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'live_status' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'workouts' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'reactions' }, debouncedLoad)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'comments' }, debouncedLoad)
      .subscribe();
    return () => {
      mountedRef.current = false;
      supabase.removeChannel(channel);
      if (loadTimeoutRef.current) clearTimeout(loadTimeoutRef.current);
    };
  }, []);

  const handleReaction = async (workoutId, emoji) => {
    setReactions(prev => {
      const current = prev[workoutId] || [];
      const idx = current.findIndex(r => r.user_id === user.id && r.emoji === emoji);
      const next = idx >= 0
        ? current.filter((_, i) => i !== idx)
        : [...current, { user_id: user.id, emoji, users: { id: user.id, name: user.name, avatar_url: user.avatar_url } }];
      return { ...prev, [workoutId]: next };
    });
    try {
      await toggleReaction(workoutId, user.id, emoji);
    } catch (e) {
      console.error('Reaction error:', e);
      showToast('Reaktion konnte nicht gespeichert werden', 'error');
      debouncedLoad();
    }
  };

  const handleAddComment = async (workoutId) => {
    const text = (commentInputs[workoutId] || '').trim();
    if (!text) return;
    try {
      const newComment = await addComment(workoutId, user.id, text);
      setComments(prev => ({ ...prev, [workoutId]: [...(prev[workoutId] || []), newComment] }));
      setCommentInputs(prev => ({ ...prev, [workoutId]: '' }));
    } catch (e) {
      console.error('Comment error:', e);
      showToast('Kommentar konnte nicht gesendet werden', 'error');
    }
  };

  const weekStart = startOfWeek();
  const cutoff = lbFilter === 'week' ? weekStart : Date.now() - 30 * 24 * 60 * 60 * 1000;
  const leaderboard = users.map(u => {
    const userWorkouts = allWorkoutsByUser[u.id] || [];
    const filtered = userWorkouts.filter(w => new Date(w.created_at || w.date).getTime() >= cutoff);
    const stats = computeUserStats(userWorkouts, optionalDays);
    const live = liveStatuses.find(s => s.user_id === u.id);
    return { user: u, stats, count: filtered.length, live };
  }).sort((a, b) => b.count - a.count || b.stats.streak - a.stats.streak);

  if (loading) {
    return (
      <div className="pt-3 animate-fade-in">
        <ScreenHeader eyebrow="Die Crew" title="Crew" accent="Dashboard" />
        <Skeleton className="h-12 mb-4" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[76px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3 animate-fade-in">
      <ScreenHeader eyebrow="Die Crew" title="Crew" accent="Dashboard" />

      {error && (
        <Card soft className="p-4 mb-4 text-sm text-fg-muted flex items-center justify-between gap-3" role="alert">
          <span>Crew-Daten konnten nicht geladen werden.</span>
          <button onClick={() => { setLoading(true); loadAll(); }} className="text-accent font-bold text-xs uppercase tracking-wide min-h-[44px] px-2">Nochmal</button>
        </Card>
      )}

      {liveStatuses.length > 0 && (
        <Card className="p-4 mb-5 border-accent/40">
          <div className="label text-accent mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse-soft" aria-hidden="true" /> Live – gerade aktiv
          </div>
          <div className="space-y-3">
            {liveStatuses.map(s => (
              <div key={s.user_id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar user={s.users} size="md" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-surface animate-pulse-soft" aria-hidden="true" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-xl uppercase text-fg leading-none">{s.users?.name}</div>
                  <div className="text-xs text-fg-muted truncate mt-0.5">{s.status} · {s.detail}</div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Segmented
        className="mb-4"
        value={tab}
        onChange={setTab}
        options={[{ value: 'leaderboard', label: 'Leaderboard' }, { value: 'feed', label: 'Activity' }]}
      />

      {tab === 'leaderboard' && (
        <div>
          <div className="flex gap-2 mb-4">
            <Chip active={lbFilter === 'week'} onClick={() => setLbFilter('week')}>Diese Woche</Chip>
            <Chip active={lbFilter === 'month'} onClick={() => setLbFilter('month')}>30 Tage</Chip>
          </div>
          <ol className="space-y-2.5">
            {leaderboard.map((row, idx) => {
              const isMe = row.user.id === user.id;
              return (
                <li key={row.user.id}>
                  <Card className={`p-3.5 flex items-center gap-3 ${isMe ? 'border-accent/50 bg-accent/[0.07]' : ''}`}>
                    <RankBadge rank={idx + 1} />
                    <div className="relative shrink-0">
                      <Avatar user={row.user} size="md" />
                      {row.live && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-surface animate-pulse-soft" aria-hidden="true" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-display text-xl uppercase text-fg truncate leading-none">
                        {row.user.name}
                        {isMe && <span className="ml-2 text-[10px] font-body font-bold tracking-widest text-on-accent bg-accent px-1.5 py-0.5 rounded-md align-middle">Du</span>}
                      </div>
                      {row.stats.streak > 0 ? (
                        <div className="text-xs text-fg-muted flex items-center gap-1 mt-1">
                          <Flame className="w-3.5 h-3.5 text-accent" aria-hidden="true" /> {row.stats.streak} Tage Streak
                        </div>
                      ) : (
                        <div className="text-xs text-fg-faint mt-1">Kein Streak</div>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-display text-4xl text-accent leading-none tabular">{row.count}</div>
                      <div className="text-[10px] text-fg-faint font-bold tracking-wider uppercase mt-0.5">Workouts</div>
                    </div>
                  </Card>
                </li>
              );
            })}
          </ol>
          {leaderboard.length === 0 && <Empty icon={Users} title="Noch keine Daten" />}
        </div>
      )}

      {tab === 'feed' && (
        <div className="space-y-3">
          {feed.length === 0 && (
            <Empty icon={Coffee} title="Noch keine Aktivität" text="Sei der Erste – starte ein Training." />
          )}

          {feed.map(w => {
            const isMe = w.user_id === user.id;
            const wReactions = reactions[w.id] || [];
            const grouped = {};
            wReactions.forEach(r => {
              if (!grouped[r.emoji]) grouped[r.emoji] = [];
              grouped[r.emoji].push(r);
            });
            const dur = formatDuration(w.duration);
            const logs = (w.logs || []).filter(l => l.sets && l.sets.length > 0);
            const commentList = comments[w.id] || [];

            return (
              <Card key={w.id} className="p-4">
                <div className="flex items-start gap-3">
                  <Avatar user={w.users} size="sm" className="shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-2">
                      <div className="font-display text-xl uppercase text-fg truncate leading-none">
                        {w.users?.name}
                        {isMe && <span className="ml-2 text-[10px] font-body font-bold tracking-widest text-on-accent bg-accent px-1.5 py-0.5 rounded-md align-middle">Du</span>}
                      </div>
                      <div className="text-xs text-fg-muted shrink-0">{relativeTime(w.created_at)}</div>
                    </div>
                    <div className="text-sm text-fg-muted mt-1 flex items-center gap-1.5 flex-wrap">
                      {w.is_cardio && <Heart className="w-3.5 h-3.5 text-accent" aria-hidden="true" />}
                      {w.is_mobility && <Activity className="w-3.5 h-3.5 text-ok" aria-hidden="true" />}
                      {!w.is_cardio && !w.is_mobility && <Dumbbell className="w-3.5 h-3.5 text-fg-muted" aria-hidden="true" />}
                      <span className="text-fg font-semibold">{w.plan_name}</span>
                      {dur && <span>· {dur}</span>}
                      {w.is_mobility && !w.is_cardio && <span>· {w.completed}/{w.total}</span>}
                      {w.is_cardio && w.is_mobility && <span>· {w.completed}/{w.total} Mobility</span>}
                    </div>
                  </div>
                </div>

                {logs.length > 0 && (
                  <div className="ml-12 mt-2.5 space-y-0.5">
                    {logs.slice(0, 3).map((l, i) => (
                      <div key={i} className="text-xs text-fg-muted truncate">
                        <span className="text-fg">{l.name}</span> · <span className="font-mono">{l.sets.length} × {heaviestOf(l.sets)} kg</span>
                      </div>
                    ))}
                    {logs.length > 3 && <div className="text-xs text-fg-faint">+ {logs.length - 3} weitere Übungen</div>}
                  </div>
                )}

                {w.skipped_exercises && w.skipped_exercises.length > 0 && (
                  <div className="ml-12 mt-2 text-xs text-accent-2 flex items-center gap-1">
                    <Forward className="w-3 h-3" aria-hidden="true" /> {w.skipped_exercises.length} übersprungen
                  </div>
                )}

                {w.notes && (
                  <div className="ml-12 mt-2.5 flex gap-2 text-sm bg-surface-2/60 rounded-xl px-3 py-2 border border-line">
                    <StickyNote className="w-4 h-4 text-gold shrink-0 mt-0.5" aria-hidden="true" />
                    <div className="text-xs text-fg italic">{w.notes}</div>
                  </div>
                )}

                <div className="ml-12 mt-3 flex items-center gap-1.5 flex-wrap">
                  {Object.entries(grouped).map(([emoji, list]) => {
                    const userReacted = list.some(r => r.user_id === user.id);
                    const names = list.map(r => r.users?.name || '?').join(', ');
                    return (
                      <button key={emoji}
                        onClick={() => handleReaction(w.id, emoji)}
                        title={names}
                        aria-pressed={userReacted}
                        aria-label={`${emoji} ${list.length} – ${names}`}
                        className={`pressable min-h-[40px] px-3 rounded-full text-base flex items-center gap-1.5 border transition-colors ${
                          userReacted ? 'bg-accent/15 border-accent/60' : 'bg-surface-2 border-line'
                        }`}>
                        <span aria-hidden="true">{emoji}</span>
                        <span className="text-xs text-fg font-bold">{list.length}</span>
                      </button>
                    );
                  })}
                  {REACTIONS.filter(e => !grouped[e]).map(emoji => (
                    <button key={emoji}
                      onClick={() => handleReaction(w.id, emoji)}
                      aria-label={`Mit ${emoji} reagieren`}
                      className="pressable min-h-[40px] min-w-[40px] px-2 rounded-full text-base border border-line opacity-50 hover:opacity-100 transition-opacity">
                      <span aria-hidden="true">{emoji}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setOpenComments(openComments === w.id ? null : w.id)}
                    aria-expanded={openComments === w.id}
                    aria-label="Kommentare"
                    className={`ml-auto pressable min-h-[40px] flex items-center gap-1.5 px-3 rounded-full border transition-colors ${openComments === w.id ? 'border-line-2 text-fg' : 'border-transparent text-fg-muted hover:text-fg'}`}>
                    <MessageCircle className="w-4.5 h-4.5" aria-hidden="true" />
                    {commentList.length > 0 && <span className="text-xs font-bold">{commentList.length}</span>}
                  </button>
                </div>

                {openComments === w.id && (
                  <div className="ml-12 mt-3 space-y-2 animate-fade-in">
                    {commentList.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="font-display text-sm uppercase text-accent shrink-0 pt-0.5">{c.users?.name}</div>
                        <div className="text-sm text-fg flex-1">{c.content}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={commentInputs[w.id] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(w.id)}
                        placeholder="Kommentar…"
                        aria-label="Kommentar schreiben"
                        className="input-field px-4 py-2 text-base rounded-full"
                      />
                      <button
                        onClick={() => handleAddComment(w.id)}
                        aria-label="Senden"
                        className="pressable w-11 h-11 shrink-0 btn-primary rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
