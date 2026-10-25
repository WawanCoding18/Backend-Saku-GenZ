import express from "express";
import router from "./routes/api";
import db from "./utils/database";
import docs from "./docs/route";
import cors from "cors";
import transaksiRoute from "./routes/api";

const app = express();

app.use(cors({ 
  origin: ["http://localhost:3000", "https://finzen-web-black.vercel.app"], 
  credentials: true 
}));
app.use(express.json());

app.get("/", (req, res) => {
  res.status(200).json({
    message: "Server running",
    data: null,
  });
});

app.use("/api", router);
app.use("/api/transaksi", transaksiRoute);
docs(app);

db().then((conn) => {
  console.log("DB Connected");
}).catch((err) => {
  console.error("DB Error:", err);
});

if (process.env.NODE_ENV !== "production") {
  app.listen(4000, () => {
    console.log("Server running on port 4000");
  });
}

export default app;