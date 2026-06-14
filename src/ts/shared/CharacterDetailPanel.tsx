/**
 * CharacterDetailPanel - the new detail-card used by the
 * Characters page. Renders the PHB-style stat block and the
 * in-session CharacterStatePanel below it, in a single column.
 */

import React, { FC } from 'react';
import { Box, Divider, Stack } from '@mui/material';
import { Character } from '../types/Character';
import CharacterCard from './CharacterCard';
import CharacterStatePanel from './CharacterStatePanel';

const CharacterDetailPanel: FC<{ item: Character }> = ({ item }) => {
  return (
    <Stack spacing={2}>
      <CharacterCard item={item} />
      <Divider />
      <Box>
        <CharacterStatePanel character={item} />
      </Box>
    </Stack>
  );
};

export default CharacterDetailPanel;
