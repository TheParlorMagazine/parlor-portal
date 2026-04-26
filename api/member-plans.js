const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const TABLE_NAME = 'Member Plans';

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();

  // GET — fetch active plans for a member
  if (req.method === 'GET') {
    const { memberId } = req.query;
    if (!memberId) return res.status(400).json({ error: 'memberId required' });

    try {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}?filterByFormula=AND({Member ID}="${memberId}",{Status}="ACTIVE")`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${AIRTABLE_API_KEY}` }
      });
      const data = await response.json();
      const planIds = (data.records || []).map(r => r.fields['Plan ID']).filter(Boolean);
      return res.status(200).json({ planIds });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — log a new plan purchase
  if (req.method === 'POST') {
    const { memberId, planId, planName, expiresAt } = req.body;
    if (!memberId || !planId) return res.status(400).json({ error: 'memberId and planId required' });

    try {
      const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(TABLE_NAME)}`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Member ID': memberId,
              'Plan ID': planId,
              'Plan Name': planName || '',
              'Status': 'ACTIVE',
              'Purchased At': new Date().toISOString(),
              'Expires At': expiresAt || ''
            }
          }]
        })
      });
      const data = await response.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
