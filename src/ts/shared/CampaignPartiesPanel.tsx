// Phase 9: parties linked to this campaign. Renders the
// campaign_parties junction as a row of cards, with link/unlink
// controls. Several parties can be linked in one go.

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Group, GroupAdd, LinkOff, People } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Party } from '../types/Party';
import { Character } from '../types/Character';
import { campaignPartiesApi } from '../api/campaign-parties';
import { charactersApi } from '../api/characters';
import { partiesApi } from '../api/parties';
import { useToast } from './ToastProvider';
import PartyComposition from './PartyComposition';
import { MultiPickDialog } from './MultiPick';

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
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [adding, setAdding] = useState(false);
  const navigate = useNavigate();
  const [confirmUnlink, setConfirmUnlink] = useState<Party | null>(null);
  const [unlinking, setUnlinking] = useState(false);

  const reload = async () => {
    setLoadError(null);
    try {
      const [parties, chars, mine] = await Promise.all([
        campaignPartiesApi.list(campaignId),
        charactersApi.list(),
        partiesApi.list(),
      ]);
      setLinked(parties);
      setAllCharacters(chars);
      setAllParties(mine);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : String(e));
    }
  };

  useEffect(() => {
    void reload();
  }, [campaignId]);

  const linkable = useMemo(
    () => allParties.filter((p) => p.id && !linked.some((l) => l.id === p.id)),
    [allParties, linked],
  );

  const onLink = async (picked: Party[]) => {
    try {
      await Promise.all(picked.map((p) => campaignPartiesApi.link(campaignId, p.id as string)));
      toast(picked.length === 1 ? `Linked ${picked[0].name}` : `Linked ${picked.length} parties`, 'success');
      setAdding(false);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      await reload();
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
            Link parties
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: canEdit ? 1.5 : 0 }}>
            No parties linked yet. A party can be linked to several campaigns.
          </Typography>
          {canEdit &&
            (linkable.length > 0 ? (
              <Button variant="contained" startIcon={<GroupAdd />} onClick={() => setAdding(true)}>
                Link parties
              </Button>
            ) : (
              <Button variant="outlined" startIcon={<GroupAdd />} onClick={() => navigate('/characters')}>
                Create a party
              </Button>
            ))}
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

      <MultiPickDialog
        open={adding}
        title="Link parties to this campaign"
        actionLabel="Link"
        actionIcon={<GroupAdd />}
        items={linkable}
        getKey={(p) => p.id as string}
        getLabel={(p) => p.name}
        getSecondary={(p) => `${p.member_ids?.length ?? 0} characters`}
        emptyText="No unlinked parties. Create one on the Characters page."
        onClose={() => setAdding(false)}
        onConfirm={onLink}
      />

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

export default CampaignPartiesPanel;
