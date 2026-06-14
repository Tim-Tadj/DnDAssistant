import React, { FC } from 'react';
import { Box, Divider, Stack, Typography, alpha, useTheme, Chip } from '@mui/material';
import { Campaign } from '../types/Campaign';

const CampaignDetailCard: FC<{ item: Campaign }> = ({ item }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        p: 2,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
        backgroundColor: alpha(theme.palette.background.default, 0.5),
      }}
    >
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
        <Typography
          variant="h3"
          component="h2"
          sx={{
            fontFamily: '"Cinzel", serif',
            fontStyle: 'italic',
            flexGrow: 1,
            lineHeight: 1.1,
          }}
        >
          {item.name}
        </Typography>
        <Chip
          label={item.status || 'active'}
          size="small"
          color={
            item.status === 'completed'
              ? 'success'
              : item.status === 'paused'
              ? 'warning'
              : 'primary'
          }
          variant="outlined"
        />
      </Stack>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
        {item.setting && (
          <Chip label={item.setting} size="small" variant="outlined" />
        )}
        {item.created_at && (
          <Typography variant="caption" color="text.secondary">
            Created {new Date(item.created_at).toLocaleDateString()}
          </Typography>
        )}
      </Stack>
      {item.description && (
        <Box sx={{ mb: 2 }}>
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: 'primary.main',
              fontFamily: '"Cinzel", serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
            }}
          >
            Description
          </Typography>
          <Typography variant="body1" sx={{ lineHeight: 1.6 }}>
            {item.description}
          </Typography>
        </Box>
      )}
      {item.notes && (
        <>
          <Divider sx={{ borderColor: theme.palette.divider, my: 1.5 }} />
          <Typography
            variant="overline"
            sx={{
              display: 'block',
              color: 'primary.main',
              fontFamily: '"Cinzel", serif',
              fontSize: '0.8rem',
              letterSpacing: '0.12em',
            }}
          >
            Notes
          </Typography>
          <Typography
            variant="body1"
            sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.6 }}
          >
            {item.notes}
          </Typography>
        </>
      )}
    </Box>
  );
};

export default CampaignDetailCard;
