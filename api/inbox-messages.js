module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const { threadId } = req.query;
    if (!threadId) return res.status(400).json({ error: 'threadId required' });
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Inbox%20Messages?filterByFormula=${encodeURIComponent(`FIND("${threadId}", {Thread})`)}&sort[0][field]=Timestamp&sort[0][direction]=asc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
  console.log('Received threadId:', req.body.threadId, typeof req.body.threadId);
  const { threadId, senderType, senderName, senderId, body } = req.body;
  const now = new Date().toISOString();

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
              'Thread': [threadId],
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
    const msgData = await msgResponse.json();
    console.log('Message POST result:', JSON.stringify(msgData));

    try {
      const patchRes = await fetch(
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
      const patchData = await patchRes.json();
      console.log('Thread PATCH result:', JSON.stringify(patchData));
    } catch (e) {
      console.error('Thread PATCH failed:', e.message);
    }

    return res.status(200).json(msgData);
  }

  res.status(405).end();
};
