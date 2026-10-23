// Virtualized table for EntityBrowser. It takes the DataGrid column
// definitions the pages already have (field, headerName, flex/width,
// align, sortable, renderCell) but renders a plain MUI Table through
// react-virtuoso: the whole list scrolls with the page (no pages),
// only the rows on screen are in the DOM, and the header sticks under
// the app bar (AppLayout publishes its height as --app-bar-height).

import React, { forwardRef, HTMLAttributes, KeyboardEvent, TableHTMLAttributes, useMemo, useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  alpha,
  useMediaQuery,
  useTheme,
} from '@mui/material';
import { GridColDef, GridRenderCellParams } from '@mui/x-data-grid';
import { ItemProps, TableComponents, TableVirtuoso } from 'react-virtuoso';

type Sort = { field: string; dir: 'asc' | 'desc' } | null;

// `compact` (phones/tablets): the table scrolls in its own box, both
// ways, instead of with the page, so wide columns don't get crushed.
type RowContext = { onRowClick: (row: unknown) => void; compact: boolean };
type WithContext<P> = P & { context: RowContext };

// Numeric-aware, so "2 (450 XP)" sorts before "10 (5,900 XP)".
const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });
const isBlank = (v: unknown) => v === null || v === undefined || v === '';
const compareValues = (a: unknown, b: unknown) =>
  typeof a === 'number' && typeof b === 'number' ? a - b : collator.compare(String(a), String(b));

const valueOf = (row: unknown, field: string) => (row as Record<string, unknown> | null)?.[field];

// Declared once so virtuoso doesn't remount rows on every render.
const Scroller = forwardRef<HTMLDivElement, WithContext<HTMLAttributes<HTMLDivElement>>>(function Scroller(
  { context, style, ...props },
  ref,
) {
  return <div {...props} ref={ref} style={context.compact ? { ...style, overflowX: 'auto' } : style} />;
});

function VirtualTable({ context, ...props }: WithContext<TableHTMLAttributes<HTMLTableElement>>) {
  return (
    <Table
      {...props}
      size="small"
      sx={{ tableLayout: 'fixed', borderCollapse: 'separate', width: '100%', minWidth: context.compact ? 720 : 0 }}
    />
  );
}

const StickyHead = forwardRef<HTMLTableSectionElement, WithContext<HTMLAttributes<HTMLTableSectionElement>>>(
  function StickyHead({ context, style, ...props }, ref) {
    const top = context.compact ? 0 : 'var(--app-bar-height, 56px)';
    return <TableHead {...props} ref={ref} style={{ ...style, top }} />;
  },
);

const Body = forwardRef<HTMLTableSectionElement, WithContext<HTMLAttributes<HTMLTableSectionElement>>>(function Body(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  { context, ...props },
  ref,
) {
  return <TableBody {...props} ref={ref} />;
});

function ClickableRow({ item, context, ...props }: ItemProps<unknown> & { context?: RowContext }) {
  return (
    <TableRow
      {...props}
      hover
      tabIndex={0}
      onClick={() => context?.onRowClick(item)}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.target !== e.currentTarget) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          context?.onRowClick(item);
        }
      }}
      sx={{ cursor: 'pointer', '&:focus-visible': { outline: 2, outlineColor: 'primary.main', outlineOffset: -2 } }}
    />
  );
}

const components: TableComponents<unknown, RowContext> = {
  Scroller,
  Table: VirtualTable,
  TableHead: StickyHead,
  TableBody: Body,
  TableRow: ClickableRow,
};

type Props<T> = {
  rows: T[];
  columns: GridColDef[];
  getRowId: (row: T) => string | number;
  onRowClick: (row: T) => void;
};

export function EntityTable<T>({ rows, columns, getRowId, onRowClick }: Props<T>) {
  const theme = useTheme();
  const compact = useMediaQuery(theme.breakpoints.down('md'));
  const [sort, setSort] = useState<Sort>(() =>
    columns.some((c) => c.field === 'name') ? { field: 'name', dir: 'asc' } : null,
  );

  // Blanks always go last, whichever way the column is sorted.
  const sorted = useMemo(() => {
    if (!sort) return rows;
    const sign = sort.dir === 'asc' ? 1 : -1;
    // A column's own sortComparator gets just the two values.
    const custom = columns.find((c) => c.field === sort.field)?.sortComparator as
      | ((a: unknown, b: unknown) => number)
      | undefined;
    const compare = custom ?? compareValues;
    return [...rows].sort((a, b) => {
      const va = valueOf(a, sort.field);
      const vb = valueOf(b, sort.field);
      if (isBlank(va) || isBlank(vb)) return Number(isBlank(va)) - Number(isBlank(vb));
      return sign * compare(va, vb);
    });
  }, [rows, sort, columns]);

  // Fixed widths stay as-is; flex columns get percentages, which the
  // fixed table layout scales into whatever is left (it ignores calc()).
  const widthOf = useMemo(() => {
    const totalFlex = columns.reduce((sum, c) => sum + (c.flex ?? 0), 0) || 1;
    return (c: GridColDef) => (c.flex ? `${(c.flex / totalFlex) * 100}%` : `${c.width ?? 100}px`);
  }, [columns]);

  // DataGrid order: ascending, descending, then unsorted.
  const toggleSort = (field: string) =>
    setSort((s) =>
      s?.field !== field ? { field, dir: 'asc' } : s.dir === 'asc' ? { field, dir: 'desc' } : null,
    );

  const headerBg = `linear-gradient(${alpha(theme.palette.primary.main, 0.06)}, ${alpha(
    theme.palette.primary.main,
    0.06,
  )}), ${theme.palette.background.paper}`;

  return (
    <TableVirtuoso
      useWindowScroll={!compact}
      style={compact ? { height: '70vh' } : undefined}
      data={sorted}
      context={{ onRowClick: (row) => onRowClick(row as T), compact }}
      components={components}
      computeItemKey={(_, row) => String(getRowId(row as T))}
      increaseViewportBy={400}
      fixedHeaderContent={() => (
        <TableRow>
          {columns.map((c) => (
            <TableCell
              key={c.field}
              align={c.headerAlign ?? c.align}
              sortDirection={sort?.field === c.field ? sort.dir : false}
              sx={{ width: widthOf(c), px: 1, background: headerBg, fontWeight: 600 }}
            >
              {c.sortable === false || !c.headerName ? (
                c.headerName
              ) : (
                <TableSortLabel
                  active={sort?.field === c.field}
                  direction={sort?.field === c.field ? sort.dir : 'asc'}
                  onClick={() => toggleSort(c.field)}
                >
                  {c.headerName}
                </TableSortLabel>
              )}
            </TableCell>
          ))}
        </TableRow>
      )}
      itemContent={(_, row) =>
        columns.map((c) => {
          const value = valueOf(row, c.field);
          return (
            <TableCell key={c.field} align={c.align} sx={{ px: 1, overflowWrap: 'break-word' }}>
              {c.renderCell
                ? c.renderCell({ value, row, field: c.field, colDef: c } as unknown as GridRenderCellParams)
                : String(value ?? '')}
            </TableCell>
          );
        })
      }
    />
  );
}

export default EntityTable;
