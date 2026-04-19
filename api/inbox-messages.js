module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  // GET — fetch all messages for a thread
  if (req.method === 'GET') {
    const { threadId } = req.query;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });

    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Messages?filterByFormula=${encodeURIComponent(`{Thread ID}="${threadId}"`)}&sort[0][field]=Timestamp&sort[0][direction]=asc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  // POST — add a message to a thread
  if (req.method === 'POST') {
    const { threadId, senderType, senderName, senderId, body } = req.body;
    const now = new Date().toISOString();

    // Add the message
    const msgResponse = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Messages`,
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
              'Sender Type': senderType,
              'Sender Name': senderName,
              'Sender ID': senderId || '',
              'Body': body,
              'Timestamp': now,
              'Read': false,
            }
          }]
        }),
      }
    );

    // Update thread's last message preview + date
    await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Threads/${threadId}`,
      {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          fields: {
            'Last Message Preview': body.substring(0, 100),
            'Last Message Date': now,
            'Status': senderType === 'Admin' ? 'Replied' : 'Unread',
          }
        }),
      }
    );

    const data = await msgResponse.json();
    return res.status(200).json(data);
  }

  res.status(405).end();
};
