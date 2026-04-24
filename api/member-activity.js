module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
if (req.method === 'OPTIONS') return res.status(200).end();

  if (req.method === 'GET') {
    const { memberId } = req.query;
    if (!memberId) return res.status(400).json({ error: 'memberId required' });
    const filter = encodeURIComponent(`{Member ID}="${memberId}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Member Activity?filterByFormula=${filter}&sort[0][field]=Timestamp&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { memberId, action, itemType, itemId, itemTitle } = req.body;
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Member Activity`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Member ID': memberId,
              Action: action,
              'Item Type': itemType,
              'Item ID': itemId,
              'Item Title': itemTitle,
              Timestamp: new Date().toISOString(),
            }
          }]
        }),
      }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  res.status(405).end();
};
