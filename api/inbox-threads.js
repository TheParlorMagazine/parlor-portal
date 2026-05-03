module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // GET — fetch threads for a member (or all threads for admin)
  if (req.method === 'GET') {
    const { memberId, admin } = req.query;
    
    let filter;
    if (admin === 'true') {
      filter = encodeURIComponent(`NOT({Member ID}="")`);
    } else {
      if (!memberId) return res.status(400).json({ error: 'memberId required' });
      filter = encodeURIComponent(`{Member ID}="${memberId}"`);
    }

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Threads?filterByFormula=${filter}&sort[0][field]=Last%20Message%20Date&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  // POST — create a new thread
  if (req.method === 'POST') {
    const { memberId, memberName, subject, firstMessage, initiatedBy } = req.body;
    const now = new Date().toISOString();

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Threads`,
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
              'Member Name': memberName,
              'Subject': subject,
              'Last Message Preview': firstMessage.substring(0, 100),
              'Last Message Date': now,
              'Status': 'Unread',
              'Initiated By': initiatedBy || 'Admin',
              'Member Avatar': req.body.memberAvatar || '',
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
