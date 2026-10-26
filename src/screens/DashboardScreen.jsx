import React, { useEffect, useRef, useState } from 'react';
import { Zap, Flame, Coffee, Heart, Activity, Dumbbell, Forward, StickyNote, MessageCircle, Send } from 'lucide-react';
import Avatar from '../components/Avatar';
import { ScreenHeader, Card, Segmented, Skeleton, Empty } from '../components/ui';
import { supabase, getAllUsers, getAllLiveStatuses, getActivityFeed, getReactionsForWorkouts, getCommentsForWorkouts, toggleReaction, addComment, computeUserStats } from '../supabase';
import { mergeCardioMobilityPairs, formatDuration, heaviestOf } from '../lib/workouts';
import { relativeTime, startOfWeek } from '../lib/date';
import { useToast } from '../components/Toast';

const REACTIONS = ['💪', '🔥', '👏', '⚡'];
const MEDALS = ['🥇', '🥈', '🥉'];

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
      // Only show statuses updated within last 3 minutes (active workout ping), never own
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
    // Optimistic update
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
        <ScreenHeader eyebrow="Die Crew" title="CREW" accent="DASHBOARD" />
        <Skeleton className="h-12 mb-4" />
        <div className="space-y-2.5">
          {[0, 1, 2, 3].map(i => <Skeleton key={i} className="h-[76px]" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="pt-3 animate-fade-in">
      <ScreenHeader eyebrow="Die Crew" title="CREW" accent="DASHBOARD" />

      {error && (
        <Card soft className="p-4 mb-4 text-sm text-zinc-400 flex items-center justify-between gap-3">
          <span>Crew-Daten konnten nicht geladen werden.</span>
          <button onClick={() => { setLoading(true); loadAll(); }} className="text-accent font-semibold text-xs">Nochmal</button>
        </Card>
      )}

      {liveStatuses.length > 0 && (
        <Card className="p-4 mb-5 border-accent/30">
          <div className="label text-accent mb-3 flex items-center gap-2">
            <Zap className="w-4 h-4 animate-pulse-soft" /> Live – gerade aktiv
          </div>
          <div className="space-y-3">
            {liveStatuses.map(s => (
              <div key={s.user_id} className="flex items-center gap-3">
                <div className="relative">
                  <Avatar user={s.users} size="md" />
                  <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-surface animate-pulse-soft" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-display text-base text-zinc-50">{s.users?.name?.toUpperCase()}</div>
                  <div className="text-xs text-zinc-400 truncate">{s.status} · {s.detail}</div>
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
            {[['week', 'Diese Woche'], ['month', '30 Tage']].map(([v, l]) => (
              <button key={v} onClick={() => setLbFilter(v)}
                className={`pressable px-3.5 py-1.5 rounded-full text-xs font-semibold border transition-colors ${lbFilter === v ? 'bg-accent/15 border-accent/50 text-accent' : 'border-line text-zinc-500'}`}>
                {l}
              </button>
            ))}
          </div>
          <div className="space-y-2.5">
            {leaderboard.map((row, idx) => {
              const isMe = row.user.id === user.id;
              return (
                <Card key={row.user.id} className={`p-3.5 flex items-center gap-3 ${isMe ? 'border-accent/40 bg-accent/[0.06]' : ''}`}>
                  <div className="font-display text-2xl w-8 text-center shrink-0">
                    {MEDALS[idx] || <span className="text-zinc-600 text-base">#{idx + 1}</span>}
                  </div>
                  <div className="relative shrink-0">
                    <Avatar user={row.user} size="md" />
                    {row.live && <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-accent rounded-full border-2 border-surface animate-pulse-soft" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-display text-lg text-zinc-50 truncate leading-tight">
                      {row.user.name.toUpperCase()}
                      {isMe && <span className="ml-2 text-[10px] font-body font-bold tracking-widest text-accent">DU</span>}
                    </div>
                    {row.stats.streak > 0 ? (
                      <div className="text-xs text-zinc-500 flex items-center gap-1">
                        <Flame className="w-3 h-3 text-accent-2" /> {row.stats.streak} Tage Streak
                      </div>
                    ) : (
                      <div className="text-xs text-zinc-600">Kein Streak</div>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-display text-3xl text-accent leading-none tabular">{row.count}</div>
                    <div className="text-[10px] text-zinc-500 font-semibold tracking-wider uppercase mt-0.5">Workouts</div>
                  </div>
                </Card>
              );
            })}
            {leaderboard.length === 0 && <Empty emoji="🦁" title="Noch keine Daten" />}
          </div>
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
                      <div className="font-display text-base text-zinc-50 truncate">
                        {w.users?.name?.toUpperCase()}
                        {isMe && <span className="ml-2 text-[10px] font-body font-bold tracking-widest text-accent">DU</span>}
                      </div>
                      <div className="text-xs text-zinc-500 shrink-0">{relativeTime(w.created_at)}</div>
                    </div>
                    <div className="text-xs text-zinc-400 mt-0.5 flex items-center gap-1.5 flex-wrap">
                      {w.is_cardio && <Heart className="w-3 h-3 text-accent" />}
                      {w.is_mobility && <Activity className="w-3 h-3 text-ok" />}
                      {!w.is_cardio && !w.is_mobility && <Dumbbell className="w-3 h-3 text-zinc-400" />}
                      <span className="text-zinc-200 font-medium">{w.plan_name}</span>
                      {dur && <span>· {dur}</span>}
                      {w.is_mobility && !w.is_cardio && <span>· {w.completed}/{w.total}</span>}
                      {w.is_cardio && w.is_mobility && <span>· {w.completed}/{w.total} Mobility</span>}
                    </div>
                  </div>
                </div>

                {logs.length > 0 && (
                  <div className="ml-12 mt-2.5 space-y-0.5">
                    {logs.slice(0, 3).map((l, i) => (
                      <div key={i} className="text-xs text-zinc-500 truncate">
                        <span className="text-zinc-300">{l.name}</span> · <span className="font-mono">{l.sets.length} × {heaviestOf(l.sets)} kg</span>
                      </div>
                    ))}
                    {logs.length > 3 && <div className="text-xs text-zinc-600">+ {logs.length - 3} weitere Übungen</div>}
                  </div>
                )}

                {w.skipped_exercises && w.skipped_exercises.length > 0 && (
                  <div className="ml-12 mt-2 text-xs text-accent-2/80 flex items-center gap-1">
                    <Forward className="w-3 h-3" /> {w.skipped_exercises.length} übersprungen
                  </div>
                )}

                {w.notes && (
                  <div className="ml-12 mt-2.5 flex gap-2 text-sm bg-white/[0.03] rounded-xl px-3 py-2 border border-line">
                    <StickyNote className="w-4 h-4 text-gold shrink-0 mt-0.5" />
                    <div className="text-xs text-zinc-300 italic">{w.notes}</div>
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
                        className={`pressable px-2.5 py-1 rounded-full text-sm flex items-center gap-1 border transition-colors ${
                          userReacted ? 'bg-accent/15 border-accent/50' : 'bg-white/[0.04] border-line'
                        }`}>
                        <span>{emoji}</span>
                        <span className="text-xs text-zinc-300 font-semibold">{list.length}</span>
                      </button>
                    );
                  })}
                  {REACTIONS.filter(e => !grouped[e]).map(emoji => (
                    <button key={emoji}
                      onClick={() => handleReaction(w.id, emoji)}
                      className="pressable px-2 py-1 rounded-full text-sm border border-line opacity-40 hover:opacity-100 transition-opacity">
                      {emoji}
                    </button>
                  ))}
                  <button
                    onClick={() => setOpenComments(openComments === w.id ? null : w.id)}
                    className={`ml-auto pressable flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-colors ${openComments === w.id ? 'border-line-2 text-zinc-200' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}>
                    <MessageCircle className="w-4 h-4" />
                    {commentList.length > 0 && <span className="text-xs font-semibold">{commentList.length}</span>}
                  </button>
                </div>

                {openComments === w.id && (
                  <div className="ml-12 mt-3 space-y-2 animate-fade-in">
                    {commentList.map(c => (
                      <div key={c.id} className="flex items-start gap-2">
                        <div className="font-display text-xs text-accent shrink-0 pt-0.5">{c.users?.name?.toUpperCase()}</div>
                        <div className="text-xs text-zinc-300 flex-1">{c.content}</div>
                      </div>
                    ))}
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        value={commentInputs[w.id] || ''}
                        onChange={e => setCommentInputs(prev => ({ ...prev, [w.id]: e.target.value }))}
                        onKeyDown={e => e.key === 'Enter' && handleAddComment(w.id)}
                        placeholder="Kommentar…"
                        className="input-field px-3 py-2 text-xs rounded-full"
                      />
                      <button
                        onClick={() => handleAddComment(w.id)}
                        aria-label="Senden"
                        className="pressable w-9 h-9 shrink-0 btn-primary rounded-full flex items-center justify-center">
                        <Send className="w-4 h-4 text-white" />
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
