const express = require("express");
const cors = require("cors");
const { MongoClient, ServerApiVersion } = require("mongodb");
require('dotenv').config();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { Parser } = require("json2csv");

const app = express();
const port = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// MongoDB Connection
const uri = `mongodb+srv://${process.env.dbUser}:${process.env.dbPass}@cluster0.fcornmz.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

// Admin Credentials
const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH; // Now using hashed password

async function run() {
  try {
    await client.connect();
    console.log("✅ Connected to MongoDB!");

    await client.db("admin").command({ ping: 1 });
    console.log("✅ Pinged your deployment.");

    const userDB = client.db("BDUSA");
    const userCL = userDB.collection("formdata");

    // Admin Login Route
    app.post("/admin-login", async (req, res) => {
      const { username, password } = req.body;

      // Validate username
      if (username !== ADMIN_USERNAME) {
        return res.status(401).send({ message: "Invalid login credentials" });
      }

      // Validate password
      const isPasswordCorrect = bcrypt.compareSync(password, ADMIN_PASSWORD_HASH);
      if (!isPasswordCorrect) {
        return res.status(401).send({ message: "Invalid login credentials" });
      }

      // Generate JWT
      const token = jwt.sign({ username }, process.env.JWT_SECRET, { expiresIn: '1h' });
      res.status(200).send({ token });
    });

    // Fetch form data
    app.get('/form-collection', async (req, res) => {
      try {
        const result = await userCL.find().toArray();
        res.send(result);
      } catch (error) {
        console.error("Error fetching data:", error);
        res.status(500).send({ message: "Failed to fetch data" });
      }
    });

    // Submit form
    app.post("/submit-form", async (req, res) => {
      try {
        const formData = req.body;
        const result = await userCL.insertOne(formData);
        res.status(201).send(result);
      } catch (error) {
        console.error("Error submitting form:", error);
        res.status(500).send({ message: "Failed to submit form" });
      }
    });

    // Download form data as CSV
    app.get('/download-csv', async (req, res) => {
      try {
        const users = await userCL.find({}).toArray();
        const fields = ["fullName", "address", "phone", "profession"];
        const json2csvParser = new Parser({ fields });
        const csv = json2csvParser.parse(users);

        res.header("Content-Type", "text/csv");
        res.attachment("users.csv");
        res.send(csv);
      } catch (error) {
        console.error("Error downloading CSV:", error);
        res.status(500).send({ message: "Failed to download CSV" });
      }
    });

  } finally {
    // await client.close(); // Keep connection open
  }
}

// Run the server
run().catch(console.dir);

// Root route (must be OUTSIDE run())
app.get("/", (req, res) => {
  res.send("Server is Running! 🚀");
});

// Listen to port
app.listen(port, () => console.log(`🚀 Server running on port ${port}!`));
