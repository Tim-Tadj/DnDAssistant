/**
 * Player Guides page.
 *
 * A rail of guides with the open guide's contents (following the
 * reader as they scroll), a search over every guide, and the guide as
 * one readable article. `?guide=<id>&section=<id>` links to a section
 * (the heading anchors and global search use it). Search matches are
 * highlighted in the text with the CSS Custom Highlight API, so the
 * guide text itself is never rewritten.
 */

import React, { FC, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Button,
  Chip,
  Fab,
  GlobalStyles,
  IconButton,
  InputAdornment,
  List,
  ListItemButton,
  MenuItem,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  Zoom,
  alpha,
  useTheme,
} from '@mui/material';
import {
  AutoStories,
  Close,
  KeyboardArrowDown,
  KeyboardArrowUp,
  Search as SearchIcon,
  VerticalAlignTop,
} from '@mui/icons-material';
import { useSearchParams } from 'react-router-dom';
import { GUIDES, Guide, GuideHit, GuideId, Section, guideById, queryWords, searchGuides } from '../guides/guideModel';
import { GuideArticle, sectionDomId } from '../guides/GuideContent';
import { GUIDE_VISUALS, headingBadge } from '../guides/guideVisuals';
import { VisualBadge } from '../shared/EntityAvatar';

const minutes = (words: number) => Math.max(1, Math.round(words / 230));

// ---- Scroll-spy -----------------------------------------------------------

// The top-level and second-level sections the reader is in: the last
// heading that has scrolled past the app bar.
function useCurrentSection(article: React.RefObject<HTMLElement>, key: string) {
  const [current, setCurrent] = useState<{ top?: string; sub?: string }>({});
  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const heads = article.current?.querySelectorAll<HTMLElement>('[data-toc]') ?? [];
      let top: string | undefined;
      let sub: string | undefined;
      for (const h of Array.from(heads)) {
        if (h.getBoundingClientRect().top > 120) break;
        if (h.dataset.toc === '0') {
          top = h.id;
          sub = undefined;
        } else sub = h.id;
      }
      setCurrent((c) => (c.top === top && c.sub === sub ? c : { top, sub }));
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (frame) cancelAnimationFrame(frame);
    };
  }, [article, key]);
  return current;
}

// ---- Highlighting ---------------------------------------------------------

type HighlightRegistry = Map<string, unknown>;
const highlights = (): HighlightRegistry | undefined => (window.CSS as unknown as { highlights?: HighlightRegistry }).highlights;
const HighlightCtor = (window as unknown as { Highlight?: new (...ranges: Range[]) => unknown }).Highlight;

// Ranges of every query word in the article's text.
function useMatches(article: React.RefObject<HTMLElement>, words: string[], key: string): Range[] {
  const [ranges, setRanges] = useState<Range[]>([]);
  const wordsKey = words.join(' ');
  useEffect(() => {
    const root = article.current;
    if (!root || words.length === 0) {
      setRanges([]);
      return;
    }
    const found: Range[] = [];
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = (node.nodeValue ?? '').toLowerCase();
      for (const w of words) {
        for (let at = text.indexOf(w); at !== -1; at = text.indexOf(w, at + w.length)) {
          const r = document.createRange();
          r.setStart(node, at);
          r.setEnd(node, at + w.length);
          found.push(r);
        }
      }
    }
    // Reading order, so next/previous walk down the page.
    found.sort((a, b) => a.compareBoundaryPoints(Range.START_TO_START, b));
    setRanges(found);
  }, [article, wordsKey, key]);

  useEffect(() => {
    const reg = highlights();
    if (!reg || !HighlightCtor) return;
    reg.set('guide-match', new HighlightCtor(...ranges));
    return () => {
      reg.delete('guide-match');
    };
  }, [ranges]);
  return ranges;
}

// ---- Search results -------------------------------------------------------

const Snippet: FC<{ parts: [string, string, string] }> = ({ parts: [before, match, after] }) => (
  <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, lineHeight: 1.5 }}>
    {before}
    <Box component="mark" sx={{ bgcolor: 'rgba(201,161,74,0.35)', color: 'text.primary', borderRadius: 0.5, px: 0.25 }}>
      {match}
    </Box>
    {after}
  </Typography>
);

const Results: FC<{ query: string; hits: GuideHit[]; onOpen: (s: Section) => void }> = ({ query, hits, onOpen }) => {
  const theme = useTheme();
  const byGuide = GUIDES.map((g) => ({ guide: g, hits: hits.filter((h) => h.section.guide === g.id) })).filter((g) => g.hits.length);
  if (hits.length === 0) {
    return (
      <Stack alignItems="center" spacing={1} sx={{ py: 6, color: 'text.secondary' }}>
        <SearchIcon sx={{ fontSize: 40, opacity: 0.5 }} />
        <Typography>No section mentions &ldquo;{query}&rdquo;.</Typography>
        <Typography variant="body2">Try a single word, like &ldquo;grapple&rdquo; or &ldquo;rest&rdquo;.</Typography>
      </Stack>
    );
  }
  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        {hits.length}
        {hits.length === 60 ? '+' : ''} sections match &ldquo;{query}&rdquo;
      </Typography>
      {byGuide.map(({ guide, hits: gh }) => {
        const v = GUIDE_VISUALS[guide.id];
        return (
          <Box key={guide.id}>
            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
              <VisualBadge visual={v} size={22} />
              <Typography variant="overline" sx={{ color: v.color, fontWeight: 700, letterSpacing: '0.1em' }}>
                {guide.title}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {gh.length}
              </Typography>
            </Stack>
            <List disablePadding>
              {gh.map((h) => (
                <ListItemButton
                  key={h.section.id}
                  onClick={() => onOpen(h.section)}
                  sx={{
                    display: 'block',
                    borderRadius: 1,
                    py: 1,
                    borderLeft: `2px solid ${alpha(v.color, 0.5)}`,
                    mb: 0.5,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.06) },
                  }}
                >
                  <Stack direction="row" spacing={1} alignItems="center">
                    {headingBadge(h.section.guide, h.section.title, 22)}
                    <Typography sx={{ fontWeight: 600 }}>{h.section.title}</Typography>
                  </Stack>
                  {h.section.trail.length > 0 && (
                    <Typography variant="caption" color="text.secondary">
                      {h.section.trail.join(' › ')}
                    </Typography>
                  )}
                  {h.snippet && <Snippet parts={h.snippet} />}
                </ListItemButton>
              ))}
            </List>
          </Box>
        );
      })}
    </Stack>
  );
};

// ---- Rail -----------------------------------------------------------------

const GuideRail: FC<{
  guide: Guide;
  current: { top?: string; sub?: string };
  onGuide: (id: GuideId) => void;
  onSection: (s: Section) => void;
}> = ({ guide, current, onGuide, onSection }) => {
  const theme = useTheme();
  const railRef = useRef<HTMLDivElement | null>(null);

  // Keep the current contents entry in view inside the rail (not the page).
  useEffect(() => {
    const rail = railRef.current;
    const item = rail?.querySelector<HTMLElement>('[data-current="true"]');
    if (!rail || !item) return;
    const r = rail.getBoundingClientRect();
    const i = item.getBoundingClientRect();
    if (i.top < r.top + 8 || i.bottom > r.bottom - 8) rail.scrollTop += i.top - r.top - r.height / 3;
  }, [current.top, current.sub]);

  return (
    <Paper
      ref={railRef}
      sx={{
        position: 'sticky',
        top: 72,
        width: 290,
        flexShrink: 0,
        maxHeight: 'calc(100vh - 88px)',
        overflowY: 'auto',
        display: { xs: 'none', md: 'block' },
      }}
    >
      {GUIDES.map((g) => {
        const v = GUIDE_VISUALS[g.id];
        const active = g.id === guide.id;
        return (
          <Box key={g.id} sx={{ borderBottom: `1px solid ${theme.palette.divider}` }}>
            <ListItemButton
              onClick={() => onGuide(g.id)}
              selected={active}
              sx={{
                py: 1.25,
                gap: 1.5,
                borderLeft: `3px solid ${active ? v.color : 'transparent'}`,
                '&.Mui-selected': { bgcolor: alpha(v.color, 0.12) },
                '&.Mui-selected:hover': { bgcolor: alpha(v.color, 0.18) },
              }}
            >
              <VisualBadge visual={v} size={34} />
              <Box sx={{ minWidth: 0 }}>
                <Typography sx={{ fontWeight: 600, color: active ? v.color : 'text.primary', lineHeight: 1.3 }}>
                  {g.title}
                </Typography>
                <Typography variant="caption" color="text.secondary" component="div" sx={{ lineHeight: 1.35 }}>
                  {g.description}
                </Typography>
              </Box>
            </ListItemButton>
            {active && (
              <Box component="nav" aria-label={`${g.title} contents`} sx={{ pb: 1, pl: 2.5 }}>
                {g.sections.map((s) => {
                  const isTop = current.top === sectionDomId(s.id);
                  const subs = s.nodes.flatMap((n) => (n.kind === 'section' ? [n.section] : []));
                  return (
                    <Box key={s.id}>
                      <TocItem
                        label={s.title}
                        badge={headingBadge(g.id, s.title, 18)}
                        current={isTop && !current.sub}
                        within={isTop}
                        color={v.color}
                        onClick={() => onSection(s)}
                      />
                      {isTop &&
                        subs.map((c) => (
                          <TocItem
                            key={c.id}
                            label={c.title}
                            depth={1}
                            current={current.sub === sectionDomId(c.id)}
                            color={v.color}
                            onClick={() => onSection(c)}
                          />
                        ))}
                    </Box>
                  );
                })}
              </Box>
            )}
          </Box>
        );
      })}
    </Paper>
  );
};

const TocItem: FC<{
  label: string;
  badge?: React.ReactNode;
  depth?: number;
  current?: boolean;
  within?: boolean;
  color: string;
  onClick: () => void;
}> = ({ label, badge, depth = 0, current, within, color, onClick }) => (
  <Box
    component="button"
    type="button"
    onClick={onClick}
    data-current={current ? 'true' : undefined}
    aria-current={current ? 'location' : undefined}
    sx={{
      all: 'unset',
      boxSizing: 'border-box',
      cursor: 'pointer',
      width: '100%',
      display: 'flex',
      alignItems: 'center',
      gap: 1,
      py: 0.5,
      pr: 1.5,
      pl: depth ? 3 : 1,
      fontSize: depth ? '0.8rem' : '0.86rem',
      lineHeight: 1.35,
      color: current ? color : within ? 'text.primary' : 'text.secondary',
      fontWeight: current || (within && !depth) ? 600 : 400,
      borderLeft: `2px solid ${current ? color : 'transparent'}`,
      '&:hover': { color: 'text.primary' },
      '&:focus-visible': { outline: `2px solid ${color}`, outlineOffset: -2 },
    }}
  >
    {badge}
    <span>{label}</span>
  </Box>
);

// ---- Page -----------------------------------------------------------------

const Mechanics: FC = () => {
  const theme = useTheme();
  const [params, setParams] = useSearchParams();
  const guide = guideById(params.get('guide')) ?? GUIDES[0];
  const sectionParam = params.get('section');
  const v = GUIDE_VISUALS[guide.id];

  const [query, setQuery] = useState('');
  const [showResults, setShowResults] = useState(false);
  const [jump, setJump] = useState(0); // re-scrolls to the same section
  const [matchIndex, setMatchIndex] = useState(-1);
  const [scrolled, setScrolled] = useState(false);
  const articleRef = useRef<HTMLDivElement | null>(null);

  const hits = useMemo(() => searchGuides(query), [query]);
  const words = useMemo(() => (showResults ? [] : queryWords(query)), [query, showResults]);
  const matches = useMatches(articleRef, words, guide.id);
  const current = useCurrentSection(articleRef, `${guide.id}-${showResults}`);

  const open = useCallback(
    (guideId: GuideId, section?: string) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev);
          next.set('guide', guideId);
          if (section) next.set('section', section);
          else next.delete('section');
          return next;
        },
        { replace: guideId === guide.id },
      );
      setJump((n) => n + 1);
    },
    [setParams, guide.id],
  );

  // Scroll to ?section= (or the top of a newly opened guide).
  useEffect(() => {
    if (showResults) return;
    const el = sectionParam ? document.getElementById(sectionDomId(sectionParam)) : null;
    if (!el) {
      window.scrollTo({ top: 0 });
      return;
    }
    el.scrollIntoView({ behavior: jump ? 'smooth' : 'auto', block: 'start' });
    el.classList.remove('guide-flash');
    void el.offsetWidth; // restart the animation
    el.classList.add('guide-flash');
    // jump: a click on the section already in the URL still scrolls.
  }, [guide.id, sectionParam, showResults, jump]);

  useEffect(() => setMatchIndex(-1), [matches]);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 900);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Next/previous match: scroll it into view and mark it as current.
  const stepMatch = (dir: 1 | -1) => {
    if (matches.length === 0) return;
    const i = (matchIndex + dir + matches.length) % matches.length;
    setMatchIndex(i);
    const rect = matches[i].getBoundingClientRect();
    window.scrollTo({ top: window.scrollY + rect.top - window.innerHeight / 3, behavior: 'smooth' });
  };
  useEffect(() => {
    const reg = highlights();
    if (!reg || !HighlightCtor) return;
    if (matchIndex >= 0 && matches[matchIndex]) reg.set('guide-current', new HighlightCtor(matches[matchIndex]));
    return () => {
      reg.delete('guide-current');
    };
  }, [matchIndex, matches]);

  const openHit = (s: Section) => {
    setShowResults(false);
    open(s.guide, s.id);
  };

  const clearSearch = () => {
    setQuery('');
    setShowResults(false);
  };

  return (
    <Box>
      <GlobalStyles
        styles={{
          '::highlight(guide-match)': { backgroundColor: 'rgba(201,161,74,0.32)', color: 'inherit' },
          '::highlight(guide-current)': { backgroundColor: '#c9a14a', color: '#14110a' },
        }}
      />

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={2}
        alignItems={{ xs: 'stretch', sm: 'center' }}
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" spacing={1} alignItems="center">
          <AutoStories sx={{ color: 'primary.main' }} />
          <Typography variant="h3">Player Guides</Typography>
        </Stack>
        <TextField
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setShowResults(e.target.value.trim().length > 0);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && hits[0]) openHit(hits[0].section);
            if (e.key === 'Escape') clearSearch();
          }}
          placeholder="Search all guides — e.g. grapple, darkvision"
          size="small"
          inputProps={{ 'aria-label': 'Search the guides' }}
          sx={{ width: { xs: '100%', sm: 380 } }}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: query ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={clearSearch} aria-label="Clear search">
                  <Close fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          }}
        />
      </Stack>

      {/* Phones: guides as a row of chips, contents as a picker. */}
      <Stack spacing={1.5} sx={{ display: { xs: 'flex', md: 'none' }, mb: 2 }}>
        <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 0.5 }}>
          {GUIDES.map((g) => {
            const gv = GUIDE_VISUALS[g.id];
            const active = g.id === guide.id;
            return (
              <Chip
                key={g.id}
                icon={<gv.Icon sx={{ fontSize: 18, '&&': { color: gv.color } }} />}
                label={g.title}
                onClick={() => {
                  setShowResults(false);
                  open(g.id);
                }}
                variant={active ? 'filled' : 'outlined'}
                sx={{ flexShrink: 0, ...(active && { bgcolor: alpha(gv.color, 0.2) }) }}
              />
            );
          })}
        </Stack>
        {!showResults && (
          <TextField
            select
            size="small"
            label="Jump to"
            value={guide.sections.some((s) => sectionDomId(s.id) === current.top) ? current.top : ''}
            onChange={(e) => {
              const s = guide.sections.find((x) => sectionDomId(x.id) === e.target.value);
              if (s) open(guide.id, s.id);
            }}
          >
            {guide.sections.map((s) => (
              <MenuItem key={s.id} value={sectionDomId(s.id)}>
                {s.title}
              </MenuItem>
            ))}
          </TextField>
        )}
      </Stack>

      <Stack
        direction="row"
        spacing={2}
        alignItems="flex-start"
        // Headings scroll clear of the app bar, and of the match bar too.
        sx={{ '--guide-scroll-offset': words.length > 0 ? '128px' : '72px' }}
      >
        <GuideRail
          guide={guide}
          current={current}
          onGuide={(id) => {
            setShowResults(false);
            open(id);
          }}
          onSection={(s) => {
            setShowResults(false);
            open(s.guide, s.id);
          }}
        />

        <Paper sx={{ flex: '1 1 auto', minWidth: 0, p: { xs: 2, sm: 3, lg: 4 } }}>
          {showResults ? (
            <Results query={query} hits={hits} onOpen={openHit} />
          ) : (
            <>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1 }}>
                <VisualBadge visual={v} size={52} />
                <Box sx={{ minWidth: 0 }}>
                  <Typography variant="h2" sx={{ color: v.color, lineHeight: 1.1 }}>
                    {guide.title}
                  </Typography>
                  <Typography color="text.secondary">{guide.description}</Typography>
                </Box>
              </Stack>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap sx={{ mb: 1 }}>
                <Chip size="small" variant="outlined" label={`${guide.all.length} sections`} />
                <Chip size="small" variant="outlined" label={`${minutes(guide.words)} min read`} />
                {guide.tables > 0 && (
                  <Chip size="small" variant="outlined" label={`${guide.tables} table${guide.tables === 1 ? '' : 's'}`} />
                )}
              </Stack>

              {words.length > 0 && (
                <Stack
                  direction="row"
                  alignItems="center"
                  spacing={1}
                  sx={{
                    position: 'sticky',
                    top: 64,
                    zIndex: 2,
                    my: 1.5,
                    px: 1.5,
                    py: 0.75,
                    borderRadius: 1.5,
                    bgcolor: alpha(theme.palette.background.paper, 0.96),
                    border: `1px solid ${alpha(theme.palette.primary.main, 0.4)}`,
                    backdropFilter: 'blur(4px)',
                  }}
                >
                  <SearchIcon fontSize="small" sx={{ color: 'primary.main' }} />
                  <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap>
                    &ldquo;{query.trim()}&rdquo; ·{' '}
                    {matches.length === 0
                      ? 'not in this guide'
                      : `${matchIndex >= 0 ? `${matchIndex + 1} of ` : ''}${matches.length} match${matches.length === 1 ? '' : 'es'} here`}
                  </Typography>
                  <Tooltip title="Previous match">
                    <span>
                      <IconButton size="small" onClick={() => stepMatch(-1)} disabled={!matches.length} aria-label="Previous match">
                        <KeyboardArrowUp fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Tooltip title="Next match">
                    <span>
                      <IconButton size="small" onClick={() => stepMatch(1)} disabled={!matches.length} aria-label="Next match">
                        <KeyboardArrowDown fontSize="small" />
                      </IconButton>
                    </span>
                  </Tooltip>
                  <Button size="small" onClick={() => setShowResults(true)}>
                    Results
                  </Button>
                  <IconButton size="small" onClick={clearSearch} aria-label="Clear search">
                    <Close fontSize="small" />
                  </IconButton>
                </Stack>
              )}

              <GuideArticle ref={articleRef} guide={guide} />
            </>
          )}
        </Paper>
      </Stack>

      <Zoom in={scrolled}>
        <Fab
          size="small"
          color="primary"
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          sx={{ position: 'fixed', right: 24, bottom: 24 }}
        >
          <VerticalAlignTop />
        </Fab>
      </Zoom>
    </Box>
  );
};

export default Mechanics;
