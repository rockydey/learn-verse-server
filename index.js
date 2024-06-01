const express = require("express");
const cors = require("cors");
require("dotenv").config();
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const jwt = require("jsonwebtoken");
const app = express();
const port = process.env.PORT || 5000;

// build in middleware
app.use(express.json());
app.use(cors());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.7heaon2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    await client.connect();

    const userCollection = client.db("learnVerseDB").collection("users");

    // custom middleware
    const verifyToken = (req, res, next) => {
      if (!req.headers.authorization) {
        return res.status(401).send({ message: "unauthorized access" });
      }
      const token = req.headers.authorization.split(" ")[1];
      jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
        if (err) {
          return res.status(401).send({ message: "unauthorized access" });
        }
        req.decoded = decoded;
        next();
      });
    };

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.user_role === "admin" ? true : false;
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    const verifyTeacher = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { user_email: email };
      const user = await userCollection.findOne(query);
      const isAdmin = user?.user_role === "teacher" ? true : false;
      if (!isAdmin) {
        return res.status(403).send({ message: "forbidden access" });
      }
      next();
    };

    // jwt related api
    app.post("/jwt", async (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1h",
      });
      res.send({ token });
    });

    // user related api
    app.get("/users", verifyToken, async (req, res) => {
      const searchText = req.query.search;
      if (searchText === "") {
        const result = await userCollection.find().toArray();
        res.send(result);
      } else {
        const query = {
          $or: [
            { user_name: { $regex: new RegExp(searchText, "i") } },
            { user_email: { $regex: new RegExp(searchText, "i") } },
          ],
        };
        const searchResult = await userCollection.find(query).toArray();
        res.send(searchResult);
      }
    });

    app.get("/users/:email", verifyToken, verifyAdmin, async (req, res) => {
      const email = req.params.email;
      if (email !== req.decoded.email) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { user_email: email };
      const user = await userCollection.findOne(query);
      const role = user.user_role;
      res.send({ role });
    });

    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { user_email: user.user_email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "user already exists", insertedId: null });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    app.patch("/users/:id", verifyToken, verifyAdmin, async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const options = { upsert: true };
      const role = req.body;
      const updateUser = {
        $set: {
          user_role: role.user_role,
        },
      };
      const result = await userCollection.updateOne(query, updateUser, options);
      res.send(result);
    });

    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);

// for testing server
app.get("/", (req, res) => {
  res.send("Learn Verse server is running!");
});

app.listen(port, () => {
  console.log("Learn Verse server is running on port: ", port);
});
