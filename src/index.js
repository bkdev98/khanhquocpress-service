import express from 'express';
import bodyParser from 'body-parser';
import axios from 'axios';
import qs from 'qs';
import fetch from 'node-fetch';
import cors from 'cors';

import configs from './config.json';

const app = express();

const { client_id, client_secret, rescuetime_key, refresh_token } = configs;

const redirect_uri = process.env.NODE_ENV === 'dev'
  ? 'http://localhost:1221/callback'
  : 'https://api.khanhquoc.press/callback';

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cors());

app.get('/login', function(req, res) {
  var scopes = 'user-read-recently-played';
  return res.redirect('https://accounts.spotify.com/authorize' +
    '?response_type=code' +
    '&client_id=' + client_id +
    (scopes ? '&scope=' + encodeURIComponent(scopes) : '') +
    '&redirect_uri=' + encodeURIComponent(redirect_uri));
});

app.get('/callback', (req, res) => {
  return res.status(200).json(req.query);
});

app.get('/activities', async (req, res) => {
  try {
    const result = await axios.get('https://www.rescuetime.com/anapi/data', {
      params: {
        key: rescuetime_key,
        format: 'json',
      },
    });
    if (result.status === 200) {
      let categories = [];
      result.data.rows.forEach(item => {
        const cateIdx = categories.findIndex(i => i.category === item[4]);
        if (cateIdx > -1) {
          categories[cateIdx].activities.push(item[3]);
          categories[cateIdx].time += item[1];
        } else {
          categories.push({
            category: item[4],
            activities: [item[3]],
            time: item[1],
          });
        }
      });
      categories = categories
        .sort((a, b) => {
          if (a.time > b.time) return -1;
          return 1;
        })
        .filter(i => i.category !== 'Uncategorized');
      return res.status(200).json(categories.slice(0, 5));
    }
    return res.sendStatus(result.status);
  } catch (error) {
    return res.sendStatus(400);
  }
});

app.get('/tracks', async (req, res) => {
  try {
    //  Refresh Token
    const formData = {
      grant_type: 'refresh_token',
      refresh_token,
      client_id,
      client_secret,
    };
    const formBody = Object.keys(formData).map(key => encodeURIComponent(key) + '=' + encodeURIComponent(formData[key])).join('&');
    const tokenResult = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: formBody,
    });
    const { access_token } = await tokenResult.json();
    //  Perform Get Tracks
    if (tokenResult.status === 200) {
      const result = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
        params: {
          type: 'track',
          limit: 5,
        },
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${access_token}`,
        }
      });
      //  Convert To Frontend Format
      const tracks = result.data.items.map(item => ({
        artist: item.track.artists[0].name,
        key: item.track.id,
        link: item.track.external_urls.spotify,
        thumbs: {
          alt: item.track.album.images[0].url,
          yt: item.track.album.images[0].url,
        },
        timestamp: {
          uts: new Date(item.played_at).getTime(),
        },
        title: item.track.name,
      }));
      return res.status(200).json(tracks);
    }
    return res.sendStatus(401);
  } catch (error) {
    return res.sendStatus(400);
  }
});

app.listen(1221, err => {
  if (!err) {
    console.log("Server is up")
  } else {
    console.log(err)
  }
})
