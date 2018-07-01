import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import qs from 'qs';
import fetch from 'node-fetch';
import cors from 'cors';

import './env';
import configs from './config.js';
import { getTracks, getCategories, getSpotifyAccessToken } from './util';

const app = express();
const { client_id } = configs;
const port = process.env.PORT || 1221;
const redirect_uri = process.env.NODE_ENV === 'dev'
  ? 'http://localhost:1221/callback'
  : 'https://api.khanhquoc.press/callback';
const corsOptions = process.env.NODE_ENV === 'dev'
  ? true
  : {
    origin: function (origin, callback) {
      if (['https://khanhquoc.press'].indexOf(origin) !== -1) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    }
  };

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

app.use(cors(corsOptions));

app.get('/login', function(req, res) {
  var scopes = 'user-read-recently-played user-read-currently-playing';
  return res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + client_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

app.get('/callback', async (req, res) => {
  try {
    const token = await getSpotifyAccessToken(req.query.code);

    return res.status(200).json(token);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
});

app.get('/activities', async (req, res) => {
  try {
    const categories = await getCategories();

    return res.status(200).json(categories);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
});

app.get('/tracks', async (req, res) => {
  try {
    const tracks = await getTracks();

    return res.status(200).json(tracks);
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
});

app.get('/', async (req, res) => {
  try {
    const tracks = await getTracks();
    const categories = await getCategories();

    return res.status(200).json({ tracks, categories });
  } catch (error) {
    console.error(error);
    return res.sendStatus(400);
  }
});

app.listen(port, err => {
  if (!err) {
    console.log(`Server is up on port ${port} 🌸`)
  } else {
    console.log(err);
  }
});
