const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID;
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/Upvotes`;

const headers = {
  'Authorization': `Bearer ${AIRTABLE_API_KEY}`,
  'Content-Type': 'application/json',
};

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  if (req.method === 'OPTIONS') {
    return res.status(200).set(cors).end();
  }

  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  // GET — check if member has upvoted an item
  // ?memberId=xxx&itemId=yyy
  if (req.method === 'GET') {
    const { memberId, itemId } = req.query;
    if (!memberId || !itemId) {
      return res.status(400).json({ error: 'memberId and itemId required' });
    }
    try {
      const formula = encodeURIComponent(
        `AND({Member ID}="${memberId}", {Item ID}="${itemId}")`
      );
      const r = await fetch(`${AIRTABLE_URL}?filterByFormula=${formula}`, { headers });
      const data = await r.json();
      const record = data.records?.[0] || null;
      return res.status(200).json({ upvoted: !!record, recordId: record?.id || null });
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // POST — add an upvote
  if (req.method === 'POST') {
    const { memberId, itemId, itemType } = req.body;
    if (!memberId || !itemId || !itemType) {
      return res.status(400).json({ error: 'memberId, itemId, itemType required' });
    }
    try {
      const r = await fetch(AIRTABLE_URL, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          records: [{
            fields: {
              'Member ID': memberId,
              'Item ID': itemId,
              'Item Type': itemType,
            }
          }]
        })
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  // DELETE — remove an upvote by record ID
  if (req.method === 'DELETE') {
    const { recordId } = req.body;
    if (!recordId) {
      return res.status(400).json({ error: 'recordId required' });
    }
    try {
      const r = await fetch(`${AIRTABLE_URL}/${recordId}`, {
        method: 'DELETE',
        headers,
      });
      const data = await r.json();
      return res.status(200).json(data);
    } catch (e) {
      return res.status(500).json({ error: e.message });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
