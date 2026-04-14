module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const { memberId } = req.query;
  if (!memberId) return res.status(400).json({ error: 'memberId required' });

  const now = new Date().toISOString();
  const filter = `AND({MemberId}="${memberId}",IS_AFTER({ExpiresAt},"${now}"))`;

  const response = await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Notifications?filterByFormula=${encodeURIComponent(filter)}&sort[0][field]=CreatedAt&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
  );

  const data = await response.json();
  res.status(200).json(data);
};
