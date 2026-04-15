module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  if (req.query.slug) {
    // Fetch single item by slug — used by the Wix article embed
    const filter = encodeURIComponent(`AND({Slug}="${req.query.slug}",{Published}=1)`);
    const response = await fetch(
      `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Library?filterByFormula=${filter}`,
      { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }

  // Fetch all published items — used by the portal library grid
  const filter = encodeURIComponent(`{Published}=1`);
  const response = await fetch(
    `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}/Library?filterByFormula=${filter}&sort[0][field]=Date Published&sort[0][direction]=desc`,
    { headers: { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` } }
  );
  const data = await response.json();
  res.status(200).json(data);
};
