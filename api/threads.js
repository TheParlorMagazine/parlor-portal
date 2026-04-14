module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.method === 'GET') {
    const filter = encodeURIComponent(`{Published}=1`);
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Threads?filterByFormula=${filter}&sort[0][field]=Created at&sort[0][direction]=desc`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  if (req.method === 'POST') {
    const { title, body, authorName, authorMemberId, authorType, category, linkedLibraryItem } = req.body;
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Threads`,
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          records: [{
            fields: {
              Title: title,
              Body: body,
              'Author Name': authorName,
              'Author Member ID': authorMemberId,
              'Author Type': authorType || 'member',
              Category: category,
              'Linked Library Item': linkedLibraryItem || '',
              'Upvote Count': 0,
              'Reply Count': 0,
              Published: true,
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
