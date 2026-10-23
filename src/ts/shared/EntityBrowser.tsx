/**
 * EntityBrowser - shared shell for the list/detail/edit/delete pattern.
 *
 * Every entity page (monsters, spells, gear, characters, campaigns) used to
 * have ~250 lines of identical state management around the open dialog,
 * search, edit, delete-confirm, and toast logic. This shell factors all of
 * that out so the page is just a configuration.
 *
 * The page provides:
 * - items / loadError / reload (usually from useList)
 * - mutations: { create, update, remove } API calls
 * - columns: table columns
 * - DetailCard: the read-only view shown in the drawer
 * - Editor: a controlled form ({ initial, onChange }); create and edit
 *   both open it in a FormDialog, which owns saving and errors
 * - defaultItem: the blank draft for "Create"
 * - getRowName: for titles, toasts and the name check
 * - isEditable / isDeletable: default to provenance === 'homebrew'
 *
 * Phase 7: UI/UX redesign.
 */

import React, { FC, ReactNode, useCallback, useState } from 'react';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  InputAdornment,
  Paper,
  Stack,
  TextField,
  Tooltip,
  Typography,
  useMediaQuery,
  useTheme,
  Chip,
  Drawer,
  alpha,
} from '@mui/material';
import {
  Add,
  Close,
  Delete,
  Edit,
  Search as SearchIcon,
  Clear,
} from '@mui/icons-material';
import { GridColDef } from '@mui/x-data-grid';
import EntityTable from './EntityTable';
import FormDialog, { errorMessage, requireName } from './FormDialog';
import ProvenanceChip from './ProvenanceChip';
import { ErrorState, EmptyState, LoadingState } from './States';
import { useToast } from './ToastProvider';

export type EntityMutations<T> = {
  create: (item: T) => Promise<T>;
  update: (id: any, item: T) => Promise<T>;
  remove: (id: any) => Promise<void>;
};

// Wide string-or-number id helper for hooks
export type EntityId = string | number;

export type EntityBrowserProps<T> = {
  title: string;
  items: T[] | null;
  loadError: string | null;
  reload: () => Promise<void> | void;
  mutations: EntityMutations<T>;
  columns: GridColDef[];
  DetailCard: FC<{ item: T; canEdit?: boolean; onChanged?: (item: T) => void }>;
  defaultItem: () => T;
  // Editor is rendered inside the dialog; receives { initial, onChange } so the
  // dialog can build the current object for save.
  Editor: FC<{
    initial: T;
    onChange: (item: T) => void;
    onJsonUpdate?: (json: string) => void;
  }>;
  getRowId: (row: T) => string | number;
  getRowName: (row: T) => string;
  isEditable?: (row: T) => boolean;
  isDeletable?: (row: T) => boolean;
  // Owner predicate; defaults to provenance === 'homebrew'. The user
  // is considered the owner of homebrew rows and not of srd/derived.
  isMine?: (row: T) => boolean;
  // Optional kind filter chips (for Gear).
  filterChips?: { label: string; value: string }[];
  activeFilter?: string | null;
  onFilterChange?: (value: string | null) => void;
  // "My homebrew" filter toggle.
  showMineFilter?: boolean;
  mineFilter?: boolean;
  onMineFilterChange?: (v: boolean) => void;
  searchHint?: string;
  // One row's noun ("Monster"); defaults to the title minus its "s".
  // Used for "Create Monster", the form title and toasts.
  itemName?: string;
  // Only for create flows the built-in form can't do (gear kind picker,
  // campaigns becoming active); otherwise "Create" opens the Editor.
  CreateButton?: FC<{ onCreated?: () => void }>;
  extraActions?: (item: T) => ReactNode;
  // Optional custom-empty state title/description
  emptyTitle?: string;
  emptyDescription?: string;
};

export function EntityBrowser<T extends { id?: string | number; provenance?: string }>({
  title,
  items,
  loadError,
  reload,
  mutations,
  columns,
  DetailCard,
  defaultItem,
  Editor,
  getRowId,
  getRowName,
  isEditable,
  isDeletable,
  isMine,
  filterChips,
  activeFilter,
  onFilterChange,
  showMineFilter,
  mineFilter,
  onMineFilterChange,
  searchHint,
  itemName = title.replace(/s$/, ''),
  CreateButton,
  extraActions,
  emptyTitle,
  emptyDescription,
}: EntityBrowserProps<T>) {
  const theme = useTheme();
  const isCompact = useMediaQuery(theme.breakpoints.down('md'));
  const { toast } = useToast();
  const [search, setSearch] = useState('');
  const [drawerItem, setDrawerItem] = useState<T | null>(null);
  // Create/edit form (`id` set = editing). It opens over the detail
  // drawer when started from there, or straight from a row's Edit.
  const [editor, setEditor] = useState<{ draft: T; id?: EntityId } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Filter + search
  const mineCheck = isMine ?? ((row: T) => row.provenance === 'homebrew');
  const filtered = (items ?? []).filter((row) => {
    if (!row) return false;
    if (activeFilter) {
      const k = (row as unknown as Record<string, unknown>)['kind'];
      if (k !== activeFilter) return false;
    }
    if (mineFilter && !mineCheck(row)) return false;
    if (!search.trim()) return true;
    const name = (getRowName(row) || '').toLowerCase();
    return search
      .toLowerCase()
      .split(/\s+/)
      .filter(Boolean)
      .some((q) => name.includes(q));
  });

  const onRowClick = (row: T) => {
    if (row) setDrawerItem(row);
  };

  const closeDrawer = () => setDrawerItem(null);

  const startEdit = (row: T) => setEditor({ draft: { ...row }, id: row.id });

  const onStartCreate = () => setEditor({ draft: defaultItem() });

  // Stable, and a no-op for the same draft: most editors report changes
  // from a useEffect that depends on onChange, so a new callback (or a
  // new state object) every render would loop.
  const onDraftChange = useCallback(
    (draft: T) => setEditor((prev) => (prev && prev.draft !== draft ? { ...prev, draft } : prev)),
    [],
  );

  // Throws to show the error in the form; FormDialog closes on success.
  const onSave = async () => {
    if (!editor) return;
    requireName({ name: getRowName(editor.draft) });
    if (editor.id === undefined || editor.id === null) {
      await mutations.create(editor.draft);
      toast(`${itemName} created`, 'success');
    } else {
      await mutations.update(editor.id, editor.draft);
      toast(`${itemName} updated`, 'success');
      setDrawerItem(null); // its contents are stale now
    }
    await reload();
  };

  const onConfirmDelete = async () => {
    const id = drawerItem?.id;
    if (id === undefined || id === null) return;
    setDeleting(true);
    try {
      await mutations.remove(id);
      toast('Deleted', 'success');
      setConfirmDelete(false);
      closeDrawer();
      await reload();
    } catch (e) {
      toast(errorMessage(e), 'error');
    } finally {
      setDeleting(false);
    }
  };

  const editable = (row: T) =>
    isEditable ? isEditable(row) : row.provenance === 'homebrew';
  const deletable = (row: T) =>
    isDeletable ? isDeletable(row) : row.provenance === 'homebrew';

  return (
    <Box>
      {/* Header */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ xs: 'flex-start', sm: 'center' }}
        spacing={1.5}
        sx={{ mb: 2 }}
      >
        <Stack spacing={0.25}>
          <Typography variant="h3">{title}</Typography>
          {items && (
            <Typography variant="caption" color="text.secondary">
              {mineFilter
                ? `${filtered.length} of ${items.length} ${items.length === 1 ? 'item' : 'items'} (yours)`
                : `${items.length} ${items.length === 1 ? 'item' : 'items'}`}
              {search && filtered.length !== items.length
                ? ` · ${filtered.length} matching "${search}"`
                : ''}
            </Typography>
          )}
        </Stack>
        <Stack direction="row" spacing={1}>
          {CreateButton ? (
            <CreateButton onCreated={reload} />
          ) : (
            <Button
              variant="contained"
              startIcon={<Add />}
              onClick={onStartCreate}
            >
              Create {itemName}
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Filter chips + search */}
      <Paper
        sx={{
          p: 1.5,
          mb: 2,
          display: 'flex',
          flexDirection: { xs: 'column', md: 'row' },
          alignItems: { md: 'center' },
          gap: 1.5,
        }}
      >
        <TextField
          fullWidth
          size="small"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={searchHint ?? `Search ${title.toLowerCase()}…`}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <Clear fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
          sx={{ flexGrow: 1 }}
        />
        {(filterChips && filterChips.length > 0) || showMineFilter ? (
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {showMineFilter && (
              <Chip
                label="My homebrew"
                size="small"
                onClick={() => onMineFilterChange?.(!mineFilter)}
                color={mineFilter ? 'primary' : 'default'}
                variant={mineFilter ? 'filled' : 'outlined'}
              />
            )}
            {filterChips && filterChips.length > 0 && (
              <>
                <Chip
                  label="All"
                  size="small"
                  onClick={() => onFilterChange?.(null)}
                  color={activeFilter == null ? 'primary' : 'default'}
                  variant={activeFilter == null ? 'filled' : 'outlined'}
                />
                {filterChips.map((chip) => (
                  <Chip
                    key={chip.value}
                    label={chip.label}
                    size="small"
                    onClick={() => onFilterChange?.(chip.value)}
                    color={activeFilter === chip.value ? 'primary' : 'default'}
                    variant={activeFilter === chip.value ? 'filled' : 'outlined'}
                  />
                ))}
              </>
            )}
          </Stack>
        ) : null}
      </Paper>

      {/* Body */}
      {loadError ? (
        <ErrorState message={loadError} onRetry={() => void reload()} />
      ) : items === null ? (
        <LoadingState />
      ) : items.length === 0 ? (
        <EmptyState
          title={emptyTitle ?? `No ${title.toLowerCase()} yet`}
          description={
            emptyDescription ?? 'Create one to get started.'
          }
          action={
            CreateButton
              ? undefined
              : { label: `Create ${itemName}`, onClick: onStartCreate }
          }
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          title="No matches"
          description={
            mineFilter
              ? `You have no homebrew ${title.toLowerCase()} yet. ${search ? `Also, your search "${search}" returned nothing. ` : ''}Create one to see it here.`
              : `No ${title.toLowerCase()} match "${search}".`
          }
          action={
            mineFilter && search
              ? { label: 'Clear filters', onClick: () => { setSearch(''); onMineFilterChange?.(false); } }
              : mineFilter
              ? { label: 'Show all', onClick: () => onMineFilterChange?.(false) }
              : { label: 'Clear search', onClick: () => setSearch('') }
          }
        />
      ) : (
        // No overflow clipping here: it would break the sticky header.
        <Paper>
          <EntityTable
            rows={filtered}
            columns={[
              ...columns,
              {
                field: '__actions',
                headerName: '',
                width: 90,
                sortable: false,
                filterable: false,
                disableColumnMenu: true,
                renderCell: (params) => {
                  const row = params.row as T;
                  if (!row) return null;
                  if (!mineCheck(row)) return null;
                  return (
                    <Stack
                      direction="row"
                      spacing={0.25}
                      sx={{
                        opacity: 0,
                        transition: 'opacity 120ms ease',
                        '.MuiTableRow-root:hover &, .MuiTableRow-root:focus-within &': { opacity: 1 },
                      }}
                    >
                      <Tooltip title="Edit" arrow>
                        <IconButton
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            startEdit(row);
                          }}
                        >
                          <Edit fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete" arrow>
                        <IconButton
                          size="small"
                          color="error"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDrawerItem(row);
                            setConfirmDelete(true);
                          }}
                        >
                          <Delete fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Stack>
                  );
                },
              },
            ]}
            getRowId={getRowId}
            onRowClick={onRowClick}
          />
        </Paper>
      )}

      {/* Detail drawer */}
      <Drawer
        anchor={isCompact ? 'bottom' : 'right'}
        open={drawerItem !== null}
        onClose={closeDrawer}
        PaperProps={{
          sx: {
            width: { xs: '100%', md: 720 },
            maxWidth: '100%',
            height: { xs: '92%', md: '100%' },
            backgroundColor: theme.palette.background.paper,
            backgroundImage: 'none',
          },
        }}
      >
        {drawerItem && (
          <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{
                p: 2,
                borderBottom: `1px solid ${theme.palette.divider}`,
              }}
            >
              <Stack spacing={0.5} sx={{ minWidth: 0, flexGrow: 1 }}>
                <Stack direction="row" spacing={1} alignItems="center">
                  <Typography variant="h4" noWrap>
                    {drawerItem ? getRowName(drawerItem) : ''}
                  </Typography>
                  <ProvenanceChip value={drawerItem?.provenance} />
                </Stack>
                {extraActions && (
                  <Stack direction="row" spacing={1}>
                    {extraActions(drawerItem)}
                  </Stack>
                )}
              </Stack>
              <Stack direction="row" spacing={0.5}>
                {editable(drawerItem) && (
                  <Tooltip title="Edit" arrow>
                    <IconButton onClick={() => startEdit(drawerItem)} size="small">
                      <Edit />
                    </IconButton>
                  </Tooltip>
                )}
                {deletable(drawerItem) && (
                  <Tooltip title="Delete" arrow>
                    <IconButton
                      onClick={() => setConfirmDelete(true)}
                      size="small"
                      color="error"
                    >
                      <Delete />
                    </IconButton>
                  </Tooltip>
                )}
                <Tooltip title="Close" arrow>
                  <IconButton onClick={closeDrawer} size="small">
                    <Close />
                  </IconButton>
                </Tooltip>
              </Stack>
            </Stack>
            <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
              {mineCheck(drawerItem) && (
                <Alert
                  severity="success"
                  icon={false}
                  sx={{
                    mb: 2,
                    backgroundColor: alpha(theme.palette.success.main, 0.1),
                    color: theme.palette.success.main,
                    border: `1px solid ${alpha(theme.palette.success.main, 0.3)}`,
                    fontWeight: 500,
                  }}
                >
                  You created this. Edit or delete it from the header buttons.
                </Alert>
              )}
              <DetailCard
                item={drawerItem}
                canEdit={editable(drawerItem)}
              />
            </Box>
          </Box>
        )}
      </Drawer>

      <FormDialog
        open={editor !== null}
        title={
          editor?.id === undefined
            ? `New ${itemName}`
            : `Edit ${editor ? getRowName(editor.draft) : ''}`
        }
        onClose={() => setEditor(null)}
        onSave={onSave}
      >
        {editor && (
          <Editor
            initial={editor.draft}
            onChange={onDraftChange}
          />
        )}
      </FormDialog>

      {/* Delete confirm */}
      <Dialog
        open={confirmDelete}
        onClose={() => !deleting && setConfirmDelete(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Delete?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            This will permanently delete &quot;{drawerItem ? getRowName(drawerItem) : ''}&quot;.
            This cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDelete(false)} disabled={deleting}>
            Cancel
          </Button>
          <Button
            color="error"
            variant="contained"
            onClick={onConfirmDelete}
            disabled={deleting}
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
