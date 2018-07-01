const { CLIENT_ID, CLIENT_SECRET, RESCUETIME_KEY } = process.env;

if (!CLIENT_ID || !CLIENT_SECRET || !RESCUETIME_KEY) {
  console.log('🛑 Missing environment variables!');
}

export default {
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  rescuetime_key: process.env.RESCUETIME_KEY
}