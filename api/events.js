module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  const filter = encodeURIComponent(`{Published}=1`);
  const response = await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Events?filterByFormula=${filter}&sort[0][field]=Date&sort[0][direction]=asc`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
  );
  const data = await response.json();
  res.status(200).json(data);
};
