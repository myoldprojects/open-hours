const db = require("../persistence");
const { v4: uuidv4 } = require("uuid");

module.exports = async (req, res) => {
  console.log(`${req.body.posted_hours} ${req.body.business_name}`);
  const business = {
    id: uuidv4(),
    business_name: req.body.business_name,
    posted_hours: req.body.posted_hours,
  };
  await db.storeBusiness(business);
  res.json(business);
};
