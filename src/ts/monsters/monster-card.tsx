import React, { FC } from 'react';
import {
  Card,
  CardContent,
  CardMedia,
  Container,
  Divider,
  Stack,
  Typography,
} from '@mui/material';
import { Monster, resolveImgUrl } from '../types/Monster';

const MonsterCard: FC<{ monster: Monster }> = ({ monster }) => {
  const statsA = [
    { key: 'STR', value: `${monster.STR} ${monster.STR_mod}` },
    { key: 'DEX', value: `${monster.DEX} ${monster.DEX_mod}` },
    { key: 'CON', value: `${monster.CON} ${monster.CON_mod}` },
  ];

  const statsB = [
    { key: 'INT', value: `${monster.INT} ${monster.INT_mod}` },
    { key: 'WIS', value: `${monster.WIS} ${monster.WIS_mod}` },
    { key: 'CHA', value: `${monster.CHA} ${monster.CHA_mod}` },
  ];

  return (
    <Card sx={{ m: 2 }}>
      <CardContent>
        <Stack direction="column">
          <Typography variant="h4">{monster.name}</Typography>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1">{monster.meta}</Typography>
            <Typography variant="subtitle1">{monster.Challenge}</Typography>
          </Stack>
          <Divider
            orientation="horizontal"
            sx={{ marginTop: 1, marginBottom: 2 }}
          />
          {monster.description && (
            <Container sx={{ marginBottom: 2 }}>
              <td dangerouslySetInnerHTML={{ __html: monster.description }} />
            </Container>
          )}
          <Container sx={{ marginBottom: 2 }}>
            <Stack
              direction="row"
              justifyContent="space-between"
              alignItems="center"
            >
              <CardMedia
                component="img"
                src={resolveImgUrl(monster.img_url)}
                sx={{
                  width: '50%',
                  aspectRatio: '1/1',
                  objectFit: 'contain',
                  backgroundColor: 'secondary',
                }}
              />
              <Stack
                direction="column"
                justifyContent="center"
                alignItems="center"
                width="45%"
                height="100%"
              >
                <Typography variant="subtitle1">{`HP: ${monster.HP}`}</Typography>
                <Typography
                  variant="subtitle1"
                  marginBottom={2}
                >{`AC: ${monster.AC}`}</Typography>
                {[statsA, statsB].map((stats) => (
                  <Stack
                    spacing={2}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                  >
                    {stats.map(({ key, value }) => (
                      <Stack direction="column" alignItems="center">
                        <Typography variant="h6">{key}</Typography>
                        <Typography variant="subtitle1">{value}</Typography>
                      </Stack>
                    ))}
                  </Stack>
                ))}
                <Typography variant="subtitle1" marginTop={2}>
                  {monster.Speed}
                </Typography>
                <Typography variant="subtitle1">{monster.Senses}</Typography>
                <Typography variant="subtitle1">{monster.Languages}</Typography>
                <Typography variant="subtitle1">
                  {monster.Saving_Throws}
                </Typography>
                <Typography variant="subtitle1">{monster.Skills}</Typography>
              </Stack>
            </Stack>
          </Container>
          {monster.Actions && (
            <Container>
              <Divider orientation="horizontal" sx={{ margin: 1 }} />
              <Typography variant="h5">Actions</Typography>
              <td dangerouslySetInnerHTML={{ __html: monster.Actions }} />
            </Container>
          )}
          {monster.Legendary_Actions && (
            <Container>
              <Divider orientation="horizontal" sx={{ margin: 1 }} />
              <Typography variant="h5">Legendary Actions</Typography>
              <td
                dangerouslySetInnerHTML={{
                  __html: monster.Legendary_Actions,
                }}
              />
            </Container>
          )}
          {monster.Lair_Actions && (
            <Container>
              <Divider orientation="horizontal" sx={{ margin: 1 }} />
              <Typography variant="h5">Lair Actions</Typography>
              <td dangerouslySetInnerHTML={{ __html: monster.Lair_Actions }} />
            </Container>
          )}
          {monster.Regional_Effects && (
            <Container>
              <Divider orientation="horizontal" sx={{ margin: 1 }} />
              <Typography variant="h5">Regional Effects</Typography>
              <td
                dangerouslySetInnerHTML={{
                  __html: monster.Regional_Effects,
                }}
              />
            </Container>
          )}
          {monster.Traits && (
            <Container>
              <Divider orientation="horizontal" sx={{ margin: 1 }} />
              <Typography variant="h5">Traits</Typography>
              <td dangerouslySetInnerHTML={{ __html: monster.Traits }} />
            </Container>
          )}
        </Stack>
      </CardContent>
    </Card>
  );
};

export default MonsterCard;
