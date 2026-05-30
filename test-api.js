const http = require('http');

http.get('http://localhost:3000/api/fomo/youtube-showcase?channel=https://www.youtube.com/@EnderVerseMC&limit=3&cursor=1', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    try {
      const parsed = JSON.parse(data);
      console.log('Mode:', parsed.mode);
      console.log('Count:', parsed.showcases ? parsed.showcases.length : 0);
      if (parsed.showcases) {
        parsed.showcases.forEach((s, i) => console.log(`Video ${i+1}: ${s.title}`));
      }
    } catch (e) {
      console.error('JSON parse error:', e);
      console.log('Raw data:', data);
    }
  });
}).on('error', (err) => {
  console.error('Request error:', err);
});
