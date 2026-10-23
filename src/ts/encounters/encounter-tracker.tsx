/**
 * EncounterTracker - real initiative tracker.
 *
 * - Vertical list of combatants sorted by initiative descending
 * - Current turn is highlighted; "Next turn" (or the N key) advances
 *   through the list, wrapping at the end and bumping the round
 * - Tick several combatants (or "All monsters" / "All PCs") to apply
 *   damage, healing, a condition, or remove them in one go — e.g.
 *   everyone caught in a fireball
 * - Per-row typed damage / heal
 * - Add monsters via the multi-select SelectMonster picker
 */

import React, { FC, ReactNode, useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  IconButton,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AddCircle,
  ArrowForward,
  Casino,
  Close,
  Delete,
  Favorite,
  Info,
  MoreVert,
  People,
  PersonAdd,
  PinDrop,
  Shield,
  StopCircle,
} from '@mui/icons-material';
import { Monster } from '../types/Monster';
import { Character } from '../types/Character';
import MonsterStatBlock from '../shared/MonsterStatBlock';
import { useMonsterStatPane } from '../shared/MonsterStatPane';
import { useConfirm } from '../shared/useConfirm';
import SelectMonster from './select-monster';
import useTrackEncounter, { maxHpOf, RemainingMonster } from './use-track-encounter';
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

const mono = { fontFamily: '"JetBrains Mono", monospace' };

const EncounterTracker: FC<{
  monstersInCombat: Monster[];
  party?: Character[];
  title?: ReactNode;
  active?: boolean;
  autoAddParty?: boolean;
  groupInitiative?: boolean;
  confirmDestructive?: boolean;
  onEnd?: () => void;
}> = ({
  monstersInCombat,
  party,
  title,
  active = true,
  autoAddParty,
  groupInitiative,
  confirmDestructive = true,
  onEnd,
}) => {
  const { monsters } = useMonsters();
  const statPane = useMonsterStatPane();
  const { confirm, dialog } = useConfirm();
  const tracker = useTrackEncounter(monstersInCombat, party, { autoAddParty, groupInitiative });
  const {
    remainingMonsters,
    onAddMonsters,
    removeMany,
    applyHpDelta,
    addCondition,
    removeCondition,
    addPCs,
    removePCs,
    pcsAdded,
    currentIndex,
    nextTurn,
    reset,
    round,
  } = tracker;

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [amount, setAmount] = useState('');
  const [bulkConditionAnchor, setBulkConditionAnchor] = useState<HTMLElement | null>(null);
  const [rowConditionAnchor, setRowConditionAnchor] = useState<{ uuid: string; el: HTMLElement } | null>(null);
  const [moreAnchor, setMoreAnchor] = useState<HTMLElement | null>(null);

  // Drop selections for combatants that no longer exist.
  useEffect(() => {
    setSelected((prev) => {
      const alive = new Set(remainingMonsters.map((m) => m.uuid));
      const next = new Set(Array.from(prev).filter((id) => alive.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [remainingMonsters]);

  // N advances the turn while the tracker is on screen.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement;
      if (t.closest('input, textarea, [contenteditable="true"], [role="dialog"]')) return;
      if (e.key.toLowerCase() === 'n' && !e.ctrlKey && !e.metaKey && !e.altKey) {
        e.preventDefault();
        nextTurn();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [active, nextTurn]);

  const current = remainingMonsters[currentIndex];
  const identifiedMonster: Monster | null = useMemo(() => {
    if (!monsters || !current || current.isPC) return null;
    return monsters.find((m) => m.name === current.name) ?? null;
  }, [monsters, current]);

  const openStatBlock = (m: RemainingMonster) => {
    const found = monsters?.find((mm) => mm.name === m.name);
    if (found) statPane.open(found);
  };

  const ids = Array.from(selected);
  const count = remainingMonsters.length;
  const allSelected = count > 0 && selected.size === count;
  const select = (pred: (m: RemainingMonster) => boolean) =>
    setSelected(new Set(remainingMonsters.filter(pred).map((m) => m.uuid)));
  const toggle = (uuid: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(uuid)) next.delete(uuid);
      else next.add(uuid);
      return next;
    });

  const applyBulk = (sign: 1 | -1) => {
    const n = parseInt(amount, 10);
    if (!n || ids.length === 0) return;
    applyHpDelta(ids, sign * Math.abs(n));
    setAmount('');
  };

  const onReset = async () => {
    setMoreAnchor(null);
    if (
      confirmDestructive &&
      !(await confirm({
        title: 'Re-roll initiative?',
        body: 'Everyone gets a fresh initiative roll, full HP and no conditions. The round counter goes back to 1.',
        confirmLabel: 'Re-roll',
        destructive: true,
      }))
    )
      return;
    reset();
  };

  const onEndClick = async () => {
    setMoreAnchor(null);
    if (
      confirmDestructive &&
      !(await confirm({
        title: 'End this encounter?',
        body: 'The tracker is cleared. Save it to the library first from the Build tab if you want to run it again.',
        confirmLabel: 'End encounter',
        destructive: true,
      }))
    )
      return;
    onEnd?.();
  };

  return (
    <Box>
      {dialog}
      {/* Header: what's running + the one primary action */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25} sx={{ minWidth: 0 }}>
          {title}
          <Typography variant="caption" color="text.secondary">
            Round {round} · {count} combatant{count === 1 ? '' : 's'}
            {count > 0 && ' · press N for next turn'}
          </Typography>
        </Stack>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <SelectMonster onSelectMonster={onAddMonsters} />
          {party && party.length > 0 && !pcsAdded && (
            <Button size="small" startIcon={<PersonAdd />} onClick={addPCs}>
              Add party ({party.length})
            </Button>
          )}
          {pcsAdded && (
            <Button size="small" color="inherit" startIcon={<People />} onClick={removePCs}>
              Remove party
            </Button>
          )}
          <IconButton size="small" aria-label="more actions" onClick={(e) => setMoreAnchor(e.currentTarget)}>
            <MoreVert />
          </IconButton>
          <Button
            variant="contained"
            size="large"
            endIcon={<ArrowForward />}
            onClick={nextTurn}
            disabled={count === 0}
          >
            Next turn
          </Button>
        </Stack>
      </Stack>

      <Menu open={Boolean(moreAnchor)} anchorEl={moreAnchor} onClose={() => setMoreAnchor(null)}>
        <MenuItem onClick={onReset} disabled={count === 0}>
          <ListItemIcon>
            <Casino fontSize="small" />
          </ListItemIcon>
          <ListItemText primary="Re-roll initiative" secondary="Resets HP, conditions and round" />
        </MenuItem>
        {onEnd && (
          <MenuItem onClick={onEndClick}>
            <ListItemIcon>
              <StopCircle fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText primary="End encounter" />
          </MenuItem>
        )}
      </Menu>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ alignItems: 'flex-start' }}>
        {/* Initiative list */}
        <Paper sx={{ flex: { xs: '1 1 auto', md: '0 0 420px' }, width: '100%', overflow: 'hidden' }}>
          {count === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No combatants
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Add monsters above, or build an encounter first.
              </Typography>
            </Box>
          ) : (
            <>
              <SelectionBar
                selectedCount={selected.size}
                allSelected={allSelected}
                amount={amount}
                onAmount={setAmount}
                onToggleAll={() => (allSelected ? setSelected(new Set()) : select(() => true))}
                onSelectMonsters={() => select((m) => !m.isPC)}
                onSelectPCs={pcsAdded ? () => select((m) => m.isPC) : undefined}
                onDamage={() => applyBulk(-1)}
                onHeal={() => applyBulk(1)}
                onCondition={(el) => setBulkConditionAnchor(el)}
                onRemove={() => removeMany(ids)}
                onClear={() => setSelected(new Set())}
              />
              <Divider />
              <Stack divider={<Divider />}>
                {remainingMonsters.map((m, i) => (
                  <InitiativeRow
                    key={m.uuid}
                    monster={m}
                    isCurrent={i === currentIndex}
                    checked={selected.has(m.uuid)}
                    onCheck={() => toggle(m.uuid)}
                    onOpenStatBlock={m.isPC ? undefined : () => openStatBlock(m)}
                    onHpDelta={(d) => applyHpDelta([m.uuid], d)}
                    onDelete={() => removeMany([m.uuid])}
                    onAddCondition={(el) => setRowConditionAnchor({ uuid: m.uuid, el })}
                    onRemoveCondition={(c) => removeCondition(m.uuid, c)}
                  />
                ))}
              </Stack>
            </>
          )}
        </Paper>

        {/* Current turn's stat block */}
        <Box sx={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
          {identifiedMonster ? (
            <MonsterStatBlock monster={identifiedMonster} />
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="h6" color="text.secondary">
                {current?.isPC ? `${current.name}'s turn` : 'Stat block'}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {current?.isPC
                  ? 'Player character — the stat block shows on monster turns.'
                  : "The current monster's stat block shows here."}
              </Typography>
            </Paper>
          )}
        </Box>
      </Stack>

      <ConditionMenu
        anchor={bulkConditionAnchor}
        onClose={() => setBulkConditionAnchor(null)}
        onPick={(c) => addCondition(ids, c)}
      />
      <ConditionMenu
        anchor={rowConditionAnchor?.el ?? null}
        onClose={() => setRowConditionAnchor(null)}
        onPick={(c) => rowConditionAnchor && addCondition([rowConditionAnchor.uuid], c)}
      />

      {/* Floating quick-reference panel pinned to bottom-right */}
      {count > 0 && current && (
        <Paper
          elevation={6}
          sx={{
            position: 'fixed',
            bottom: { xs: 12, md: 24 },
            right: { xs: 12, md: 24 },
            zIndex: (t) => t.zIndex.drawer - 1,
            pl: 1.5,
            pr: 0.5,
            py: 0.5,
            display: 'flex',
            alignItems: 'center',
            gap: 1.5,
            border: (t) => `1px solid ${t.palette.divider}`,
            borderRadius: 999,
          }}
        >
          <Stack direction="row" spacing={0.5} alignItems="center">
            <PinDrop fontSize="small" sx={{ color: 'primary.main' }} />
            <Typography variant="body2" sx={mono}>
              {current.name}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Shield fontSize="small" sx={{ color: 'secondary.main' }} />
            <Typography variant="body2" sx={mono}>
              {current.ac}
            </Typography>
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center">
            <Favorite fontSize="small" sx={{ color: 'error.main' }} />
            <Typography variant="body2" sx={mono}>
              {current.hp ?? 0}/{maxHpOf(current)}
            </Typography>
          </Stack>
          <Typography variant="body2" sx={{ ...mono, color: 'text.secondary' }}>
            R{round}
          </Typography>
          <Button size="small" variant="contained" endIcon={<ArrowForward />} onClick={nextTurn} sx={{ borderRadius: 999 }}>
            Next
          </Button>
        </Paper>
      )}
    </Box>
  );
};

const ConditionMenu: FC<{
  anchor: HTMLElement | null;
  onClose: () => void;
  onPick: (c: string) => void;
}> = ({ anchor, onClose, onPick }) => (
  <Menu open={Boolean(anchor)} anchorEl={anchor} onClose={onClose}>
    {CONDITION_LIST.map((c) => (
      <MenuItem
        key={c}
        dense
        onClick={() => {
          onPick(c);
          onClose();
        }}
      >
        {c}
      </MenuItem>
    ))}
  </Menu>
);

const SelectionBar: FC<{
  selectedCount: number;
  allSelected: boolean;
  amount: string;
  onAmount: (s: string) => void;
  onToggleAll: () => void;
  onSelectMonsters: () => void;
  onSelectPCs?: () => void;
  onDamage: () => void;
  onHeal: () => void;
  onCondition: (el: HTMLElement) => void;
  onRemove: () => void;
  onClear: () => void;
}> = (p) => {
  const theme = useTheme();
  const any = p.selectedCount > 0;
  return (
    <Box sx={{ px: 1, py: 0.75, backgroundColor: any ? alpha(theme.palette.primary.main, 0.08) : 'transparent' }}>
      <Stack direction="row" alignItems="center" spacing={0.5} flexWrap="wrap" useFlexGap>
        <Tooltip title={p.allSelected ? 'Deselect all' : 'Select all'} arrow>
          <Checkbox
            size="small"
            checked={p.allSelected}
            indeterminate={any && !p.allSelected}
            onChange={p.onToggleAll}
          />
        </Tooltip>
        {!any ? (
          <>
            <Typography variant="caption" color="text.secondary" sx={{ mr: 0.5 }}>
              Select:
            </Typography>
            <Chip size="small" label="All monsters" onClick={p.onSelectMonsters} />
            {p.onSelectPCs && <Chip size="small" label="All PCs" onClick={p.onSelectPCs} />}
          </>
        ) : (
          <>
            <Typography variant="body2" fontWeight={600} sx={{ mr: 0.5 }}>
              {p.selectedCount} selected
            </Typography>
            <TextField
              size="small"
              type="number"
              placeholder="HP"
              value={p.amount}
              onChange={(e) => p.onAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && p.onDamage()}
              inputProps={{ min: 0, 'aria-label': 'amount' }}
              sx={{ width: 72, '& input': { py: 0.5 } }}
            />
            <Button size="small" variant="contained" color="error" onClick={p.onDamage} disabled={!p.amount}>
              Damage
            </Button>
            <Button size="small" variant="outlined" color="success" onClick={p.onHeal} disabled={!p.amount}>
              Heal
            </Button>
            <Tooltip title="Add condition" arrow>
              <IconButton size="small" onClick={(e) => p.onCondition(e.currentTarget)}>
                <AddCircle fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Remove from combat" arrow>
              <IconButton size="small" onClick={p.onRemove}>
                <Delete fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear selection" arrow>
              <IconButton size="small" onClick={p.onClear} sx={{ ml: 'auto' }}>
                <Close fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>
    </Box>
  );
};

const InitiativeRow: FC<{
  monster: RemainingMonster;
  isCurrent: boolean;
  checked: boolean;
  onCheck: () => void;
  onOpenStatBlock?: () => void;
  onHpDelta: (delta: number) => void;
  onDelete: () => void;
  onAddCondition: (el: HTMLElement) => void;
  onRemoveCondition: (c: string) => void;
}> = ({
  monster,
  isCurrent,
  checked,
  onCheck,
  onOpenStatBlock,
  onHpDelta,
  onDelete,
  onAddCondition,
  onRemoveCondition,
}) => {
  const theme = useTheme();
  const [editing, setEditing] = useState(false);
  const [amount, setAmount] = useState('');

  const max = maxHpOf(monster);
  const hp = monster.hp ?? 0;
  const hpPct = max > 0 ? Math.max(0, Math.min(100, (hp / max) * 100)) : 0;
  const bloodied = max > 0 && hp <= max / 2;
  const down = max > 0 && hp <= 0;
  const accent = monster.isPC ? theme.palette.secondary.main : theme.palette.primary.main;

  const apply = (sign: 1 | -1) => {
    const n = parseInt(amount, 10);
    if (!n) return;
    onHpDelta(sign * Math.abs(n));
    setAmount('');
  };

  return (
    <Box
      sx={{
        py: 1,
        pl: 0.5,
        pr: 1,
        backgroundColor: isCurrent
          ? alpha(accent, 0.16)
          : checked
          ? alpha(theme.palette.primary.main, 0.06)
          : monster.isPC
          ? alpha(theme.palette.secondary.main, 0.04)
          : 'transparent',
        borderLeft: `4px solid ${isCurrent ? accent : 'transparent'}`,
        transition: 'background-color 150ms ease',
      }}
    >
      <Stack direction="row" alignItems="center" spacing={0.5}>
        <Checkbox size="small" checked={checked} onChange={onCheck} inputProps={{ 'aria-label': `select ${monster.name}` }} />
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
          <Typography sx={{ ...mono, fontWeight: 700, fontSize: '0.95rem', color: isCurrent ? accent : 'text.primary' }}>
            {monster.initiative}
          </Typography>
        </Box>
        <Stack spacing={0.25} sx={{ flexGrow: 1, minWidth: 0, pl: 0.5 }}>
          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Typography
              variant="body1"
              fontWeight={isCurrent ? 600 : 500}
              noWrap
              onClick={onCheck}
              sx={{ color: down ? 'error.main' : 'text.primary', cursor: 'pointer' }}
            >
              {monster.name}
            </Typography>
            {monster.isPC && <Chip label="PC" size="small" color="secondary" sx={{ height: 16, fontSize: '0.6rem' }} />}
            {onOpenStatBlock && (
              <Tooltip title="Stat block" arrow>
                <IconButton size="small" onClick={onOpenStatBlock} sx={{ p: 0.25 }}>
                  <Info sx={{ fontSize: 14, opacity: 0.6 }} />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
          <Stack direction="row" spacing={0.5} alignItems="center" flexWrap="wrap" useFlexGap>
            <Typography variant="caption" color="text.secondary" sx={mono}>
              AC {monster.ac}
            </Typography>
            {monster.conditions.map((c) => (
              <Chip
                key={c}
                label={c}
                size="small"
                color="warning"
                onDelete={() => onRemoveCondition(c)}
                sx={{ height: 18, fontSize: '0.65rem', '& .MuiChip-deleteIcon': { fontSize: 12 } }}
              />
            ))}
          </Stack>
        </Stack>
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
          <IconButton size="small" onClick={(e) => onAddCondition(e.currentTarget)}>
            <AddCircle fontSize="small" />
          </IconButton>
        </Tooltip>
        <Tooltip title="Remove" arrow>
          <IconButton size="small" onClick={onDelete}>
            <Delete fontSize="small" />
          </IconButton>
        </Tooltip>
      </Stack>

      {/* HP bar */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5, pl: 5 }}>
        <Box
          sx={{
            flexGrow: 1,
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
        <Typography variant="caption" sx={{ ...mono, color: 'text.secondary', minWidth: 56, textAlign: 'right' }}>
          {hp} / {max}
        </Typography>
      </Stack>
      {editing && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 1, pl: 5 }}>
          <TextField
            size="small"
            type="number"
            autoFocus
            placeholder="HP"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') apply(-1);
              if (e.key === 'Escape') setEditing(false);
            }}
            inputProps={{ min: 0, 'aria-label': 'amount' }}
            sx={{ width: 80, '& input': { py: 0.5 } }}
          />
          <Button size="small" variant="contained" color="error" onClick={() => apply(-1)} disabled={!amount}>
            Damage
          </Button>
          <Button size="small" variant="outlined" color="success" onClick={() => apply(1)} disabled={!amount}>
            Heal
          </Button>
          <Typography variant="caption" color="text.secondary">
            Enter = damage
          </Typography>
        </Stack>
      )}
    </Box>
  );
};

export default EncounterTracker;
