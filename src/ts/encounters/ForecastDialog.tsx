// The encounter forecast UI: a small "≈82% win" chip for prep lists,
// and a dialog with the details. Given several encounters, the dialog
// shows the adventuring day instead: the fights in order, with HP
// carried from one to the next.

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  LinearProgress,
  Stack,
  Switch,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { Insights, Refresh } from '@mui/icons-material';
import { EncounterSave } from '../types/EncounterSave';
import { Monster } from '../types/Monster';
import { monstersApi } from '../api/monsters';
import { loadClasses, classNameOf } from '../shared/useReference';
import { DndClass } from '../types/Character';
import { loadRoster, RosterEntry, rosterAc, rosterHp, rosterLevel } from '../campaigns/roster';
import { DayStep, Fighter, Forecast, forecast, forecastDay, monsterFighter, pcFighter } from './forecast';

// ---- Inputs, cached briefly so a prep list with several chips loads once.

let monstersPending: Promise<Map<number, Monster>> | null = null;
const loadMonsters = () => {
  if (!monstersPending) {
    monstersPending = monstersApi
      .list()
      .then((all) => new Map(all.filter((m) => typeof m.id === 'number').map((m) => [m.id as number, m])))
      .catch((e) => {
        monstersPending = null;
        throw e;
      });
  }
  return monstersPending;
};

const rosterCache = new Map<string, { at: number; p: Promise<RosterEntry[]> }>();
const loadRosterCached = (campaignId: string) => {
  const hit = rosterCache.get(campaignId);
  if (hit && Date.now() - hit.at < 15000) return hit.p;
  const p = loadRoster(campaignId);
  rosterCache.set(campaignId, { at: Date.now(), p });
  return p;
};

type Inputs = { roster: RosterEntry[]; classes: DndClass[]; monsters: Map<number, Monster> };

const loadInputs = async (campaignId: string): Promise<Inputs> => {
  const [roster, classes, monsters] = await Promise.all([
    loadRosterCached(campaignId),
    loadClasses().catch(() => [] as DndClass[]),
    loadMonsters(),
  ]);
  return { roster, classes, monsters };
};

const partyOf = (roster: RosterEntry[], classes: DndClass[]): Fighter[] =>
  roster.map((r) =>
    pcFighter({
      name: r.character.name,
      className: classNameOf(classes, r.character.class_id),
      level: rosterLevel(r),
      maxHp: rosterHp(r),
      ac: rosterAc(r),
      scores: [r.character.str, r.character.dex, r.character.con, r.character.int_, r.character.wis, r.character.cha],
    }),
  );

const monstersOf = (save: EncounterSave, byId: Map<number, Monster>): Fighter[] =>
  (save.monsters ?? []).flatMap((ref) => {
    const m: Monster =
      byId.get(ref.id) ??
      ({ name: ref.name, ac: '12', hp: String(Math.max(5, ref.xp_each / 5)), challenge: '', actions: '' } as Monster);
    return Array.from({ length: ref.count }, (_, i) => monsterFighter(m, ref.count > 1 ? `${ref.name} ${i + 1}` : ref.name));
  });

const pct = (n: number) => `${Math.round(n)}%`;
const winColor = (n: number): 'success' | 'warning' | 'error' => (n >= 80 ? 'success' : n >= 50 ? 'warning' : 'error');

// ---- The chip -----------------------------------------------------------

export const ForecastChip: FC<{ campaignId: string; save: EncounterSave }> = ({ campaignId, save }) => {
  const [result, setResult] = useState<Forecast | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let alive = true;
    setResult(null);
    loadInputs(campaignId)
      .then(({ roster, classes, monsters }) => {
        if (!alive || !roster.length) return;
        const foes = monstersOf(save, monsters);
        if (foes.length) setResult(forecast(partyOf(roster, classes), foes, 300));
      })
      .catch(() => undefined);
    return () => {
      alive = false;
    };
  }, [campaignId, save.id, save.updated_at]);

  if (!result) return null;
  return (
    <>
      <Tooltip title={`${result.verdict} Click for details.`} arrow>
        <Chip
          size="small"
          icon={<Insights sx={{ fontSize: 16 }} />}
          label={`${pct(result.winPct)} win`}
          color={winColor(result.winPct)}
          variant="outlined"
          onClick={() => setOpen(true)}
        />
      </Tooltip>
      <ForecastDialog open={open} onClose={() => setOpen(false)} campaignId={campaignId} saves={[save]} />
    </>
  );
};

// ---- The dialog -----------------------------------------------------------

const Stat: FC<{ label: string; value: string; color?: string }> = ({ label, value, color }) => (
  <Box sx={{ flex: 1, minWidth: 110 }}>
    <Typography variant="overline" color="text.secondary" sx={{ lineHeight: 1.5 }}>
      {label}
    </Typography>
    <Typography variant="h4" sx={{ fontFamily: '"JetBrains Mono", monospace', color }}>
      {value}
    </Typography>
  </Box>
);

const ForecastDialog: FC<{ open: boolean; onClose: () => void; campaignId: string; saves: EncounterSave[] }> = ({
  open,
  onClose,
  campaignId,
  saves,
}) => {
  const [inputs, setInputs] = useState<Inputs | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [absent, setAbsent] = useState<Set<string>>(new Set());
  const [shortRests, setShortRests] = useState(false);
  const [seed, setSeed] = useState(0);
  const isDay = saves.length > 1;

  useEffect(() => {
    if (!open) return;
    setError(null);
    loadInputs(campaignId)
      .then(setInputs)
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, [open, campaignId]);

  const party = useMemo(
    () => (inputs ? partyOf(inputs.roster.filter((r) => !absent.has(r.character.id)), inputs.classes) : []),
    [inputs, absent],
  );

  const single = useMemo<Forecast | null>(() => {
    if (!open || !inputs || isDay || !party.length) return null;
    const foes = monstersOf(saves[0], inputs.monsters);
    return foes.length ? forecast(party, foes) : null;
  }, [open, inputs, party, saves, isDay, seed]);

  const day = useMemo<{ steps: DayStep[]; alone: Forecast[] } | null>(() => {
    if (!open || !inputs || !isDay || !party.length) return null;
    const fights = saves.map((s) => ({ name: s.name, monsters: monstersOf(s, inputs.monsters) }));
    return {
      steps: forecastDay(party, fights, shortRests),
      alone: fights.map((f) => forecast(party, f.monsters, 200)),
    };
  }, [open, inputs, party, saves, isDay, shortRests, seed]);

  const toggle = (id: string) =>
    setAbsent((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>
        <Stack direction="row" spacing={1} alignItems="center">
          <Insights color="primary" />
          <span>{isDay ? 'Adventuring day forecast' : `Forecast: ${saves[0]?.name ?? ''}`}</span>
        </Stack>
      </DialogTitle>
      <DialogContent>
        {error && <Alert severity="error">{error}</Alert>}
        {!inputs && !error && <LinearProgress />}
        {inputs && inputs.roster.length === 0 && (
          <Alert severity="info">Add characters to this campaign (Players tab) to forecast its fights.</Alert>
        )}
        {inputs && inputs.roster.length > 0 && (
          <Stack spacing={2}>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap alignItems="center">
              <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
                Party:
              </Typography>
              {inputs.roster.map((r) => (
                <Chip
                  key={r.character.id}
                  size="small"
                  label={`${r.character.name} · L${rosterLevel(r)} · ${rosterHp(r)} HP · AC ${rosterAc(r)}`}
                  color={absent.has(r.character.id) ? 'default' : 'primary'}
                  variant={absent.has(r.character.id) ? 'outlined' : 'filled'}
                  onClick={() => toggle(r.character.id)}
                />
              ))}
            </Stack>

            {single && (
              <>
                <Alert severity={winColor(single.winPct)} icon={false}>
                  <Typography variant="body1" sx={{ fontWeight: 600 }}>
                    {single.verdict}
                  </Typography>
                </Alert>
                <Stack direction="row" flexWrap="wrap" useFlexGap spacing={2}>
                  <Stat label="Win chance" value={pct(single.winPct)} />
                  <Stat label="Typical length" value={single.rounds ? `${single.rounds} rds` : '—'} />
                  <Stat label="Someone drops" value={pct(single.anyDropPct)} />
                  <Stat label="Party HP left" value={single.winPct ? pct(single.partyHpLeftPct) : '—'} />
                </Stack>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Character</TableCell>
                      <TableCell align="right">Goes down</TableCell>
                      <TableCell align="right">Dies</TableCell>
                      <TableCell align="right">HP left</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {single.pcs.map((p) => (
                      <TableRow key={p.name}>
                        <TableCell>{p.name}</TableCell>
                        <TableCell align="right" sx={{ color: p.dropPct >= 50 ? 'error.main' : undefined }}>
                          {pct(p.dropPct)}
                        </TableCell>
                        <TableCell align="right" sx={{ color: p.deathPct >= 10 ? 'error.main' : undefined }}>
                          {pct(p.deathPct)}
                        </TableCell>
                        <TableCell align="right">{pct(p.hpLeftPct)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </>
            )}

            {day && (
              <>
                <FormControlLabel
                  control={<Switch checked={shortRests} onChange={(e) => setShortRests(e.target.checked)} />}
                  label="Short rest between fights"
                />
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Fight</TableCell>
                      <TableCell align="right">On its own</TableCell>
                      <TableCell align="right">Party HP going in</TableCell>
                      <TableCell align="right">Win, in sequence</TableCell>
                      <TableCell align="right">Someone drops</TableCell>
                      <TableCell align="right">Someone dies</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {day.steps.map((s, i) => {
                      const breaks = s.winPct < 60 || s.anyDeathPct >= 20;
                      return (
                        <TableRow key={`${s.name}-${i}`} sx={{ bgcolor: breaks ? 'action.hover' : undefined }}>
                          <TableCell>
                            {i + 1}. {s.name}
                            {breaks && (
                              <Chip size="small" color="error" variant="outlined" label="breaking point" sx={{ ml: 1 }} />
                            )}
                          </TableCell>
                          <TableCell align="right">{pct(day.alone[i].winPct)}</TableCell>
                          <TableCell align="right">
                            <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
                              <LinearProgress
                                variant="determinate"
                                value={s.enterHpPct}
                                color={s.enterHpPct >= 60 ? 'success' : s.enterHpPct >= 35 ? 'warning' : 'error'}
                                sx={{ width: 60 }}
                              />
                              <span>{pct(s.enterHpPct)}</span>
                            </Stack>
                          </TableCell>
                          <TableCell align="right" sx={{ color: `${winColor(s.winPct)}.main`, fontWeight: 600 }}>
                            {pct(s.winPct)}
                          </TableCell>
                          <TableCell align="right">{pct(s.anyDropPct)}</TableCell>
                          <TableCell align="right">{pct(s.anyDeathPct)}</TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                <Typography variant="body2" color="text.secondary">
                  {(() => {
                    const last = day.steps[day.steps.length - 1];
                    const through = (last.reachPct * last.winPct) / 100;
                    return `The party gets through all ${day.steps.length} fights in ${pct(through)} of runs.`;
                  })()}
                </Typography>
              </>
            )}

            <Typography variant="caption" color="text.secondary">
              An estimate from a few hundred simulated fights. Monsters use their stat-block attacks and recharge
              abilities; characters&apos; damage is estimated from level and class. Spells, terrain, tactics and luck at the
              table aren&apos;t modelled. Tap a character to leave them out.
            </Typography>
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        {inputs && inputs.roster.length > 0 && (
          <Button startIcon={<Refresh />} onClick={() => setSeed((n) => n + 1)}>
            Run again
          </Button>
        )}
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default ForecastDialog;
