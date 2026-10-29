// A campaign's Overview tab, in the order a DM needs it between and
// during sessions: what's next, which threads are open, what happened
// last time, and who's in the party right now.

import React, { FC, useEffect, useState } from 'react';
import { Box, Button, Chip, IconButton, Paper, Stack, Tooltip, Typography } from '@mui/material';
import { ContentCopy, Flag, History, People } from '@mui/icons-material';
import { Campaign } from '../types/Campaign';
import { CampaignEvent } from '../types/CampaignEvent';
import { isOpenThread } from '../types/CampaignThread';
import { eventsApi } from '../api/campaign-play';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { useToast } from '../shared/ToastProvider';
import LinkedText from '../shared/LinkedText';
import CampaignAtAGlance from '../shared/CampaignAtAGlance';
import type { HubTab } from '../shared/CampaignHub';
import NextSessionCard, { formatDay } from './NextSessionCard';
import { ThreadRow, useThreads } from './ThreadsPanel';
import { rosterAc, rosterHp, rosterLevel, useRoster } from './roster';
import { playerRecap, recapEvents, recapLine } from './recap';

const Section: FC<{ icon: React.ReactNode; title: string; action?: React.ReactNode; children: React.ReactNode }> = ({
  icon,
  title,
  action,
  children,
}) => (
  <Paper variant="outlined" sx={{ p: 2 }}>
    <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
      <Box sx={{ color: 'primary.main', display: 'flex' }}>{icon}</Box>
      <Typography variant="h6" sx={{ flexGrow: 1 }}>
        {title}
      </Typography>
      {action}
    </Stack>
    {children}
  </Paper>
);

const OpenThreads: FC<{ campaignId: string; canEdit: boolean; onOpenTab: (t: HubTab) => void }> = ({
  campaignId,
  canEdit,
  onOpenTab,
}) => {
  const { threads, reload } = useThreads(campaignId);
  const open = (threads ?? []).filter(isOpenThread).sort((a, b) => (a.status === 'active' ? -1 : 0) - (b.status === 'active' ? -1 : 0));
  return (
    <Section
      icon={<Flag fontSize="small" />}
      title="Open threads"
      action={
        <Button size="small" onClick={() => onOpenTab('threads')}>
          {open.length > 5 ? `All ${open.length}` : 'Threads'}
        </Button>
      }
    >
      {threads && open.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No open threads. Track quests, rumours and promises on the Threads tab so they don&apos;t get lost between sessions.
        </Typography>
      )}
      {open.slice(0, 5).map((t) => (
        <ThreadRow key={t.id} thread={t} campaignId={campaignId} canEdit={canEdit} compact onChanged={() => void reload()} />
      ))}
    </Section>
  );
};

const LastSession: FC<{ campaignId: string; campaignName: string; onOpenTab: (t: HubTab) => void }> = ({
  campaignId,
  campaignName,
  onOpenTab,
}) => {
  const { lastPlayed, eventsVersion } = useCampaignPlay();
  const { toast } = useToast();
  const [events, setEvents] = useState<CampaignEvent[]>([]);

  useEffect(() => {
    if (!lastPlayed?.id) return setEvents([]);
    let alive = true;
    eventsApi
      .list(campaignId, { session: lastPlayed.id })
      .then((list) => alive && setEvents(list))
      .catch(() => alive && setEvents([]));
    return () => {
      alive = false;
    };
  }, [campaignId, lastPlayed?.id, eventsVersion]);

  if (!lastPlayed) return null;
  // Lines the recap already says (it's drafted from these) aren't repeated.
  const highlights = recapEvents(events, true)
    .filter((e) => !lastPlayed.summary.includes(recapLine(e)))
    .slice(-5)
    .reverse();

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(playerRecap(lastPlayed, events, campaignName));
      toast('Recap copied. DM-only jots were left out.', 'success');
    } catch {
      toast('Could not reach the clipboard', 'error');
    }
  };

  return (
    <Section
      icon={<History fontSize="small" />}
      title={`Last time: ${lastPlayed.title || `Session ${lastPlayed.session_number}`}`}
      action={
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
            {formatDay(lastPlayed.played_on)}
          </Typography>
          <Tooltip title="Copy a recap for your players" arrow>
            <IconButton size="small" onClick={copy} aria-label="Copy recap">
              <ContentCopy fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      }
    >
      {lastPlayed.summary ? (
        <Box sx={{ typography: 'body2', whiteSpace: 'pre-line', display: '-webkit-box', WebkitLineClamp: 6, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
          <LinkedText text={lastPlayed.summary} campaignId={campaignId} />
        </Box>
      ) : (
        <Typography variant="body2" color="text.secondary">
          No recap written for this session.
        </Typography>
      )}
      {highlights.length > 0 && (
        <Box component="ul" sx={{ m: 0, mt: 1, pl: 2.5, color: 'text.secondary', typography: 'body2' }}>
          {highlights.map((e) => (
            <li key={e.id}>
              <LinkedText text={recapLine(e)} campaignId={campaignId} />
            </li>
          ))}
        </Box>
      )}
      <Button size="small" sx={{ mt: 1 }} onClick={() => onOpenTab('sessions')}>
        Full timeline
      </Button>
    </Section>
  );
};

const PartyStrip: FC<{ campaignId: string; onOpenTab: (t: HubTab) => void }> = ({ campaignId, onOpenTab }) => {
  const { eventsVersion } = useCampaignPlay();
  const roster = useRoster(campaignId, eventsVersion);
  return (
    <Section
      icon={<People fontSize="small" />}
      title="Party"
      action={
        <Button size="small" onClick={() => onOpenTab('players')}>
          Players
        </Button>
      }
    >
      {roster && roster.length === 0 && (
        <Typography variant="body2" color="text.secondary">
          No characters yet. Link a party on the Players tab.
        </Typography>
      )}
      <Box sx={{ display: 'grid', gap: 1, gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr', lg: 'repeat(4, 1fr)' } }}>
        {roster?.map((r) => {
          const conditions = r.state?.conditions ?? [];
          const failures = r.state?.death_save_failures ?? 0;
          return (
            <Box key={r.character.id} sx={{ p: 1, border: 1, borderColor: 'divider', borderRadius: 1, minWidth: 0 }}>
              <Typography variant="subtitle2" noWrap>
                {r.character.name}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: '"JetBrains Mono", monospace' }}>
                Lv {rosterLevel(r)} · {rosterHp(r)} HP · AC {rosterAc(r)}
              </Typography>
              {(conditions.length > 0 || failures > 0) && (
                <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
                  {conditions.map((c) => (
                    <Chip key={c} size="small" label={c} color="warning" variant="outlined" />
                  ))}
                  {failures > 0 && <Chip size="small" color="error" variant="outlined" label={`${failures} death save fail${failures > 1 ? 's' : ''}`} />}
                </Stack>
              )}
            </Box>
          );
        })}
      </Box>
    </Section>
  );
};

const CampaignOverview: FC<{ campaign: Campaign; canEdit: boolean; onOpenTab: (t: HubTab) => void }> = ({
  campaign,
  canEdit,
  onOpenTab,
}) => {
  const campaignId = campaign.id ?? '';
  const { campaignId: activeId } = useCampaignPlay();
  // The play context follows the active campaign; another one's overview gets the summary tiles.
  const isActive = activeId === campaignId;
  return (
    <Stack spacing={2}>
      {isActive && <NextSessionCard campaign={campaign} canEdit={canEdit} />}
      <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, alignItems: 'start' }}>
        <OpenThreads campaignId={campaignId} canEdit={canEdit} onOpenTab={onOpenTab} />
        {isActive && <LastSession campaignId={campaignId} campaignName={campaign.name} onOpenTab={onOpenTab} />}
      </Box>
      <PartyStrip campaignId={campaignId} onOpenTab={onOpenTab} />
      <CampaignAtAGlance campaignId={campaignId} onOpenTab={onOpenTab} />
    </Stack>
  );
};

export default CampaignOverview;
