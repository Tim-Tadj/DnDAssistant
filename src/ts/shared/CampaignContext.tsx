// Phase 9: campaign context. Holds the user's "active campaign"
// and (optionally) "active party" — the working set every page
// should default to. Persisted to localStorage so the choice
// survives a refresh.
//
// Campaigns are the centre of the universe: every encounter, every
// session log, every NPC tag, every per-campaign character state
// row keys off the active campaign. Parties are free-floating
// (a party can be in many campaigns) but the active party is the
// default one for the encounter builder.

import React, {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useAuth } from '../auth/AuthContext';
import { Campaign } from '../types/Campaign';
import { Party } from '../types/Party';
import { campaignsApi } from '../api/campaigns';
import { partiesApi } from '../api/parties';

const ACTIVE_CAMPAIGN_KEY = 'dndassistant.activeCampaignId';
const ACTIVE_PARTY_KEY = 'dndassistant.activePartyId';

export type CampaignContextValue = {
  // The user's campaigns. Re-fetched on mount and on user change.
  campaigns: Campaign[];
  campaignsLoading: boolean;
  campaignsError: string | null;
  reloadCampaigns: () => Promise<void>;

  // The user's parties. Re-fetched alongside campaigns.
  parties: Party[];
  partiesLoading: boolean;
  partiesError: string | null;
  reloadParties: () => Promise<void>;

  // Active selection. null when the user has not picked one or has
  // none to pick.
  activeCampaignId: string | null;
  activeCampaign: Campaign | null;
  setActiveCampaignId: (id: string | null) => void;

  activePartyId: string | null;
  activeParty: Party | null;
  setActivePartyId: (id: string | null) => void;
};

const Ctx = createContext<CampaignContextValue | null>(null);

export function CampaignProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [campaignsLoading, setCampaignsLoading] = useState(false);
  const [campaignsError, setCampaignsError] = useState<string | null>(null);

  const [parties, setParties] = useState<Party[]>([]);
  const [partiesLoading, setPartiesLoading] = useState(false);
  const [partiesError, setPartiesError] = useState<string | null>(null);

  const [activeCampaignId, setActiveCampaignIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_CAMPAIGN_KEY),
  );
  const [activePartyId, setActivePartyIdState] = useState<string | null>(
    () => localStorage.getItem(ACTIVE_PARTY_KEY),
  );

  useEffect(() => {
    if (activeCampaignId) localStorage.setItem(ACTIVE_CAMPAIGN_KEY, activeCampaignId);
    else localStorage.removeItem(ACTIVE_CAMPAIGN_KEY);
  }, [activeCampaignId]);

  useEffect(() => {
    if (activePartyId) localStorage.setItem(ACTIVE_PARTY_KEY, activePartyId);
    else localStorage.removeItem(ACTIVE_PARTY_KEY);
  }, [activePartyId]);

  const reloadCampaigns = useCallback(async () => {
    if (!user) {
      setCampaigns([]);
      return;
    }
    setCampaignsLoading(true);
    setCampaignsError(null);
    try {
      const data = await campaignsApi.list();
      setCampaigns(data);
      // If the persisted active id no longer exists (was deleted,
      // or signed in as a different user), clear it.
      if (activeCampaignId && !data.find((c) => c.id === activeCampaignId)) {
        setActiveCampaignIdState(null);
      }
    } catch (e) {
      setCampaignsError(e instanceof Error ? e.message : String(e));
    } finally {
      setCampaignsLoading(false);
    }
  }, [user, activeCampaignId]);

  const reloadParties = useCallback(async () => {
    if (!user) {
      setParties([]);
      return;
    }
    setPartiesLoading(true);
    setPartiesError(null);
    try {
      const data = await partiesApi.list();
      setParties(data);
      if (activePartyId && !data.find((p) => p.id === activePartyId)) {
        setActivePartyIdState(null);
      }
    } catch (e) {
      setPartiesError(e instanceof Error ? e.message : String(e));
    } finally {
      setPartiesLoading(false);
    }
  }, [user, activePartyId]);

  useEffect(() => {
    reloadCampaigns();
  }, [reloadCampaigns]);

  useEffect(() => {
    reloadParties();
  }, [reloadParties]);

  // When the user signs in for the first time and has campaigns,
  // auto-pick the first active one.
  useEffect(() => {
    if (!user || activeCampaignId) return;
    if (campaigns.length > 0 && !campaignsLoading) {
      const first = campaigns.find((c) => c.status === 'active') ?? campaigns[0];
      if (first.id) setActiveCampaignIdState(first.id);
    }
  }, [user, campaigns, campaignsLoading, activeCampaignId]);

  // When the user signs in for the first time and has parties,
  // auto-pick the first one.
  useEffect(() => {
    if (!user || activePartyId) return;
    if (parties.length > 0 && !partiesLoading) {
      if (parties[0].id) setActivePartyIdState(parties[0].id);
    }
  }, [user, parties, partiesLoading, activePartyId]);

  // When the user signs out, clear the active selection.
  useEffect(() => {
    if (user) return;
    setActiveCampaignIdState(null);
    setActivePartyIdState(null);
    setCampaigns([]);
    setParties([]);
  }, [user]);

  const setActiveCampaignId = useCallback((id: string | null) => {
    setActiveCampaignIdState(id);
  }, []);

  const setActivePartyId = useCallback((id: string | null) => {
    setActivePartyIdState(id);
  }, []);

  const activeCampaign = useMemo(
    () => campaigns.find((c) => c.id === activeCampaignId) ?? null,
    [campaigns, activeCampaignId],
  );
  const activeParty = useMemo(
    () => parties.find((p) => p.id === activePartyId) ?? null,
    [parties, activePartyId],
  );

  const value = useMemo<CampaignContextValue>(
    () => ({
      campaigns,
      campaignsLoading,
      campaignsError,
      reloadCampaigns,
      parties,
      partiesLoading,
      partiesError,
      reloadParties,
      activeCampaignId,
      activeCampaign,
      setActiveCampaignId,
      activePartyId,
      activeParty,
      setActivePartyId,
    }),
    [
      campaigns,
      campaignsLoading,
      campaignsError,
      reloadCampaigns,
      parties,
      partiesLoading,
      partiesError,
      reloadParties,
      activeCampaignId,
      activeCampaign,
      setActiveCampaignId,
      activePartyId,
      activeParty,
      setActivePartyId,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCampaignContext(): CampaignContextValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCampaignContext must be used within <CampaignProvider>');
  return ctx;
}
