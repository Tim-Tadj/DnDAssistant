import React, { FC, ReactNode } from 'react';
import { Box, CircularProgress, Stack, Typography, Button } from '@mui/material';
import { Inbox, ErrorOutline, Refresh } from '@mui/icons-material';

type EmptyStateProps = {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; onClick: () => void };
};

export const EmptyState: FC<EmptyStateProps> = ({
  title,
  description,
  icon = <Inbox sx={{ fontSize: 48, opacity: 0.5 }} />,
  action,
}) => (
  <Stack
    spacing={1}
    alignItems="center"
    justifyContent="center"
    sx={{ py: 6, px: 3, textAlign: 'center' }}
  >
    {icon}
    <Typography variant="h6" sx={{ opacity: 0.7 }}>
      {title}
    </Typography>
    {description && (
      <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
        {description}
      </Typography>
    )}
    {action && (
      <Button variant="outlined" onClick={action.onClick} sx={{ mt: 1 }}>
        {action.label}
      </Button>
    )}
  </Stack>
);

type LoadingStateProps = { label?: string };

export const LoadingState: FC<LoadingStateProps> = ({
  label = 'Loading…',
}) => (
  <Stack
    spacing={1}
    alignItems="center"
    justifyContent="center"
    sx={{ py: 6 }}
  >
    <CircularProgress size={28} />
    <Typography variant="body2" color="text.secondary">
      {label}
    </Typography>
  </Stack>
);

type ErrorStateProps = {
  message: string;
  onRetry?: () => void;
};

export const ErrorState: FC<ErrorStateProps> = ({ message, onRetry }) => (
  <Stack
    spacing={1}
    alignItems="center"
    justifyContent="center"
    sx={{ py: 6, px: 3, textAlign: 'center' }}
  >
    <ErrorOutline sx={{ fontSize: 48, color: 'error.main', opacity: 0.7 }} />
    <Typography variant="h6" color="error">
      Something went wrong
    </Typography>
    <Typography variant="body2" color="text.secondary" sx={{ maxWidth: 480 }}>
      {message}
    </Typography>
    {onRetry && (
      <Button
        variant="outlined"
        onClick={onRetry}
        startIcon={<Refresh />}
        sx={{ mt: 1 }}
      >
        Retry
      </Button>
    )}
  </Stack>
);

type CenteredProps = { children: ReactNode; minHeight?: number | string };
export const Centered: FC<CenteredProps> = ({ children, minHeight = 240 }) => (
  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight }}>
    {children}
  </Box>
);
