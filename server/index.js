const express = require("express");
const app = express();
const path = require("path");
const db = require("./persistence");
const port = process.env.PORT || 3000;
const getBusiness = require("./routes/getBusinesses");
const addBusiness = require("./routes/addBusiness");
const getBusinessesOpen = require("./routes/getBusinessesOpen");

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "static")));

app.get("/businesses", getBusiness);
app.post("/business", addBusiness);
app.get("/business/day/:day/hours/:hour.:minute.:ampm", getBusinessesOpen);

db.init()
  .then(() => {
    app.listen(port, () => {
      console.log(`server is up and listening on port: ${port}`);
    });
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
//handling the app termination gracefully
const gracefulShutdown = () => {
  db.teardown()
    .catch(() => {})
    .then(() => process.exit());
};

process.on("SIGINT", gracefulShutdown);
process.on("SIGTERM", gracefulShutdown);
process.on("SIGUSR2", gracefulShutdown); // Sent by nodemon
