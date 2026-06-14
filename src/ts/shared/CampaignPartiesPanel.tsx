// Phase 9: parties linked to this campaign. Renders the
// campaign_parties junction as a row of cards, with link/unlink
// controls.

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardActionArea,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  TextField,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  Add,
  Close,
  Group,
  GroupAdd,
  LinkOff,
  People,
} from '@mui/icons-material';
import { Party } from '../types/Party';
import { Character } from '../types/Character';
import { campaignPartiesApi } from '../api/campaign-parties';
import { charactersApi } from '../api/characters';
import { partiesApi } from '../api/parties';
import { useToast } from './ToastProvider';
import PartyComposition from './PartyComposition';

type Props = {
  campaignId: string;
  canEdit: boolean;
};

const CampaignPartiesPanel: FC<Props> = ({ campaignId, canEdit }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const [linked, setLinked] = useState<Party[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [adding, setAdding] = useState(false);
  const [pickParty, setPickParty] = useState<Party | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirmUnlink, setConfirmUnlink] = useState<Party | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const reload = async () => {
    setLoadError(null);
    try {
      const [parties, chars] = await Promise.all([
        campaignPartiesApi.list(campaignId),
        charactersApi.list(),
      ]);
      setLinked(parties);
      setAllCharacters(chars);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  const onLink = async () => {
    if (!pickParty || !pickParty.id) return;
    setSaving(true);
    try {
      await campaignPartiesApi.link(campaignId, pickParty.id);
      toast(`Linked ${pickParty.name}`, 'success');
      setAdding(false);
      setPickParty(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setSaving(false);
    }
  };

  const onUnlink = async () => {
    if (!confirmUnlink || !confirmUnlink.id) return;
    setUnlinking(true);
    try {
      await campaignPartiesApi.unlink(campaignId, confirmUnlink.id);
      toast('Unlinked', 'success');
      setConfirmUnlink(null);
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      setUnlinking(false);
    }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Stack direction="row" spacing={1} alignItems="center">
          <People fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5">Parties in this campaign</Typography>
          {linked.length > 0 && (
            <Chip
              label={`${linked.length} party / ${linked.reduce(
                (acc, p) => acc + (p.member_ids?.length ?? 0),
                0,
              )} characters`}
              size="small"
              variant="outlined"
            />
          )}
        </Stack>
        {canEdit && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<GroupAdd />}
            onClick={() => setAdding(true)}
          >
            Link party
          </Button>
        )}
      </Stack>
      {loadError && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {loadError}
        </Alert>
      )}
      {linked.length === 0 && !loadError ? (
        <Card
          variant="outlined"
          sx={{
            p: 2.5,
            textAlign: 'center',
            backgroundColor: alpha(theme.palette.primary.main, 0.04),
          }}
        >
          <Typography variant="body2" color="text.secondary">
            No parties linked yet. Parties are created on the Characters page
            and can be linked to multiple campaigns.
          </Typography>
        </Card>
      ) : (
        <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
          {linked.map((p) => {
            const members = allCharacters.filter(
              (c) => c.id && p.member_ids?.includes(c.id),
            );
            return (
              <Card key={p.id} variant="outlined" sx={{ width: 320, position: 'relative' }}>
                <CardContent sx={{ pb: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Group fontSize="small" sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                      {p.name}
                    </Typography>
                  </Stack>
                  {p.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {p.description}
                    </Typography>
                  )}
                  <PartyComposition characters={members} />
                </CardContent>
                {canEdit && (
                  <Stack direction="row" justifyContent="flex-end" sx={{ px: 1, pb: 1 }}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => setConfirmUnlink(p)}
                    >
                      <LinkOff fontSize="small" />
                    </IconButton>
                  </Stack>
                )}
              </Card>
            );
          })}
        </Stack>
      )}

      {/* Link dialog — reuses the user's global party list as the option source */}
      <Dialog open={adding} onClose={() => !saving && setAdding(false)} fullWidth maxWidth="xs">
        <DialogTitle>Link a party</DialogTitle>
        <DialogContent>
          <LinkPartyPicker
            onPick={(p) => setPickParty(p)}
            excludeIds={linked.map((p) => p.id).filter(Boolean) as string[]}
            initial={pickParty}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAdding(false)} disabled={saving}>
            Cancel
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={onLink}
            disabled={saving || !pickParty}
          >
            {saving ? 'Linking…' : 'Link'}
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={confirmUnlink !== null}
        onClose={() => !unlinking && setConfirmUnlink(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Unlink party?</DialogTitle>
        <DialogContent>
          <Typography variant="body2">
            Unlink &quot;{confirmUnlink?.name}&quot; from this campaign? The party
            itself is not deleted — it stays in your party list and can be
            linked to other campaigns.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmUnlink(null)} disabled={unlinking}>
            Cancel
          </Button>
          <Button color="error" variant="contained" onClick={onUnlink} disabled={unlinking}>
            {unlinking ? 'Unlinking…' : 'Unlink'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// We re-fetch the global party list from the API in the picker so
// the user can see parties they've created on the Characters page
// without leaving this dialog.
const LinkPartyPicker: FC<{
  onPick: (p: Party | null) => void;
  excludeIds: string[];
  initial: Party | null;
}> = ({ onPick, excludeIds, initial }) => {
  const [all, setAll] = useState<Party[]>([]);
  useEffect(() => {
    partiesApi.list().then(setAll).catch(() => undefined);
  }, []);
  const options = useMemo(
    () => all.filter((p) => p.id && !excludeIds.includes(p.id)),
    [all, excludeIds],
  );
  return (
    <Autocomplete
      options={options}
      getOptionLabel={(o) => o.name}
      value={initial}
      onChange={(_e, v) => onPick(v)}
      renderInput={(p) => (
        <TextField
          {...p}
          autoFocus
          label="Party"
          helperText={
            options.length === 0
              ? 'No unlinked parties — create one on the Characters page'
              : 'Pick from your parties'
          }
        />
      )}
    />
  );
};

export default CampaignPartiesPanel;
