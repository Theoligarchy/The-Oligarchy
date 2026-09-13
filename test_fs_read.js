const fs = require('fs');
const cfg = JSON.parse(fs.readFileSync('firebase-applet-config.json'));
const url = `https://firestore.googleapis.com/v1/projects/${cfg.projectId}/databases/${cfg.firestoreDatabaseId || 'default'}/documents/articles?pageSize=2&key=${cfg.apiKey}`;
fetch(url).then(r => r.json()).then(d => {
  console.log('Articles test:', d.documents ? d.documents.length : d);
}).catch(console.error);
