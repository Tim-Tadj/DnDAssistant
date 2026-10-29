// "End & record": turns the fight in the tracker into a played
// encounter record: outcome, rounds, who fell, XP earned, the combat
// log and each combatant's final state, tied to the campaign session
// it happened in (an existing one, or a new one created on save).

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Checkbox,
  Chip,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import { useEncounter } from './EncounterContext';
import { useCampaignContext } from '../shared/CampaignContext';
import FormDialog from '../shared/FormDialog';
import { sessionsApi } from '../api/sessions';
import { useCampaignPlay } from '../shared/CampaignPlayContext';
import { encounterSavesApi } from '../api/encounter-saves';
import { collapseMonstersToRefs } from '../api/hydrate-encounter';
import { CampaignSession, defaultCampaignSession, isPlayedSession } from '../types/CampaignSession';
import { CombatantResult, EncounterSave, OUTCOMES } from '../types/EncounterSave';

const NEW_SESSION = '__new__';
const NO_SESSION = '';

const today = () => new Date().toISOString().slice(0, 10);

// "3× Goblin, Wolf"
export const tally = (rs: CombatantResult[]) => {
  const counts = new Map<string, number>();
  rs.forEach((r) => counts.set(r.name, (counts.get(r.name) ?? 0) + 1));
  return Array.from(counts, ([name, n]) => (n > 1 ? `${n}× ${name}` : name)).join(', ');
};

const sessionLabel = (s: CampaignSession) =>
  `#${s.session_number}${s.title ? ` · ${s.title}` : ''}${s.status === 'live' ? ' (in progress)' : s.played_on ? ` (${s.played_on})` : ''}`;

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: (record: EncounterSave) => void;
};

const RecordEncounterDialog: FC<Props> = ({ open, onClose, onSaved }) => {
  const enc = useEncounter();
  const { activeCampaign } = useCampaignContext();
  const play = useCampaignPlay();
  const campaignId = activeCampaign?.id ?? null;

  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [name, setName] = useState('');
  const [outcome, setOutcome] = useState<string>('Victory');
  const [rounds, setRounds] = useState(1);
  const [sessionId, setSessionId] = useState<string>(NO_SESSION);
  const [playedOn, setPlayedOn] = useState(today());
  const [notes, setNotes] = useState('');
  const [keepLog, setKeepLog] = useState(true);

  // Snapshot the fight when the dialog opens.
  const results = useMemo(() => (open ? enc.tracker.results() : []), [open]);
  const xpByName = useMemo(() => {
    const m = new Map<string, number>();
    collapseMonstersToRefs(enc.monstersInCombat).refs.forEach((r) => m.set(r.name, r.xp_each));
    return m;
  }, [enc.monstersInCombat]);

  const monsters = results.filter((r) => !r.isPC);
  const pcs = results.filter((r) => r.isPC);
  const defeated = monsters.filter((r) => r.defeated);
  const standing = monsters.filter((r) => !r.defeated);
  const xpEarned = defeated.reduce((acc, r) => acc + (xpByName.get(r.name) ?? 0), 0);

  useEffect(() => {
    if (!open) return;
    setName(enc.meta.name || `Encounter ${new Date().toLocaleDateString()}`);
    setOutcome(standing.length === 0 && monsters.length > 0 ? 'Victory' : 'Other');
    setRounds(enc.tracker.round);
    setNotes('');
    setKeepLog(true);
    setPlayedOn(today());
    setSessions([]);
    setSessionId(campaignId ? NEW_SESSION : NO_SESSION);
    if (!campaignId) return;
    // Default to the live session, else the latest played one; offer a
    // new one when there is none. The planned draft isn't pickable, but
    // "New session" fills it in rather than making a second one.
    sessionsApi
      .list(campaignId)
      .then((list) => {
        setSessions(list);
        const pick = list.find((s) => s.status === 'live') ?? list.find(isPlayedSession);
        if (pick?.id) {
          setSessionId(pick.id);
          if (pick.played_on) setPlayedOn(pick.played_on);
        }
      })
      .catch(() => undefined);
  }, [open]);

  const draft = sessions.find((s) => s.status === 'planned');
  const pickable = sessions.filter((s) => s.status !== 'planned');
  const nextNumber = draft?.session_number ?? sessions.reduce((acc, s) => Math.max(acc, s.session_number), 0) + 1;

  const onSessionChange = (id: string) => {
    setSessionId(id);
    const s = sessions.find((x) => x.id === id);
    if (s?.played_on) setPlayedOn(s.played_on);
  };

  const save = async () => {
    if (!name.trim()) throw new Error('Name is required');
    let session: string | null = sessionId || null;
    if (sessionId === NEW_SESSION && campaignId && draft?.id) {
      await sessionsApi.update(campaignId, draft.id, { status: 'played', played_on: playedOn });
      session = draft.id;
    } else if (sessionId === NEW_SESSION && campaignId) {
      const created = await sessionsApi.create(campaignId, {
        ...defaultCampaignSession,
        session_number: nextNumber,
        played_on: playedOn,
      });
      session = created.id ?? null;
    }
    const { refs } = collapseMonstersToRefs(enc.monstersInCombat);
    const record = await encounterSavesApi.create({
      campaign_id: campaignId,
      name: name.trim(),
      monsters: refs,
      party_snapshot_ids: (enc.party ?? [])
        .filter((c) => c.id && pcs.some((p) => p.name === c.name))
        .map((c) => c.id as string),
      difficulty: enc.meta.difficulty,
      total_xp: xpEarned,
      played_on: playedOn || null,
      notes,
      status: 'played',
      session_id: session,
      source_id: enc.meta.id,
      outcome,
      rounds,
      log: keepLog ? enc.tracker.log : [],
      combatants: results,
    });
    onSaved(record);
    void play.reload();
    play.bumpEvents();
  };

  return (
    <FormDialog
      open={open}
      title="Record encounter result"
      subtitle={activeCampaign ? `Saved to ${activeCampaign.name}` : 'No active campaign: saved to your personal history'}
      onClose={onClose}
      onSave={save}
      saveLabel="Record & end"
      maxWidth="sm"
    >
      <Stack spacing={2}>
        <TextField label="Name" value={name} onChange={(e) => setName(e.target.value)} fullWidth autoFocus />
        <Stack direction="row" spacing={2}>
          <TextField select label="Outcome" value={outcome} onChange={(e) => setOutcome(e.target.value)} fullWidth>
            {OUTCOMES.map((o) => (
              <MenuItem key={o} value={o}>
                {o}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            label="Rounds"
            type="number"
            value={rounds}
            onChange={(e) => setRounds(Math.max(0, Number(e.target.value) || 0))}
            sx={{ width: 120, flexShrink: 0 }}
          />
        </Stack>
        <Stack direction="row" spacing={2}>
          <TextField
            select
            label="Session"
            value={sessionId}
            onChange={(e) => onSessionChange(e.target.value)}
            fullWidth
            disabled={!campaignId}
            helperText={campaignId ? undefined : 'Pick a campaign at the top to tie this to a session'}
          >
            {campaignId && <MenuItem value={NEW_SESSION}>New session #{nextNumber}</MenuItem>}
            {pickable.map((s) => (
              <MenuItem key={s.id} value={s.id}>
                {sessionLabel(s)}
              </MenuItem>
            ))}
            <MenuItem value={NO_SESSION}>Not tied to a session</MenuItem>
          </TextField>
          <TextField
            label="Played on"
            type="date"
            value={playedOn}
            onChange={(e) => setPlayedOn(e.target.value)}
            sx={{ width: 180, flexShrink: 0 }}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>

        <Box sx={{ p: 1.5, borderRadius: 1, border: 1, borderColor: 'divider' }}>
          <Stack spacing={1}>
            <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
              <Typography variant="overline">Summary</Typography>
              <Chip size="small" label={`${xpEarned.toLocaleString()} XP earned`} color="primary" variant="outlined" />
              {pcs.length > 0 && xpEarned > 0 && (
                <Chip size="small" label={`${Math.floor(xpEarned / pcs.length).toLocaleString()} XP each`} variant="outlined" />
              )}
            </Stack>
            <SummaryLine label="Defeated" value={tally(defeated) || 'None'} />
            {standing.length > 0 && <SummaryLine label="Still standing" value={tally(standing)} />}
            {pcs.length > 0 && (
              <SummaryLine
                label="Party"
                value={pcs.map((p) => `${p.name} ${p.defeated ? 'down' : `${p.hp}/${p.max_hp}`}`).join(', ')}
              />
            )}
          </Stack>
        </Box>

        <TextField
          label="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          fullWidth
          multiline
          rows={3}
          placeholder="Loot, who landed the killing blow, plot hooks, what to remember next session"
          InputLabelProps={{ shrink: true }}
        />
        <FormControlLabel
          control={<Checkbox checked={keepLog} onChange={(e) => setKeepLog(e.target.checked)} />}
          label={`Keep the combat log (${enc.tracker.log.length} entries)`}
        />
      </Stack>
    </FormDialog>
  );
};

const SummaryLine: FC<{ label: string; value: string }> = ({ label, value }) => (
  <Typography variant="body2">
    <Typography component="span" variant="body2" color="text.secondary">
      {label}:{' '}
    </Typography>
    {value}
  </Typography>
);

export default RecordEncounterDialog;
