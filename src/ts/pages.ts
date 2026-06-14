/**
 * Defines the default pages
 * @author Lachlan Charteris
 */

export type Page = {
  label: string;
  name: string;
  path: string | Page[];
};

const pages: Page[] = [
  { label: 'guides', name: 'Player Guides', path: '/' },
  {
    label: 'resources',
    name: 'Resources',
    path: [
      { label: 'monsters', name: 'Monsters', path: '/monsters' },
      { label: 'spells', name: 'Spells', path: '/spells' },
      { label: 'shop', name: 'Gear', path: '/gear' },
    ],
  },
  { label: 'characters', name: 'Characters', path: '/characters' },
  { label: 'encounter', name: 'Encounters', path: '/encounter' },
  { label: 'campaign', name: 'Campaign', path: '/campaign' },
];

export { pages };
