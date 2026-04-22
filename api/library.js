module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');

  const base = `https://api.airtable.com/v0/${process.env.AIRTABLE_BASE_ID}`;
  const headers = { Authorization: `Bearer ${process.env.AIRTABLE_API_KEY}` };

  if (req.query.recordId) {
  const response = await fetch(
    `${base}/Library/${req.query.recordId}`,
    { headers }
  );
  const record = await response.json();
  return res.status(200).json({ records: [record] });
}
  // Single item by slug
  if (req.query.slug) {
    const filter = encodeURIComponent(`AND({Slug}="${req.query.slug}",{Published}=1)`);
    const response = await fetch(
      `${base}/Library?filterByFormula=${filter}`,
      { headers }
    );
    const data = await response.json();
    return res.status(200).json(data);
  }
if (req.query.month) {
  const filter = encodeURIComponent(
    `AND({Published}=1,{Month}="${req.query.month}")`
  );
  const response = await fetch(
    `${base}/Library?filterByFormula=${filter}&sort[0][field]=Date%20Published&sort[0][direction]=desc`,
    { headers }
  );
  const data = await response.json();
  return res.status(200).json(data);
}
  // Filter by theme record ID
  if (req.query.themeId) {
  const filter = encodeURIComponent(
    `AND({Published}=1,FIND("${req.query.themeId}",ARRAYJOIN({Theme}," ")))`
  );
  const response = await fetch(
    `${base}/Library?filterByFormula=${filter}&sort[0][field]=Date%20Published&sort[0][direction]=desc`,
    { headers }
  );
  const data = await response.json();
  return res.status(200).json(data);
}

  // All published items
  const filter = encodeURIComponent(`{Published}=1`);
  const response = await fetch(
    `${base}/Library?filterByFormula=${filter}&sort[0][field]=Date%20Published&sort[0][direction]=desc`,
    { headers }
  );
  const data = await response.json();
  res.status(200).json(data);
};
