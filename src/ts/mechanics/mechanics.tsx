/**
 * Mechanics page - a real TOC for the player guides.
 *
 * Each guide is a card in a sticky left rail. The right pane renders
 * the selected guide's content using the existing render-json-recursive
 * for the time being, but framed in a proper card with breadcrumbs.
 */

import React, { FC, Suspense, lazy, useState } from 'react';
import {
  Box,
  Chip,
  Divider,
  Paper,
  Skeleton,
  Stack,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { AutoStories, MenuBook } from '@mui/icons-material';
import mechanics from '../../res/rules/06 mechanics.json';
import combat from '../../res/rules/07 combat.json';
import races from '../../res/rules/01 races.json';
import classes from '../../res/rules/02 classes.json';
import conditions from '../../res/rules/12 conditions.json';
import other from '../../res/rules/09 running.json';

const RenderJsonRecursive = lazy(
  () => import('../shared/render-json-recursive')
);

type Guide = {
  id: string;
  title: string;
  description: string;
  body: object;
};

const GUIDES: Guide[] = [
  {
    id: 'mechanics',
    title: 'Mechanics',
    description: 'Core D&D mechanics — dice, checks, actions.',
    body: mechanics as object,
  },
  {
    id: 'combat',
    title: 'Combat',
    description: 'Initiative, attacks, damage, death saving throws.',
    body: combat as object,
  },
  {
    id: 'races',
    title: 'Races',
    description: 'Racial traits, ability score increases, languages.',
    body: races as object,
  },
  {
    id: 'classes',
    title: 'Classes',
    description: 'Class features, hit dice, proficiencies.',
    body: classes as object,
  },
  {
    id: 'conditions',
    title: 'Conditions',
    description: 'The 14 standard conditions and their effects.',
    body: conditions as object,
  },
  {
    id: 'running',
    title: 'Running the Game',
    description: 'Tips for pacing, exploration, social encounters.',
    body: other as object,
  },
];

const Mechanics: FC = () => {
  const theme = useTheme();
  const [active, setActive] = useState(GUIDES[0].id);
  const guide = GUIDES.find((g) => g.id === active) ?? GUIDES[0];

  return (
    <Box>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <AutoStories sx={{ color: 'primary.main' }} />
        <Typography variant="h3">Player Guides</Typography>
      </Stack>
      <Stack
        direction={{ xs: 'column', md: 'row' }}
        spacing={2}
        sx={{ alignItems: 'flex-start' }}
      >
        <Paper
          sx={{
            position: { md: 'sticky' },
            top: { md: 80 },
            width: { xs: '100%', md: 280 },
            flexShrink: 0,
            overflow: 'hidden',
          }}
        >
          <Box sx={{ p: 2, borderBottom: `1px solid ${theme.palette.divider}` }}>
            <Typography
              variant="overline"
              color="text.secondary"
              sx={{ display: 'block' }}
            >
              Topics
            </Typography>
            <Typography variant="h5">Guides</Typography>
          </Box>
          <Stack divider={<Divider />}>
            {GUIDES.map((g) => {
              const isActive = g.id === active;
              return (
                <Box
                  key={g.id}
                  onClick={() => setActive(g.id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setActive(g.id);
                  }}
                  sx={{
                    p: 1.5,
                    cursor: 'pointer',
                    backgroundColor: isActive
                      ? alpha(theme.palette.primary.main, 0.16)
                      : 'transparent',
                    borderLeft: `3px solid ${
                      isActive ? theme.palette.primary.main : 'transparent'
                    }`,
                    '&:hover': {
                      backgroundColor: isActive
                        ? alpha(theme.palette.primary.main, 0.2)
                        : alpha(theme.palette.primary.main, 0.06),
                    },
                  }}
                >
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <MenuBook
                      fontSize="small"
                      sx={{
                        color: isActive ? 'primary.main' : 'text.secondary',
                      }}
                    />
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography
                        variant="body1"
                        fontWeight={isActive ? 600 : 500}
                        sx={{
                          color: isActive ? 'primary.main' : 'text.primary',
                        }}
                      >
                        {g.title}
                      </Typography>
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{
                          display: '-webkit-box',
                          WebkitLineClamp: 1,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {g.description}
                      </Typography>
                    </Box>
                  </Stack>
                </Box>
              );
            })}
          </Stack>
        </Paper>

        <Box sx={{ flex: '1 1 auto', minWidth: 0, width: '100%' }}>
          <Paper sx={{ p: 3 }}>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <Typography variant="h2">{guide.title}</Typography>
              <Chip
                label={`${GUIDES.length} guides`}
                size="small"
                variant="outlined"
              />
            </Stack>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
              {guide.description}
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Suspense
              fallback={
                <Stack spacing={1}>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={24} />
                  <Skeleton variant="rectangular" height={120} />
                  <Skeleton variant="rectangular" height={120} />
                </Stack>
              }
            >
              <RenderJsonRecursive instance={guide.body} />
            </Suspense>
          </Paper>
        </Box>
      </Stack>
    </Box>
  );
};

export default Mechanics;
