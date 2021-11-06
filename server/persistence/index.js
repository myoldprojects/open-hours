const sqlite3 = require("sqlite3").verbose();
const { v4: uuidv4 } = require("uuid");
const { ifError } = require("assert/strict");
const fs = require("fs");
const path = require("path");
const dbLocation = path.join(__dirname, "data", "sqlite-db", "data.db");
let db = new sqlite3.Database(dbLocation);

function init() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      db.run(
        "create table if not exists business (id varchar(40), business_name varchar(255), posted_hours varchar(255))",
        (err) => {
          if (err) {
            console.log("table business creation fail");
            return reject(err);
          }
          console.log(`table business created`);
        }
      );
      db.run(
        "create table if not exists business_hours (id varchar(40), business_id varchar(40), open_day int, open_hours int, close_hours int )",
        (err) => {
          if (err) {
            console.log(`table business_hours creation fail`);
            return reject(err);
          } else {
            console.log(`table business_hours created`);
          }
        }
      );
      db.get("select count(*) count from business_hours", (err, result) => {
        if (err) {
          console.log(`fail to get business_hours count`);
          return reject(err);
        } else {
          console.log(`table business_hours containts ${result.count} records`);
          if (result.count == 0) {
            console.log(
              `Business hours: need to be populated. ... populating ...`
            );
            loadInitialBusinessHours(resolve);
            //resolve();
          } else {
            console.log(`Business hours already populated`);
            resolve();
          }
        }
      });
    });
  });
}

function getBusinesses() {
  return new Promise((reslove, reject) => {
    db.all("select * from business", (err, rows) => {
      if (err) {
        return reject(err);
      } else {
        reslove(
          rows.map((business) =>
            Object.assign({}, business, {
              id: business.id,
              business_name: business.business_name,
              posted_hours: business.posted_hours,
            })
          )
        );
      }
    });
  });
}
function getBusinessesOpen(dayAndTime) {
  return new Promise((reslove, reject) => {
    db.all(
      "select b.id, b.business_name , b.posted_hours from business_hours bh, business b where b.id = bh.business_id and open_day =? and open_hours < ? and close_hours >= ?",
      [dayAndTime.day, dayAndTime.time, dayAndTime.time],
      (err, rows) => {
        if (err) {
          return reject(err);
        } else {
          reslove(
            rows.map((business) =>
              Object.assign({}, business, {
                id: business.id,
                business_name: business.business_name,
                posted_hours: business.posted_hours,
              })
            )
          );
        }
      }
    );
  });
}

function teardown() {
  return new Promise((resolve, reject) => {
    db.close((err) => {
      if (err) {
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
const WeekDays = Object.freeze({
  Mon: 0,
  Tue: 1,
  Wed: 2,
  Thu: 3,
  Fri: 4,
  Sat: 5,
  Sun: 6,
});

function loadInitialBusinessHours(resolve) {
  console.log("in loadInitialBusinessHours");
  fs.readFile(
    path.join(__dirname, "data", "rest_hours.json"),
    "utf8",
    (err, data) => {
      if (err) {
        console.log(`there is an issue:${err}`);
        return;
      }
      console.log(`****Start loading initial data`);
      const jsonObjcts = JSON.parse(data);
      jsonObjcts.forEach((element) => {
        console.log(`${element.name}, scheduleCount: ${element.times.length}`);
        let business_id = uuidv4();

        business = {
          id: business_id,
          business_name: element.name,
          posted_hours: element.times,
        };
        storeBusiness(business);
        parseBusinessHours(business_id, element, resolve);
      });
      console.log("Done loading****");
      resolve();
    }
  );
}

function parseBusinessHours(business_id, element, resolve) {
  console.log(element.times);
  element.times.forEach((time) => {
    let index = time.search(/ ([1-9])/);
    let dayRange = time.substring(0, index);
    let days = dayRange.split(",");
    let hourRange = time
      .substring(index + 1)
      .toLowerCase()
      .trim();

    let hourIndex = hourRange.search(/-/);
    let openHour = hourRange.substring(0, hourIndex).trim();
    let closeHour = hourRange.substring(hourIndex + 1).trim();
    days.forEach((day) => {
      day = day.trim();
      let dayRanges = day.split("-");

      if (dayRanges.length > 1) {
        for (
          let openDay = WeekDays[dayRanges[0]];
          openDay <= WeekDays[dayRanges[1]];
          openDay++
        ) {
          parseBusinessDailyHours(business_id, openDay, openHour, closeHour);
        }
      } else {
        parseBusinessDailyHours(
          business_id,
          WeekDays[dayRanges],
          openHour,
          closeHour
        );
      }
    });
  });
}
function parseBusinessDailyHours(business_id, openDay, openHour, closeHour) {
  let parsedOpeningHour = parseHour(openHour);
  let hour = parsedOpeningHour.hour;
  if (parsedOpeningHour.ampm === "pm") {
    hour = hour + 12;
  }
  let openHourInMinute = hour * 60 + parsedOpeningHour.minute;

  let parsedClosingHour = parseHour(closeHour);
  let closingHour = parsedClosingHour.hour;
  let closingMinute = parsedClosingHour.minute;
  let ampm = parsedClosingHour.ampm;
  let closeHourInMinute;
  if (ampm === "am") {
    if (closingHour == 0 && closingMinute == 0) {
      // closing in mid night on the same day: 23:59:59:99+
      closeHourInMinute = 24 * 60;
    } else {
      closeHourInMinute = closingHour * 60 + closingMinute;
      if (closeHourInMinute < openHourInMinute) {
        //if the closing hour is before the opening hour then
        //it must be closing the next day
        let nextDay = (openDay + 1) % 7;
        let nextOpenHourInMinute = 0;
        let netxtBusinessHours = {
          id: uuidv4(),
          business_id: business_id,
          open_day: nextDay,
          open_hours: nextOpenHourInMinute,
          close_hours: closeHourInMinute,
        };
        storeBusinessHours(netxtBusinessHours);
        console.log(
          openDay,
          parsedOpeningHour,
          nextOpenHourInMinute,
          parsedClosingHour,
          closeHourInMinute
        );
        closeHourInMinute = 24 * 60; //set current day close at midnight
      }
    }
  } else {
    closeHourInMinute = (closingHour + 12) * 60 + closingMinute;
  }

  let businessHours = {
    id: uuidv4(),
    business_id: business_id,
    open_day: openDay,
    open_hours: openHourInMinute,
    close_hours: closeHourInMinute,
  };
  storeBusinessHours(businessHours);
  console.log(
    openDay,
    parsedOpeningHour,
    openHourInMinute,
    parsedClosingHour,
    closeHourInMinute
  );
}

function parseHour(hourString) {
  hourString = hourString.trim().toLowerCase();
  let minute = 0;
  let match, ampm;
  if (hourString.includes(":")) {
    let regexHourMinute = /(\d{1,2}):(\d{1,2}) (am|pm)/;
    match = hourString.match(regexHourMinute);
    minute = parseInt(match[2]);
    ampm = match[3];
  } else {
    let regexHourMinute = /(\d{1,2}) (am|pm)/;
    match = hourString.match(regexHourMinute);
    ampm = match[2];
  }
  let hour = parseInt(match[1]);
  if (ampm == "am" && hour == 12) {
    hour = 0;
  }
  return {
    hour: hour,
    minute: minute,
    ampm: ampm,
  };
}

function storeBusiness(business) {
  return new Promise((reslove, reject) => {
    db.run(
      "insert into business (id, business_name, posted_hours) values (?,?,?)",
      [business.id, business.business_name, business.posted_hours],
      (err) => {
        if (err) {
          return reject(err);
        } else {
          // console.log(`new business added`);
          reslove();
        }
      }
    );
  });
}
function storeBusinessHours(businessHours) {
  return new Promise((reslove, reject) => {
    db.run(
      "insert into business_hours (id, business_id, open_day, open_hours, close_hours) values (?,?,?,?,?)",
      [
        businessHours.id,
        businessHours.business_id,
        businessHours.open_day,
        businessHours.open_hours,
        businessHours.close_hours,
      ],
      (err) => {
        if (err) {
          return reject(err);
        } else {
          //console.log(`new businessHours added`);
          reslove();
        }
      }
    );
  });
}
module.exports = {
  init,
  teardown,
  getBusinesses,
  getBusinessesOpen,
  storeBusiness,
};
