// Saved encounters, split the way a DM uses them:
//   - Prepared: built ahead of time. Run it live, test-run it
//     (practice, nothing recorded), edit the prep notes, delete.
//   - Played: what happened at the table: outcome, session, rounds,
//     XP, who fell, notes and the combat log. Edit the record, or run
//     the same fight again.
//
// Used by the Encounters page's Library tab and a campaign's
// Encounters tab. `campaignId` scopes the list to one campaign; null
// lists all of the user's saves.

import React, { FC, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Collapse,
  Divider,
  IconButton,
  MenuItem,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Delete,
  Edit,
  EventNote,
  ExpandLess,
  ExpandMore,
  PlayArrow,
  Replay,
  Science,
  TaskAlt,
  Timer,
} from '@mui/icons-material';
import { EncounterSave, OUTCOMES, isPlayed } from '../types/EncounterSave';
import { CampaignSession } from '../types/CampaignSession';
import { encounterSavesApi } from '../api/encounter-saves';
import { sessionsApi } from '../api/sessions';
import { useToast } from '../shared/ToastProvider';
import { useSettings } from '../shared/SettingsContext';
import { useConfirm } from '../shared/useConfirm';
import FormDialog, { requireName } from '../shared/FormDialog';
import { useRunEncounter } from './useRunEncounter';
import { tally } from './RecordEncounterDialog';

type Props = {
  campaignId: string | null;
  canEdit?: boolean;
  /** Shown when there are no prepared encounters (e.g. "Build one"). */
  emptyAction?: ReactNode;
  /** Scroll to and highlight this save (from search). */
  highlightId?: string | null;
};

const OUTCOME_COLORS: Record<string, 'success' | 'error' | 'warning' | 'info' | 'default'> = {
  Victory: 'success',
  Defeat: 'error',
  Fled: 'warning',
  Negotiated: 'info',
};

const mono = { fontFamily: '"JetBrains Mono", monospace' };

const formatDate = (d?: string | null) => {
  if (!d) return null;
  const date = new Date(`${d}T00:00:00`);
  return isNaN(date.getTime()) ? d : date.toLocaleDateString();
};

const monsterCount = (s: EncounterSave) => (s.monsters ?? []).reduce((acc, m) => acc + m.count, 0);

const EncounterSavesView: FC<Props> = ({ campaignId, canEdit = true, emptyAction, highlightId }) => {
  const { toast } = useToast();
  const { settings } = useSettings();
  const { confirm, dialog } = useConfirm();
  const runner = useRunEncounter();
  const [saves, setSaves] = useState<EncounterSave[] | null>(null);
  const [sessions, setSessions] = useState<CampaignSession[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [editing, setEditing] = useState<EncounterSave | null>(null);

  const reload = async () => {
    setLoadError(null);
    try {
      const [list, sess] = await Promise.all([
        campaignId ? encounterSavesApi.listForCampaign(campaignId) : encounterSavesApi.list(),
        campaignId ? sessionsApi.list(campaignId) : Promise.resolve([] as CampaignSession[]),
      ]);
      setSaves(list);
      setSessions(sess);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    setSaves(null);
    void reload();
  }, [campaignId]);

  const { prepared, played, timesPlayed } = useMemo(() => {
    const all = saves ?? [];
    const playedList = all.filter(isPlayed);
    const counts = new Map<string, { n: number; last: string | null }>();
    for (const p of playedList) {
      if (!p.source_id) continue;
      const c = counts.get(p.source_id) ?? { n: 0, last: null };
      c.n += 1;
      if (p.played_on && (!c.last || p.played_on > c.last)) c.last = p.played_on;
      counts.set(p.source_id, c);
    }
    return {
      prepared: all.filter((s) => !isPlayed(s)),
      played: playedList,
      timesPlayed: counts,
    };
  }, [saves]);

  const sessionOf = (id?: string | null) => sessions.find((s) => s.id === id);

  const onDelete = async (s: EncounterSave) => {
    if (!s.id) return;
    if (settings.confirmDestructive) {
      const ok = await confirm({ title: `Delete "${s.name}"?`, confirmLabel: 'Delete', destructive: true });
      if (!ok) return;
    }
    try {
      await encounterSavesApi.remove(s.id);
      toast('Encounter deleted', 'success');
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  if (loadError) return <Alert severity="error">{loadError}</Alert>;
  if (saves === null) {
    return (
      <Stack alignItems="center" sx={{ py: 4 }}>
        <CircularProgress />
      </Stack>
    );
  }

  return (
    <Stack spacing={3}>
      {dialog}
      {runner.dialog}

      <Section
        title="Prepared"
        hint="Built ahead of time. Run it at the table, or test-run it first."
        count={prepared.length}
      >
        {prepared.length === 0 ? (
          <Empty text="No prepared encounters yet. Build one and save it to the library." action={emptyAction} />
        ) : (
          <Grid>
            {prepared.map((s) => {
              const usage = s.id ? timesPlayed.get(s.id) : undefined;
              return (
                <SaveCard key={s.id} save={s} highlighted={s.id === highlightId}>
                  <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                    <CardTitle save={s} />
                    <MonsterChips save={s} />
                    <Meta>
                      {monsterCount(s)} monsters · <span style={mono}>{s.total_xp.toLocaleString()} XP</span>
                      {usage && ` · played ${usage.n}×${usage.last ? `, last ${formatDate(usage.last)}` : ''}`}
                    </Meta>
                    <Notes text={s.notes} />
                  </CardContent>
                  <Divider />
                  <CardActions sx={{ px: 1.5, justifyContent: 'space-between' }}>
                    <Stack direction="row" spacing={1}>
                      <Button
                        size="small"
                        variant="contained"
                        startIcon={runner.loadingId === s.id ? <CircularProgress size={12} /> : <PlayArrow />}
                        onClick={() => runner.run(s, 'live')}
                        disabled={runner.loadingId !== null}
                      >
                        Run
                      </Button>
                      <Tooltip title="Try it out. Nothing is recorded." arrow>
                        <Button
                          size="small"
                          startIcon={<Science />}
                          onClick={() => runner.run(s, 'practice')}
                          disabled={runner.loadingId !== null}
                        >
                          Test run
                        </Button>
                      </Tooltip>
                    </Stack>
                    {canEdit && <EditDelete onEdit={() => setEditing(s)} onDelete={() => onDelete(s)} />}
                  </CardActions>
                </SaveCard>
              );
            })}
          </Grid>
        )}
      </Section>

      <Section
        title="Played"
        hint="What happened at the table. Use End & record in the tracker to add one."
        count={played.length}
      >
        {played.length === 0 ? (
          <Empty text="No recorded encounters yet. Run one live, then choose End & record when the fight is over." />
        ) : (
          <Stack spacing={1.5}>
            {played.map((s) => (
              <PlayedCard
                key={s.id}
                save={s}
                session={sessionOf(s.session_id)}
                highlighted={s.id === highlightId}
                actions={
                  <>
                    <Tooltip title="Run this fight again" arrow>
                      <span>
                        <Button
                          size="small"
                          startIcon={runner.loadingId === s.id ? <CircularProgress size={12} /> : <Replay />}
                          onClick={() => runner.run(s, 'live')}
                          disabled={runner.loadingId !== null}
                        >
                          Run again
                        </Button>
                      </span>
                    </Tooltip>
                    {canEdit && <EditDelete onEdit={() => setEditing(s)} onDelete={() => onDelete(s)} />}
                  </>
                }
              />
            ))}
          </Stack>
        )}
      </Section>

      <EditSaveDialog
        save={editing}
        sessions={sessions}
        onClose={() => setEditing(null)}
        onSaved={() => {
          toast('Encounter updated', 'success');
          void reload();
        }}
      />
    </Stack>
  );
};

// ---- Pieces -----------------------------------------------------------

const Section: FC<{ title: string; hint: string; count: number; children: ReactNode }> = ({
  title,
  hint,
  count,
  children,
}) => (
  <Box>
    <Stack direction="row" spacing={1} alignItems="baseline" sx={{ mb: 1 }}>
      <Typography variant="h5">{title}</Typography>
      <Typography variant="body2" color="text.secondary">
        {count}
      </Typography>
      <Typography variant="caption" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
        · {hint}
      </Typography>
    </Stack>
    {children}
  </Box>
);

const Grid: FC<{ children: ReactNode }> = ({ children }) => (
  <Box sx={{ display: 'grid', gap: 1.5, gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(320px, 1fr))' } }}>
    {children}
  </Box>
);

const Empty: FC<{ text: string; action?: ReactNode }> = ({ text, action }) => {
  const theme = useTheme();
  return (
    <Card variant="outlined" sx={{ p: 2.5, textAlign: 'center', backgroundColor: alpha(theme.palette.primary.main, 0.04) }}>
      <Typography variant="body2" color="text.secondary" sx={{ mb: action ? 1.5 : 0 }}>
        {text}
      </Typography>
      {action}
    </Card>
  );
};

// A card that scrolls into view and glows when search points at it.
const SaveCard: FC<{ save: EncounterSave; highlighted?: boolean; children: ReactNode }> = ({
  highlighted,
  children,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);
  return (
    <Card
      ref={ref}
      variant="outlined"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        borderColor: highlighted ? 'primary.main' : undefined,
        boxShadow: (t) => (highlighted ? `0 0 0 2px ${alpha(t.palette.primary.main, 0.35)}` : 'none'),
      }}
    >
      {children}
    </Card>
  );
};

const CardTitle: FC<{ save: EncounterSave; extra?: ReactNode }> = ({ save, extra }) => (
  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, minWidth: 0 }}>
    <Typography variant="h6" noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
      {save.name || 'Unnamed encounter'}
    </Typography>
    {extra}
    {save.difficulty && <Chip label={save.difficulty} size="small" variant="outlined" />}
  </Stack>
);

const MonsterChips: FC<{ save: EncounterSave }> = ({ save }) => (
  <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
    {(save.monsters ?? []).slice(0, 6).map((m) => (
      <Chip key={`${m.id}-${m.name}`} label={`${m.count}× ${m.name}`} size="small" variant="outlined" />
    ))}
    {(save.monsters?.length ?? 0) > 6 && (
      <Chip label={`+${(save.monsters?.length ?? 0) - 6} more`} size="small" variant="outlined" />
    )}
  </Stack>
);

const Meta: FC<{ children: ReactNode }> = ({ children }) => (
  <Typography variant="caption" color="text.secondary" component="div">
    {children}
  </Typography>
);

const Notes: FC<{ text?: string; clamp?: boolean }> = ({ text, clamp = true }) =>
  text ? (
    <Typography
      variant="body2"
      color="text.secondary"
      sx={{
        mt: 1,
        whiteSpace: 'pre-wrap',
        ...(clamp && { display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }),
      }}
    >
      {text}
    </Typography>
  ) : null;

const EditDelete: FC<{ onEdit: () => void; onDelete: () => void }> = ({ onEdit, onDelete }) => (
  <Stack direction="row">
    <Tooltip title="Edit" arrow>
      <IconButton size="small" onClick={onEdit} aria-label="Edit">
        <Edit fontSize="small" />
      </IconButton>
    </Tooltip>
    <Tooltip title="Delete" arrow>
      <IconButton size="small" color="error" onClick={onDelete} aria-label="Delete">
        <Delete fontSize="small" />
      </IconButton>
    </Tooltip>
  </Stack>
);

const PlayedCard: FC<{
  save: EncounterSave;
  session?: CampaignSession;
  highlighted?: boolean;
  actions: ReactNode;
}> = ({ save, session, highlighted, actions }) => {
  const [showLog, setShowLog] = useState(false);
  const combatants = save.combatants ?? [];
  const defeated = combatants.filter((c) => !c.isPC && c.defeated);
  const downedPCs = combatants.filter((c) => c.isPC && c.defeated);
  const log = save.log ?? [];
  return (
    <SaveCard save={save} highlighted={highlighted}>
      <CardContent sx={{ pb: 1 }}>
        <CardTitle
          save={save}
          extra={
            save.outcome && (
              <Chip label={save.outcome} size="small" color={OUTCOME_COLORS[save.outcome] ?? 'default'} icon={<TaskAlt />} />
            )
          }
        />
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap sx={{ color: 'text.secondary', mb: 0.5 }}>
          {save.played_on && <Meta>{formatDate(save.played_on)}</Meta>}
          {session && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <EventNote sx={{ fontSize: 14 }} />
              <Meta>
                Session {session.session_number}
                {session.title && `: ${session.title}`}
              </Meta>
            </Stack>
          )}
          {!!save.rounds && (
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Timer sx={{ fontSize: 14 }} />
              <Meta>
                {save.rounds} round{save.rounds === 1 ? '' : 's'}
              </Meta>
            </Stack>
          )}
          <Meta>
            <span style={mono}>{save.total_xp.toLocaleString()} XP</span> earned
          </Meta>
        </Stack>
        {combatants.length > 0 ? (
          <Meta>
            Defeated: {tally(defeated) || 'none'}
            {downedPCs.length > 0 && ` · PCs down: ${downedPCs.map((p) => p.name).join(', ')}`}
          </Meta>
        ) : (
          <MonsterChips save={save} />
        )}
        <Notes text={save.notes} />
        <Collapse in={showLog} unmountOnExit>
          <Box
            component="ol"
            sx={{ m: 0, mt: 1, pl: 0, listStyle: 'none', maxHeight: 280, overflow: 'auto', borderTop: 1, borderColor: 'divider', pt: 1 }}
          >
            {log.map((e, i) => (
              <Typography
                key={i}
                component="li"
                variant="body2"
                sx={{ py: 0.25, fontWeight: e.kind === 'round' || e.kind === 'start' ? 600 : 400, color: e.kind === 'down' ? 'error.main' : undefined }}
              >
                <Box component="span" sx={{ ...mono, color: 'text.secondary', mr: 1 }}>
                  R{e.round}
                </Box>
                {e.text}
              </Typography>
            ))}
          </Box>
        </Collapse>
      </CardContent>
      <Divider />
      <CardActions sx={{ px: 1.5, justifyContent: 'space-between' }}>
        {log.length > 0 ? (
          <Button size="small" color="inherit" onClick={() => setShowLog((v) => !v)} endIcon={showLog ? <ExpandLess /> : <ExpandMore />}>
            Combat log ({log.length})
          </Button>
        ) : (
          <span />
        )}
        <Stack direction="row" spacing={0.5} alignItems="center">
          {actions}
        </Stack>
      </CardActions>
    </SaveCard>
  );
};

// Prepared encounters edit name + prep notes; played records also
// edit outcome, session and date.
const EditSaveDialog: FC<{
  save: EncounterSave | null;
  sessions: CampaignSession[];
  onClose: () => void;
  onSaved: () => void;
}> = ({ save, sessions, onClose, onSaved }) => {
  const [draft, setDraft] = useState<EncounterSave | null>(save);
  useEffect(() => setDraft(save), [save]);
  const played = !!save && isPlayed(save);
  const set = <K extends keyof EncounterSave>(k: K, v: EncounterSave[K]) =>
    setDraft((d) => (d ? { ...d, [k]: v } : d));

  return (
    <FormDialog
      open={save !== null}
      title={played ? 'Edit encounter record' : 'Edit prepared encounter'}
      onClose={onClose}
      maxWidth="sm"
      onSave={async () => {
        requireName(draft);
        if (!draft?.id) return;
        await encounterSavesApi.update(draft.id, draft);
        onSaved();
      }}
    >
      {draft && (
        <Stack spacing={2}>
          <TextField label="Name" value={draft.name} onChange={(e) => set('name', e.target.value)} fullWidth />
          {played && (
            <>
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Outcome"
                  value={draft.outcome ?? ''}
                  onChange={(e) => set('outcome', e.target.value)}
                  fullWidth
                >
                  {OUTCOMES.map((o) => (
                    <MenuItem key={o} value={o}>
                      {o}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Rounds"
                  type="number"
                  value={draft.rounds ?? 0}
                  onChange={(e) => set('rounds', Math.max(0, Number(e.target.value) || 0))}
                  sx={{ width: 120, flexShrink: 0 }}
                />
              </Stack>
              <Stack direction="row" spacing={2}>
                <TextField
                  select
                  label="Session"
                  value={draft.session_id ?? ''}
                  onChange={(e) => set('session_id', e.target.value || null)}
                  fullWidth
                  disabled={sessions.length === 0}
                >
                  <MenuItem value="">Not tied to a session</MenuItem>
                  {sessions.map((s) => (
                    <MenuItem key={s.id} value={s.id}>
                      #{s.session_number}
                      {s.title ? ` · ${s.title}` : ''}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  label="Played on"
                  type="date"
                  value={draft.played_on ?? ''}
                  onChange={(e) => set('played_on', e.target.value || null)}
                  sx={{ width: 180, flexShrink: 0 }}
                  InputLabelProps={{ shrink: true }}
                />
              </Stack>
            </>
          )}
          <TextField
            label={played ? 'Notes' : 'Prep notes'}
            value={draft.notes}
            onChange={(e) => set('notes', e.target.value)}
            fullWidth
            multiline
            rows={4}
            InputLabelProps={{ shrink: true }}
          />
        </Stack>
      )}
    </FormDialog>
  );
};

export default EncounterSavesView;
