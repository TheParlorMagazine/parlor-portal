module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const { memberId } = req.query;
    if (!memberId) return res.status(400).json({ error: 'memberId required' });

    const filter = `OR({ToMemberId}="${memberId}",{ToMemberId}="all")`;
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox?filterByFormula=${encodeURIComponent(filter)}&sort[0][field]=SentAt&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { fromMemberId, fromName, toMemberId, subject, body } = req.body;
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              FromMemberId: fromMemberId,
              FromName: fromName,
              ToMemberId: toMemberId,
              Subject: subject,
              Body: body,
              SentAt: new Date().toISOString(),
              Read: false,
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
