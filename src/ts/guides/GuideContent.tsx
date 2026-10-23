// Renders a parsed guide (see guideModel) as a readable article:
// headings with anchors and badges, paragraphs, lists, skill chips and
// rule tables. Text is inserted exactly as it is in the JSON.

import React, { FC, Fragment } from 'react';
import {
  Box,
  Chip,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import { Link as LinkIcon } from '@mui/icons-material';
import { Block, Guide, GuideId, GuideNode, Section, plain } from './guideModel';
import { GUIDE_VISUALS, headingBadge } from './guideVisuals';

// DOM id of a section's heading.
export const sectionDomId = (id: string) => `guide-${id}`;

export const sectionHref = (guide: GuideId, id: string) => `#/?guide=${guide}&section=${encodeURIComponent(id)}`;

const HTML: FC<{ html: string; component?: React.ElementType }> = ({ html, component = 'span' }) => (
  <Box component={component} dangerouslySetInnerHTML={{ __html: html }} />
);

const TextBlock: FC<{ block: Block; color: string }> = ({ block, color }) => {
  const theme = useTheme();
  switch (block.kind) {
    case 'text':
      return <HTML component="p" html={block.html} />;
    case 'list': {
      // Lots of short items ("open or close a door"): columns, not a tall strip.
      const columns = block.items.length >= 8 && block.items.every((i) => plain(i).length <= 60);
      return (
        <Box
          component="ul"
          sx={{
            pl: 2.5,
            my: 1.25,
            '& li': { mb: 0.5, pl: 0.5, breakInside: 'avoid' },
            '& li::marker': { color, content: '"◆  "', fontSize: '0.7em' },
            ...(columns && { columnCount: { xs: 1, sm: 2, lg: 3 }, columnGap: 4 }),
          }}
        >
          {block.items.map((item, i) => (
            <HTML key={i} component="li" html={item} />
          ))}
        </Box>
      );
    }
    case 'chips':
      return (
        <Stack direction="row" flexWrap="wrap" useFlexGap spacing={0.75} sx={{ my: 1.25 }}>
          {block.items.map((item, i) => (
            <Chip
              key={i}
              size="small"
              label={<HTML html={item} />}
              sx={{ bgcolor: alpha(color, 0.14), color: 'text.primary', border: `1px solid ${alpha(color, 0.4)}` }}
            />
          ))}
        </Stack>
      );
    case 'table':
      return (
        <TableContainer
          sx={{
            my: 2,
            border: `1px solid ${theme.palette.divider}`,
            borderRadius: 1.5,
            maxWidth: '100%',
            width: 'fit-content',
            minWidth: { sm: 320 },
          }}
        >
          <Table size="small">
            <TableHead>
              <TableRow>
                {block.columns.map((c, i) => (
                  <TableCell
                    key={i}
                    sx={{
                      bgcolor: alpha(color, 0.14),
                      fontWeight: 700,
                      fontSize: '0.78rem',
                      letterSpacing: '0.04em',
                      whiteSpace: 'nowrap',
                      borderBottomColor: alpha(color, 0.4),
                    }}
                  >
                    <HTML html={c} />
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {block.rows.map((row, r) => (
                <TableRow key={r} sx={{ '&:nth-of-type(even)': { bgcolor: alpha(theme.palette.text.primary, 0.03) } }}>
                  {row.map((cell, c) => (
                    <TableCell
                      key={c}
                      sx={{
                        fontSize: '0.85rem',
                        verticalAlign: 'top',
                        ...(c === 0 && { fontWeight: 600, whiteSpace: 'nowrap' }),
                      }}
                    >
                      <HTML html={cell} />
                    </TableCell>
                  ))}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      );
  }
};

// Heading sizes by depth: the top level reads like a chapter, the rest
// step down to small bold run-in style headings.
const HEADINGS = [
  { tag: 'h2', badge: 34, sx: { fontFamily: '"Cinzel", serif', fontSize: '1.55rem', fontWeight: 700, mt: 5, pb: 1 } },
  { tag: 'h3', badge: 28, sx: { fontFamily: '"Cinzel", serif', fontSize: '1.2rem', fontWeight: 700, mt: 3.5 } },
  { tag: 'h4', badge: 24, sx: { fontSize: '1.02rem', fontWeight: 700, mt: 2.5 } },
  { tag: 'h5', badge: 0, sx: { fontSize: '0.95rem', fontWeight: 700, mt: 2 } },
  { tag: 'h6', badge: 0, sx: { fontSize: '0.9rem', fontWeight: 700, fontStyle: 'italic', mt: 1.75 } },
];

const SectionHeading: FC<{ section: Section; color: string }> = ({ section, color }) => {
  const theme = useTheme();
  const h = HEADINGS[Math.min(section.level, HEADINGS.length - 1)];
  const badge = h.badge ? headingBadge(section.guide, section.title, h.badge) : null;
  return (
    <Stack
      direction="row"
      alignItems="center"
      spacing={1.25}
      id={sectionDomId(section.id)}
      data-toc={section.level <= 1 ? section.level : undefined}
      sx={{
        // The page raises this while its sticky search bar is showing.
        scrollMarginTop: 'var(--guide-scroll-offset, 72px)',
        mb: 1,
        ...h.sx,
        ...(section.level === 0 && { borderBottom: `1px solid ${alpha(color, 0.35)}` }),
        '&:hover .guide-anchor': { opacity: 1 },
        '&.guide-flash': { animation: 'guideFlash 1.6s ease-out' },
        '@keyframes guideFlash': {
          from: { backgroundColor: alpha(theme.palette.primary.main, 0.25) },
          to: { backgroundColor: 'transparent' },
        },
      }}
    >
      {badge}
      <Typography
        component={h.tag as React.ElementType}
        sx={{
          font: 'inherit',
          color: section.level === 1 ? 'primary.main' : 'text.primary',
          m: 0,
          minWidth: 0,
        }}
      >
        {section.title}
      </Typography>
      <Box
        component="a"
        className="guide-anchor"
        href={sectionHref(section.guide, section.id)}
        aria-label={`Link to ${section.title}`}
        sx={{ opacity: 0, color: 'text.secondary', display: 'flex', transition: 'opacity 120ms', '&:focus-visible': { opacity: 1 } }}
      >
        <LinkIcon sx={{ fontSize: '1rem' }} />
      </Box>
    </Stack>
  );
};

const SectionView: FC<{ section: Section; color: string; card?: boolean }> = ({ section, color, card }) => {
  const theme = useTheme();
  return (
    <Box
      component="section"
      sx={
        card
          ? {
              breakInside: 'avoid',
              mb: 2,
              p: 2,
              pt: 0.5,
              border: `1px solid ${theme.palette.divider}`,
              borderLeft: `3px solid ${color}`,
              borderRadius: 1.5,
              bgcolor: alpha(theme.palette.background.paper, 0.6),
              '& > :first-of-type': { mt: 1.5, borderBottom: 'none' },
            }
          : undefined
      }
    >
      <SectionHeading section={section} color={color} />
      <GuideNodes nodes={section.nodes} color={color} />
    </Box>
  );
};

export const GuideNodes: FC<{ nodes: GuideNode[]; color: string; cards?: boolean }> = ({ nodes, color, cards }) => {
  // With `cards`, runs of sections sit in a two-column card grid.
  const groups: GuideNode[][] = [];
  nodes.forEach((n, i) => {
    const join = cards && n.kind === 'section' && nodes[i - 1]?.kind === 'section';
    if (join) groups[groups.length - 1].push(n);
    else groups.push([n]);
  });
  return (
    <>
      {groups.map((group, g) => {
        const items = group.map((n, i) =>
          n.kind === 'section' ? (
            <SectionView key={n.section.id} section={n.section} color={color} card={cards} />
          ) : (
            <TextBlock key={i} block={n} color={color} />
          ),
        );
        return cards && group[0].kind === 'section' ? (
          <Box key={g} sx={{ columnCount: { xs: 1, lg: 2 }, columnGap: 2, mt: 2 }}>
            {items}
          </Box>
        ) : (
          <Fragment key={g}>{items}</Fragment>
        );
      })}
    </>
  );
};

// Body typography shared by the article and the search preview.
export const proseSx = (color: string) => ({
  fontSize: '1rem',
  lineHeight: 1.7,
  color: 'text.primary',
  '& p': { m: '0 0 0.85em' },
  '& strong': { fontWeight: 700 },
  // Run-in leads: "<strong>Determine surprise.</strong> The GM …"
  '& p > strong:first-of-type, & li > strong:first-of-type': { color },
  '& em': { fontStyle: 'italic' },
});

export const GuideArticle = React.forwardRef<HTMLDivElement, { guide: Guide }>(({ guide }, ref) => {
  const { color } = GUIDE_VISUALS[guide.id];
  return (
    <Box ref={ref} sx={{ ...proseSx(color), maxWidth: 820 }}>
      <GuideNodes nodes={guide.nodes} color={color} cards={guide.id === 'conditions'} />
    </Box>
  );
});
GuideArticle.displayName = 'GuideArticle';

// One section on its own (the global search preview).
export const GuideSectionView: FC<{ section: Section }> = ({ section }) => {
  const { color } = GUIDE_VISUALS[section.guide];
  return (
    <Box sx={{ ...proseSx(color), fontSize: '0.92rem', '& h2, & h3': { mt: 0 } }}>
      <SectionView section={{ ...section, level: Math.min(section.level, 1) }} color={color} />
    </Box>
  );
};
