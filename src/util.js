import fetch from 'node-fetch';
import axios from 'axios';
import fs from 'fs';

import configs from './config.js';
import tokenData from './token.json';

const { client_id, client_secret, rescuetime_key } = configs;
const { access_token, refresh_token, timestamp } = tokenData;

const redirect_uri = process.env.NODE_ENV === 'dev'
  ? 'http://localhost:1221/callback'
  : 'https://api.khanhquoc.press/callback';

const saveDir = process.env.NODE_ENV === 'dev'
  ? './src/token.json'
  : './token.json';

export const getFormBody = formData => Object.keys(formData).map(key =>
  encodeURIComponent(key) + '=' + encodeURIComponent(formData[key])).join('&');

export const getSpotifyAccessToken = async code => {
  try {
    const formData = {
      grant_type: 'authorization_code',
      code,
      client_id,
      client_secret,
      redirect_uri,
    };
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: getFormBody(formData),
    });
    let rs = await result.json();
    rs.timestamp = Date.now();
    fs.writeFileSync(saveDir, JSON.stringify(rs, null, 2) , 'utf-8');
    console.log('Gotcha token');
    return rs;
  } catch (error) {
    throw error;
  }
}

export const refreshSpotifyToken = async token => {
  try {
    const formData = {
      grant_type: 'refresh_token',
      refresh_token: token,
      client_id,
      client_secret,
    };
    const result = await fetch('https://accounts.spotify.com/api/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: getFormBody(formData),
    });
    const rs = await result.json();
    rs.timestamp = Date.now();
    rs.refresh_token = token;
    fs.writeFileSync(saveDir, JSON.stringify(rs, null, 2) , 'utf-8');
    console.log('Refreshed token');
    return rs;
  } catch (error) {
    throw error;
  }
}

export const getCurrentlyPlayingTrack = async access_token => {
  try {
    let track = null;
    const result = await axios.get('https://api.spotify.com/v1/me/player/currently-playing', {
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      }
    });

    if (result.status === 200) {
      const { item } = result.data;
      track = {
        artist: item.artists[0].name,
        key: item.id,
        link: item.external_urls.spotify,
        thumbs: {
          alt: item.album.images[0].url,
          yt: item.album.images[0].url,
        },
        timestamp: {
          nowplaying: true,
        },
        title: item.name,
      };
    }
    return track;
  } catch (error) {
    throw error;
  }
}

export const getRecentlyPlayedTrack = async (access_token, limit) => {
  try {
    let tracks = [];
    const result = await axios.get('https://api.spotify.com/v1/me/player/recently-played', {
      params: {
        type: 'track',
        limit,
      },
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${access_token}`,
      }
    });
    if (result.status === 200) {
      tracks = result.data.items.map(item => ({
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
    }
    return tracks;
  } catch (error) {
    throw error;
  }
}

export const getTracks = async () => {
  try {
    let limit = 4;
    let token = access_token;
    if (!access_token || !refresh_token) {
      throw new Error();
    }
    if (timestamp + (3600 * 1000) < Date.now()) {
      const tokenResult = await refreshSpotifyToken(refresh_token);
      token = tokenResult.access_token;
    }
    //  Perform Get Tracks
    const currentlyTrack = await getCurrentlyPlayingTrack(token);
    if (!currentlyTrack) {
      limit = 5;
    }
    const recentlyTracks = await getRecentlyPlayedTrack(token, limit);
    return [currentlyTrack, ...recentlyTracks];
  } catch (error) {
    throw error;
  }
}

export const getCategories = async () => {
  try {
    let categories = [];
    const result = await axios.get('https://www.rescuetime.com/anapi/data', {
      params: {
        key: rescuetime_key,
        format: 'json',
      },
    });
    if (result.status === 200) {
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
    }
    return categories.slice(0, 5);
  } catch (error) {
    throw error;
  }
}