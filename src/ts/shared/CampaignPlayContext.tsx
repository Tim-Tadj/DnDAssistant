// The active campaign's play state: the session being prepped, the
// session being played, and the start / end / jot dialogs. The Next Session card, the
// live-session bar and the timeline all read from here, so starting or
// ending a session in one place updates the others.

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useCampaignContext } from './CampaignContext';
import { sessionsApi, EndSessionResult } from '../api/sessions';
import { eventsApi } from '../api/campaign-play';
import { CampaignSession, defaultCampaignSession, todayIso } from '../types/CampaignSession';
import { CampaignEvent, NewJot } from '../types/CampaignEvent';

export type PlayDialog = 'start' | 'end' | 'jot' | null;
export type PrepPatch = Partial<CampaignSession> | ((current: CampaignSession | null) => Partial<CampaignSession>);

export type CampaignPlayValue = {
  campaignId: string | null;
  sessions: CampaignSession[]; // newest first
  live: CampaignSession | null;
  upcoming: CampaignSession | null;
  lastPlayed: CampaignSession | null;
  reload: () => Promise<void>;
  // Bumped whenever something lands on the timeline; views that show
  // events reload when it changes.
  eventsVersion: number;
  bumpEvents: () => void;
  // Edits the session being prepped or played: the live one if there
  // is one, else the planned draft, which is created on first use.
  // Pass a function to build the patch from the latest saved session
  // (edits made in quick succession would otherwise overwrite each other).
  savePrep: (patch: PrepPatch) => Promise<CampaignSession>;
  startSession: (attendees: string[]) => Promise<void>;
  endSession: (body: { title: string; summary: string; next_session_on: string | null }) => Promise<EndSessionResult>;
  addJot: (jot: NewJot) => Promise<CampaignEvent>;
  dialog: PlayDialog;
  openDialog: (d: PlayDialog) => void;
};

const Ctx = createContext<CampaignPlayValue | null>(null);

export function CampaignPlayProvider({ children }: { children: ReactNode }) {
  const { activeCampaignId: campaignId, reloadCampaigns } = useCampaignContext();
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [eventsVersion, setEventsVersion] = useState(0);
  const [dialog, openDialog] = useState<PlayDialog>(null);
  // Prep edits run one at a time against the latest sessions, so a quick
  // second edit builds on the first instead of racing it (and the draft
  // is only created once).
  const latest = useRef<CampaignSession[]>([]);
  const queue = useRef<Promise<unknown>>(Promise.resolve());
  const setAll = (list: CampaignSession[]) => {
    latest.current = list;
    setSessions(list);
  };

  const reload = useCallback(async () => {
    if (!campaignId) {
      setAll([]);
      return;
    }
    const list = await sessionsApi.list(campaignId).catch(() => [] as CampaignSession[]);
    setAll(list);
  }, [campaignId]);

  useEffect(() => {
    setAll([]);
    void reload();
  }, [reload]);

  const live = useMemo(() => sessions.find((s) => s.status === 'live') ?? null, [sessions]);
  const upcoming = useMemo(() => sessions.find((s) => s.status === 'planned') ?? null, [sessions]);
  const lastPlayed = useMemo(() => sessions.find((s) => (s.status ?? 'played') === 'played') ?? null, [sessions]);

  const bumpEvents = useCallback(() => setEventsVersion((v) => v + 1), []);

  const replace = (s: CampaignSession) =>
    setAll([...latest.current.filter((x) => x.id !== s.id), s].sort((a, b) => b.session_number - a.session_number));

  const savePrep = useCallback(
    (input: PrepPatch) => {
      const run = queue.current.then(async () => {
        if (!campaignId) throw new Error('No campaign selected');
        const all = latest.current;
        const existing = all.find((s) => s.status === 'live') ?? all.find((s) => s.status === 'planned') ?? null;
        const patch = typeof input === 'function' ? input(existing) : input;
        if (existing?.id) {
          // Optimistic, so ticking boxes feels instant.
          replace({ ...existing, ...patch });
          const saved = await sessionsApi.update(campaignId, existing.id, patch);
          replace(saved);
          return saved;
        }
        const number = all.reduce((acc, s) => Math.max(acc, s.session_number), 0) + 1;
        const saved = await sessionsApi.create(campaignId, {
          ...defaultCampaignSession,
          session_number: number,
          status: 'planned',
          prep: [],
          strong_start: '',
          ...patch,
        });
        replace(saved);
        return saved;
      });
      queue.current = run.catch(() => undefined);
      return run;
    },
    [campaignId],
  );

  const startSession = useCallback(
    async (attendees: string[]) => {
      if (!campaignId) return;
      const draft = upcoming ?? (await savePrep({}));
      if (!draft.id) return;
      const started = await sessionsApi.start(campaignId, draft.id, { played_on: todayIso(), attendees });
      replace(started);
      bumpEvents();
      void reloadCampaigns();
    },
    [campaignId, upcoming, savePrep, bumpEvents, reloadCampaigns],
  );

  const endSession = useCallback(
    async (body: { title: string; summary: string; next_session_on: string | null }) => {
      if (!campaignId || !live?.id) throw new Error('No session is in progress');
      const result = await sessionsApi.end(campaignId, live.id, body);
      await reload();
      bumpEvents();
      void reloadCampaigns();
      return result;
    },
    [campaignId, live, reload, bumpEvents, reloadCampaigns],
  );

  const addJot = useCallback(
    async (jot: NewJot) => {
      if (!campaignId) throw new Error('No campaign selected');
      const ev = await eventsApi.create(campaignId, jot);
      bumpEvents();
      return ev;
    },
    [campaignId, bumpEvents],
  );

  const value = useMemo<CampaignPlayValue>(
    () => ({
      campaignId,
      sessions,
      live,
      upcoming,
      lastPlayed,
      reload,
      eventsVersion,
      bumpEvents,
      savePrep,
      startSession,
      endSession,
      addJot,
      dialog,
      openDialog,
    }),
    [
      campaignId,
      sessions,
      live,
      upcoming,
      lastPlayed,
      reload,
      eventsVersion,
      bumpEvents,
      savePrep,
      startSession,
      endSession,
      addJot,
      dialog,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaignPlay(): CampaignPlayValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCampaignPlay must be used within <CampaignPlayProvider>');
  return ctx;
}
