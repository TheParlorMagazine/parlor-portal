module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const { threadId } = req.query;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });
    const filter = encodeURIComponent(`{Thread ID}="${threadId}"`);
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Replies?filterByFormula=${filter}&sort[0][field]=Created At&sort[0][direction]=asc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { threadId, body, authorName, authorMemberId, authorType, parentReplyId } = req.body;
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Replies`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              'Thread ID': threadId,
              Body: body,
              'Author Name': authorName,
              'Author Member ID': authorMemberId,
              'Author Type': authorType || 'member',
              'Upvote Count': 0,
              'Parent Reply ID': parentReplyId || '',
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
