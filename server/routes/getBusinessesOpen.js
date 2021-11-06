const db = require("../persistence");

module.exports = async (req, res) => {
  const WeekDays = Object.freeze({
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  });
  const day = WeekDays[req.params.day];
  let hour = parseInt(req.params.hour);
  const minute = parseInt(req.params.minute);
  let ampm = req.params.ampm;
  ampm = ampm.toLowerCase().trim();
  if (ampm == "pm" || (ampm = 'am' && hour == 12 && minute == 0)) {
    hour = 12 + hour;
  }else if(ampm = 'am' && hour == 12 && minute > 0 ){
      hour = hour - 12;
  }

  const time = hour * 60 + minute;
  console.log(`${day}, ${hour}:${minute} ${ampm}, ${time}`);
  let dayAndTime = {
    day: day,
    time: time,
  };
  const businesses = await db.getBusinessesOpen(dayAndTime);
  res.json(businesses);
};
