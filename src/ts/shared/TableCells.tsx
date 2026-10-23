// Cell layouts for EntityTable columns. Both truncate instead of
// wrapping, so a long value can't stretch one row into a tall stack;
// the full text is in the cell's tooltip (title).

import React, { FC, ReactNode } from 'react';
import { Box, Stack, Typography } from '@mui/material';
import { GridColDef } from '@mui/x-data-grid';
import ProvenanceChip from './ProvenanceChip';

// A table's Name cell: the avatar, then the name and an optional
// second line.
export const NameCell: FC<{ avatar?: ReactNode; name: ReactNode; secondary?: ReactNode }> = ({
  avatar,
  name,
  secondary,
}) => (
  <Stack direction="row" spacing={1.25} alignItems="center" sx={{ minWidth: 0, py: 0.25 }}>
    {avatar}
    <Box sx={{ minWidth: 0 }}>
      <Typography variant="body2" noWrap sx={{ fontWeight: 500 }} title={typeof name === 'string' ? name : undefined}>
        {name}
      </Typography>
      {secondary && (
        <Typography variant="caption" color="text.secondary" noWrap component="div">
          {secondary}
        </Typography>
      )}
    </Box>
  </Stack>
);

// The headline value with its detail underneath in small muted text:
// "367" over "21d20 + 147", "21" over "27,500 XP".
export const StackedCell: FC<{ primary: ReactNode; secondary?: ReactNode; title?: string; mono?: boolean; color?: string }> = ({
  primary,
  secondary,
  title,
  mono,
  color,
}) => (
  <Box title={title} sx={{ minWidth: 0, lineHeight: 1.2 }}>
    <Typography
      variant="body2"
      noWrap
      component="div"
      sx={{ color, ...(mono && { fontFamily: '"JetBrains Mono", monospace' }) }}
    >
      {primary}
    </Typography>
    {secondary && (
      <Typography variant="caption" color="text.secondary" noWrap component="div" sx={{ lineHeight: 1.3 }}>
        {secondary}
      </Typography>
    )}
  </Box>
);

// The Source column the reference tables share (SRD / Derived / Homebrew).
export const sourceColumn: GridColDef = {
  field: 'provenance',
  headerName: 'Source',
  width: 104,
  sortable: true,
  filterable: true,
  align: 'center',
  headerAlign: 'center',
  renderCell: ({ value }) => <ProvenanceChip value={value} />,
};

// "135 (18d10 + 36)" → ["135", "18d10 + 36"]; no brackets → [text, ''].
export const splitParen = (text?: string | null): [string, string] => {
  const m = (text ?? '').match(/^\s*([^(]*?)\s*\((.*)\)\s*$/);
  return m ? [m[1], m[2]] : [(text ?? '').trim(), ''];
};
