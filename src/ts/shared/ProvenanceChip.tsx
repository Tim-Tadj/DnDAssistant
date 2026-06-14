import React, { FC } from 'react';
import { Chip } from '@mui/material';
import { PROVENANCE } from '../../theme';

const ProvenanceChip: FC<{ value?: string; size?: 'small' | 'medium' }> = ({
  value,
  size = 'small',
}) => {
  if (!value) return null;
  const meta = PROVENANCE[value as keyof typeof PROVENANCE];
  if (!meta) {
    return (
      <Chip
        label={value}
        size={size}
        variant="outlined"
        sx={{ borderColor: 'divider' }}
      />
    );
  }
  return (
    <Chip
      label={meta.label}
      size={size}
      sx={{
        backgroundColor: `${meta.color}26`,
        color: meta.color,
        border: `1px solid ${meta.color}55`,
        '&:hover': { backgroundColor: `${meta.color}3a` },
      }}
    />
  );
};

export default ProvenanceChip;
