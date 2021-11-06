const db = require("../persistence");

module.exports = async (req, res) => {
  const businesses = await db.getBusinesses();
  res.json(businesses);
};
