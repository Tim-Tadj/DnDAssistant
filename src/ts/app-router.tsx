import React from 'react';
import { RouterProvider, createHashRouter } from 'react-router-dom';
import AppLayout from './AppLayout';
import MonsterTable from './monsters/monster-table';
import EncounterPage from './encounters/encounter-page';
import Mechanics from './mechanics/mechanics';
import SpellTable from './spells/spell-table';
import Shop from './gear/gear';
import CampaignManager from './campaigns/campaign-manager';
import CharactersTable from './characters/characters-table';

const AppRouter = () => {
  const router = createHashRouter([
    {
      path: '/*',
      element: <AppLayout />,
      children: [
        { path: '', element: <Mechanics /> },
        { path: 'monsters', element: <MonsterTable /> },
        { path: 'spells', element: <SpellTable /> },
        { path: 'gear', element: <Shop /> },
        { path: 'encounter', element: <EncounterPage /> },
        { path: 'characters', element: <CharactersTable /> },
        { path: 'campaign', element: <CampaignManager /> },
      ],
    },
  ]);

  return <RouterProvider router={router} />;
};

export default AppRouter;
