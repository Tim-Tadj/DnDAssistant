// Phase 9: parties linked to this campaign. Renders the
// campaign_parties junction as a responsive grid of cards: members
// with level / class / HP / AC, a compact composition summary, and
// actions to make a party the active one (the top-bar switcher,
// which the encounter builder and tracker read), edit it on the
// Characters page, or unlink it. Several parties can be linked at once.

import React, { FC, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  Divider,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { CheckCircle, Edit, Group, GroupAdd, LinkOff, People, RadioButtonUnchecked } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { Party } from '../types/Party';
import { Character } from '../types/Character';
import { campaignPartiesApi } from '../api/campaign-parties';
import { charactersApi } from '../api/characters';
import { partiesApi } from '../api/parties';
import { useToast } from './ToastProvider';
import PartyComposition from './PartyComposition';
import { MultiPickDialog } from './MultiPick';
import { useCampaignContext } from './CampaignContext';
import { useConfirm } from './useConfirm';
import { classNameOf, useClasses } from './useReference';

type Props = {
  campaignId: string;
  canEdit: boolean;
};

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

const CampaignPartiesPanel: FC<Props> = ({ campaignId, canEdit }) => {
  const theme = useTheme();
  const { toast } = useToast();
  const navigate = useNavigate();
  const { confirm, dialog } = useConfirm();
  const { activePartyId, setActivePartyId } = useCampaignContext();
  const classes = useClasses();
  const [linked, setLinked] = useState<Party[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [allCharacters, setAllCharacters] = useState<Character[]>([]);
  const [allParties, setAllParties] = useState<Party[]>([]);
  const [adding, setAdding] = useState(false);

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
  const memberCount = linked.reduce((acc, p) => acc + (p.member_ids?.length ?? 0), 0);

  const onLink = async (picked: Party[]) => {
    try {
      await Promise.all(picked.map((p) => campaignPartiesApi.link(campaignId, p.id as string)));
      toast(picked.length === 1 ? `Linked ${picked[0].name}` : `Linked ${picked.length} parties`, 'success');
      setAdding(false);
      // With no active party yet, the first one linked becomes it.
      if (!activePartyId && picked[0]?.id) setActivePartyId(picked[0].id);
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    } finally {
      await reload();
    }
  };

  const onUnlink = async (p: Party) => {
    if (!p.id) return;
    const ok = await confirm({
      title: `Unlink "${p.name}"?`,
      body: 'The party itself is not deleted. It stays in your party list and can be linked to other campaigns.',
      confirmLabel: 'Unlink',
      destructive: true,
    });
    if (!ok) return;
    try {
      await campaignPartiesApi.unlink(campaignId, p.id);
      toast(`Unlinked ${p.name}`, 'success');
      await reload();
    } catch (e) {
      toast(e instanceof Error ? e.message : String(e), 'error');
    }
  };

  return (
    <Box>
      {dialog}
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }} spacing={1}>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ minWidth: 0 }}>
          <People fontSize="small" sx={{ color: 'primary.main' }} />
          <Typography variant="h5" noWrap>
            Parties
          </Typography>
          {linked.length > 0 && (
            <Typography variant="body2" color="text.secondary" noWrap>
              {plural(linked.length, 'party', 'parties')} · {plural(memberCount, 'character', 'characters')}
            </Typography>
          )}
        </Stack>
        {canEdit && linked.length > 0 && (
          <Button size="small" variant="outlined" startIcon={<GroupAdd />} onClick={() => setAdding(true)}>
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
          sx={{ p: 2.5, textAlign: 'center', backgroundColor: alpha(theme.palette.primary.main, 0.04) }}
        >
          <Typography variant="body2" color="text.secondary" sx={{ mb: canEdit ? 1.5 : 0 }}>
            No parties linked yet. Link the group that plays this campaign so encounters are balanced
            for them. A party can be linked to several campaigns.
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
        <Box
          sx={{
            display: 'grid',
            gap: 1.5,
            gridTemplateColumns: { xs: '1fr', sm: 'repeat(auto-fill, minmax(340px, 1fr))' },
          }}
        >
          {linked.map((p) => {
            const members = allCharacters.filter((c) => c.id && p.member_ids?.includes(c.id));
            const active = !!p.id && p.id === activePartyId;
            return (
              <Card
                key={p.id}
                variant="outlined"
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  borderColor: active ? alpha(theme.palette.primary.main, 0.6) : undefined,
                }}
              >
                <CardContent sx={{ pb: 1, flexGrow: 1 }}>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                    <Group fontSize="small" sx={{ color: 'secondary.main' }} />
                    <Typography variant="h6" noWrap sx={{ flexGrow: 1 }}>
                      {p.name}
                    </Typography>
                    {active && <Chip label="Active" size="small" color="primary" />}
                  </Stack>
                  {p.description && (
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                      {p.description}
                    </Typography>
                  )}
                  {members.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      No members yet.
                    </Typography>
                  ) : (
                    <>
                      <Stack divider={<Divider flexItem />} sx={{ mb: 1.5 }}>
                        {members.map((c) => (
                          <Stack key={c.id} direction="row" alignItems="baseline" spacing={1} sx={{ py: 0.5 }}>
                            <Typography variant="body2" fontWeight={600} noWrap sx={{ flexGrow: 1, minWidth: 0 }}>
                              {c.name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary" noWrap>
                              Lvl {c.level} {classNameOf(classes, c.class_id) ?? ''}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                              noWrap
                              sx={{ fontFamily: '"JetBrains Mono", monospace' }}
                            >
                              HP {c.hp_max} · AC {c.ac}
                            </Typography>
                          </Stack>
                        ))}
                      </Stack>
                      <PartyComposition characters={members} classes={classes} compact />
                    </>
                  )}
                </CardContent>
                <Divider />
                <CardActions sx={{ px: 1.5, justifyContent: 'space-between' }}>
                  <Button
                    size="small"
                    startIcon={active ? <CheckCircle /> : <RadioButtonUnchecked />}
                    onClick={() => p.id && setActivePartyId(p.id)}
                    disabled={active}
                  >
                    {active ? 'Active party' : 'Set as active'}
                  </Button>
                  {canEdit && (
                    <Stack direction="row" spacing={0.5}>
                      <Button
                        size="small"
                        color="inherit"
                        startIcon={<Edit fontSize="small" />}
                        onClick={() => navigate('/characters')}
                      >
                        Members
                      </Button>
                      <Button size="small" color="error" startIcon={<LinkOff fontSize="small" />} onClick={() => onUnlink(p)}>
                        Unlink
                      </Button>
                    </Stack>
                  )}
                </CardActions>
              </Card>
            );
          })}
        </Box>
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
    </Box>
  );
};

export default CampaignPartiesPanel;
