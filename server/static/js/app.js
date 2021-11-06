const app = Vue.createApp({
  data() {
    return {
      listHours: false,
      businesses: [],
      weekday: {
        selected: "Wed",
        options: [
          { text: "Monday", value: "Mon" },
          { text: "Tuesday", value: "Tue" },
          { text: "Wednesday", value: "Wed" },
          { text: "Thursday", value: "Thu" },
          { text: "Friday", value: "Fri" },
          { text: "Saturday ", value: "Sat" },
          { text: "Sunday ", value: "Sun" },
        ],
      },
      hourPicker: {
        hh: "01",
        a: "am",
        mm: "00",
      },
      displayTime: "01:00 AM",
    };
  },
  methods: {
    getBusiness() {
      let uri = "/businesses";
      axios.get(uri).then((response) => {
        this.businesses = response.data;
        this.listHours = true;
      });
    },
    getOpenRes(selectedDay, hourPicker) {
      console.log(`${hourPicker.hh} ${hourPicker.mm} ${hourPicker.a} `);
      let uri = `/business/day/${selectedDay}/hours/${hourPicker.hh}.${hourPicker.mm}.${hourPicker.a}`;
      axios
        .get(uri)
        .then((response) => {
          console.log(response);
          this.businesses = response.data;
          this.listHours = false;
        })
        .catch((error) => {
          // error.response.status Check status code
        })
        .finally(() => {
          //Perform action in always
        });
    },
  },
});
