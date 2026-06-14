/**
 * EncounterTracker - real initiative tracker.
 *
 * - Vertical list of combatants sorted by initiative descending
 * - Current turn is highlighted; "Next turn" arrow advances through
 *   the list, wrapping at the end and decrementing round counter
 * - Per-row HP with quick +/- buttons
 * - Status badges per combatant
 * - Add monsters via the SelectMonster picker
 */

import React, { FC, useCallback, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Divider,
  IconButton,
  Menu,
  MenuItem,
  Paper,
  Stack,
  Tooltip,
  Typography,
  alpha,
  useTheme,
  Slider,
} from '@mui/material';
import {
  Add,
  AddCircle,
  ArrowForward,
  Delete,
  Favorite,
  Healing,
  Info,
  People,
  PersonAdd,
  PinDrop,
  RemoveCircle,
  Shield,
  Speed,
} from '@mui/icons-material';
import { Monster } from '../types/Monster';
import { Character } from '../types/Character';
import MonsterStatBlock from '../shared/MonsterStatBlock';
import { useMonsterStatPane } from '../shared/MonsterStatPane';
import SelectMonster from './select-monster';
import useTrackEncounter, { RemainingMonster } from './use-track-encounter';
import useMonsters from './use-monsters';


const CONDITION_LIST = [
  'Blinded',
  'Charmed',
  'Deafened',
  'Frightened',
  'Grappled',
  'Incapacitated',
  'Invisible',
  'Paralyzed',
  'Petrified',
  'Poisoned',
  'Prone',
  'Restrained',
  'Stunned',
  'Unconscious',
];

const EncounterTracker: FC<{ monstersInCombat: Monster[]; party?: Character[] }> = ({
  monstersInCombat,
  party,
}) => {
  const theme = useTheme();
  const { monsters } = useMonsters();
  const statPane = useMonsterStatPane();
  const tracker = useTrackEncounter(monstersInCombat, party);
  const {
    remainingMonsters,
    onAddMonsters,
    onDeleteMonster,
    onUpdateHealth,
    onToggleCondition,
    addPCs,
    removePCs,
    pcsAdded,
    currentIndex,
    nextTurn,
    reset,
    round,
  } = tracker;

  const identifiedMonster: Monster | null = useMemo(() => {
    if (!monsters || remainingMonsters.length === 0) return null;
    const current = remainingMonsters[currentIndex];
    if (!current) return null;
    return monsters.find((m) => m.name === current.name) ?? null;
  }, [monsters, remainingMonsters, currentIndex]);

  // Phase 9: clicking a row's name pops up the global stat pane so
  // the DM can read monster lore / stats to the players without
  // leaving the tracker.
  const onRowClick = (m: RemainingMonster) => {
    if (!monsters) return;
    const found = monsters.find((mm) => mm.name === m.name);
    if (found) statPane.open(found);
  };

  const [statusAnchor, setStatusAnchor] = useState<{
    uuid: string;
    el: HTMLElement;
  } | null>(null);

  const onAddStatus = (uuid: string, condition: string) => {
    onToggleCondition(uuid, condition);
    setStatusAnchor(null);
  };

  return (
    <Box>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h3">Combat Tracker</Typography>
          <Typography variant="caption" color="text.secondary">
            Round {round} · {remainingMonsters.length} combatant
            {remainingMonsters.length === 1 ? '' : 's'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1}>
          {party && party.length > 0 && !pcsAdded && (
            <Tooltip title="Add the active party to initiative" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<PersonAdd />}
                onClick={addPCs}
                disabled={remainingMonsters.length === 0}
              >
                Add party ({party.length})
              </Button>
            </Tooltip>
          )}
          {pcsAdded && (
            <Tooltip title="Remove PCs from initiative" arrow>
              <Button
                size="small"
                variant="outlined"
                startIcon={<People />}
                onClick={removePCs}
              >
                Remove party
              </Button>
            </Tooltip>
          )}
          <SelectMonster onSelectMonster={onAddMonsters} />
          <Tooltip title="Start a fresh encounter" arrow>
            <span>
              <Button
                size="small"
                variant="outlined"
                onClick={reset}
                disabled={remainingMonsters.length === 0}
              >
                Reset
              </Button>
            </span>
          </Tooltip>
          <Button
            variant="contained"
            startIcon={<ArrowForward />}
            onClick={nextTurn}
            disabled={remainingMonsters.length === 0}
          >
            Next turn
          </Button>
        </Stack>
      </Stack>

      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: 'flex-start' }}
      >
        {/* Initiative list */}
        <Paper sx={{ flex: { xs: '1 1 auto', md: '0 0 360px' }, overflow: 'hidden' }}>
          {remainingMonsters.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No combatants
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Generate an encounter or add monsters manually to begin.
              </Typography>
            </Box>
          ) : (
            <Stack divider={<Divider />}>
              {remainingMonsters.map((m, i) => (
                <InitiativeRow
                  key={m.uuid}
                  monster={m}
                  isCurrent={i === currentIndex}
                  onRowClick={() => onRowClick(m)}
                  onUpdateHealth={(hp) => onUpdateHealth(m.uuid, hp)}
                  onDelete={() => onDeleteMonster(m)}
                  onStatusClick={(el) =>
                    setStatusAnchor({ uuid: m.uuid, el })
                  }
                />
              ))}
            </Stack>
          )}
        </Paper>

        {/* Detail panel */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
          {identifiedMonster ? (
            <MonsterStatBlock monster={identifiedMonster} />
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                Select a combatant
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Click a name in the initiative list to see its stat block.
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>

      <Menu
        open={Boolean(statusAnchor)}
        anchorEl={statusAnchor?.el ?? null}
        onClose={() => setStatusAnchor(null)}
      >
        {CONDITION_LIST.map((c) => (
          <MenuItem key={c} onClick={() => statusAnchor && onAddStatus(statusAnchor.uuid, c)}>
            {c}
          </MenuItem>
        ))}
      </Menu>

      {/* Floating quick-reference panel pinned to bottom-right */}
      {remainingMonsters.length > 0 && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 12, md: 24 },
            right: { xs: 12, md: 24 },
            zIndex: (t) => t.zIndex.drawer - 1,
            px: 1.5,
            py: 1,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            backgroundColor: 'background.paper',
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: 999,
          }}
        >
          <Tooltip title="Current turn" arrow>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <PinDrop fontSize="small" sx={{ color: 'primary.main' }} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {remainingMonsters[currentIndex]?.name ?? '—'}
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title="Armor Class" arrow>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Shield fontSize="small" sx={{ color: 'secondary.main' }} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {remainingMonsters[currentIndex]?.ac ?? '—'}
              </Typography>
            </Stack>
          </Tooltip>
          <Tooltip title="Hit points" arrow>
            <Stack direction="row" spacing={0.5} alignItems="center">
              <Favorite fontSize="small" sx={{ color: 'error.main' }} />
              <Typography
                variant="body2"
                sx={{ fontFamily: '"JetBrains Mono", monospace' }}
              >
                {remainingMonsters[currentIndex]?.hp ?? 0}/
                {remainingMonsters[currentIndex]?.maxHP.split(' ')[0] ?? 0}
              </Typography>
            </Stack>
          </Tooltip>
          <Box
            sx={{
              width: 1,
              height: 18,
              backgroundColor: 'divider',
            }}
          />
          <Tooltip title="Round" arrow>
            <Typography
              variant="body2"
              sx={{ fontFamily: '"JetBrains Mono", monospace', color: 'text.secondary' }}
            >
              R{round}
            </Typography>
          </Tooltip>
          <Tooltip title="Next turn" arrow>
            <span>
              <IconButton
                size="small"
                onClick={nextTurn}
                disabled={remainingMonsters.length === 0}
                color="primary"
              >
                <ArrowForward fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Paper>
      )}
    </Box>
  );
};

const InitiativeRow: FC<{
  monster: RemainingMonster;
  isCurrent: boolean;
  onRowClick: () => void;
  onUpdateHealth: (hp: number) => void;
  onDelete: () => void;
  onStatusClick: (el: HTMLElement) => void;
}> = ({ monster, isCurrent, onRowClick, onUpdateHealth, onDelete, onStatusClick }) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<string>(String(monster.hp ?? ''));

  useEffect(() => {
    setDraft(String(monster.hp ?? ''));
  }, [monster.hp]);

  const max = parseInt(monster.maxHP.split(' ')[0], 10) || 0;
  const hp = monster.hp ?? 0;
  const hpPct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const bloodied = max > 0 && hp <= max / 2;
  const down = max > 0 && hp <= 0;
  const accent = monster.isPC ? theme.palette.secondary.main : theme.palette.primary.main;

  return (
    <Box
      sx={{
        p: 1.5,
        backgroundColor: isCurrent
          ? alpha(accent, 0.16)
          : monster.isPC
          ? alpha(theme.palette.secondary.main, 0.04)
          : 'transparent',
        borderLeft: `4px solid ${
          isCurrent ? accent : 'transparent'
        }`,
        transition: 'background-color 150ms ease',
        '&:hover': {
          backgroundColor: isCurrent
            ? alpha(accent, 0.2)
            : alpha(accent, 0.04),
        },
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1}>
        <Box
          sx={{
            width: 36,
            height: 36,
            borderRadius: 1,
            backgroundColor: alpha(accent, 0.16),
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <Typography
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              fontWeight: 700,
              fontSize: '0.95rem',
              color: isCurrent ? accent : 'text.primary',
            }}
          >
            {monster.initiative}
          </Typography>
        </Box>
        <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="body1"
              fontWeight={isCurrent ? 600 : 500}
              noWrap
              onClick={onRowClick}
              sx={{
                color: down ? 'error.main' : 'text.primary',
                cursor: 'pointer',
                '&:hover': { textDecoration: 'underline' },
              }}
            >
              {monster.name}
            </Typography>
            <Tooltip title="Stat block" arrow>
              <IconButton size="small" onClick={onRowClick} sx={{ p: 0.25 }}>
                <Info sx={{ fontSize: 14, opacity: 0.6 }} />
              </IconButton>
            </Tooltip>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
            >
              AC {monster.ac}
            </Typography>
            {monster.conditions.length > 0 &&
              monster.conditions.map((c) => (
                <Chip
                  key={c}
                  label={c}
                  size="small"
                  color="warning"
                  sx={{ height: 18, fontSize: '0.65rem' }}
                />
              ))}
          </Stack>
        </Stack>
        <Stack direction="row" spacing={0.5} alignItems="center">
          <Tooltip title="Damage / heal" arrow>
            <IconButton
              size="small"
              onClick={() => setEditing((s) => !s)}
              color={down ? 'error' : bloodied ? 'warning' : 'default'}
            >
              <Favorite fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Add condition" arrow>
            <IconButton size="small" onClick={(e) => onStatusClick(e.currentTarget)}>
              <AddCircle fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Remove" arrow>
            <IconButton size="small" onClick={onDelete}>
              <Delete fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      </Stack>

      {/* HP bar */}
      <Box sx={{ mt: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <Box sx={{ flexGrow: 1, position: 'relative' }}>
            <Box
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.error.main, 0.15),
                overflow: 'hidden',
              }}
            >
              <Box
                sx={{
                  width: `${hpPct}%`,
                  height: '100%',
                  backgroundColor: down
                    ? theme.palette.error.main
                    : bloodied
                    ? theme.palette.warning.main
                    : theme.palette.success.main,
                  transition: 'width 200ms ease',
                }}
              />
            </Box>
          </Box>
          <Typography
            variant="caption"
            sx={{
              fontFamily: '"JetBrains Mono", monospace',
              color: 'text.secondary',
              minWidth: 56,
              textAlign: 'right',
            }}
          >
            {hp} / {max}
          </Typography>
        </Stack>
        {editing && (
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 1 }}>
            <IconButton
              size="small"
              onClick={() => onUpdateHealth(Math.max(0, hp - 1))}
            >
              <RemoveCircle fontSize="small" color="error" />
            </IconButton>
            <Box sx={{ flexGrow: 1 }}>
              <Slider
                size="small"
                value={hp}
                min={0}
                max={max}
                onChange={(_e, v) => onUpdateHealth(v as number)}
                aria-label="HP"
              />
            </Box>
            <IconButton
              size="small"
              onClick={() => onUpdateHealth(Math.min(max, hp + 1))}
            >
              <AddCircle fontSize="small" color="success" />
            </IconButton>
          </Stack>
        )}
      </Box>
    </Box>
  );
};

export default EncounterTracker;
