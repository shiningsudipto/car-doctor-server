const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
let jwt = require('jsonwebtoken');
const app = express();
const port = process.env.PORT || 3000;

// middleware
app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.send('car doctor is running')
})
const uri = `mongodb://${process.env.USE_NAME}:${process.env.SECRET_KEY}@ac-eh9wica-shard-00-00.kh5m3gl.mongodb.net:27017,ac-eh9wica-shard-00-01.kh5m3gl.mongodb.net:27017,ac-eh9wica-shard-00-02.kh5m3gl.mongodb.net:27017/?ssl=true&replicaSet=atlas-ixs7p9-shard-0&authSource=admin&retryWrites=true&w=majority`

// const uri = `mongodb+srv://${process.env.USE_NAME}:${process.env.SECRET_KEY}@cluster0.kh5m3gl.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

const verifyJwt = (req, res, next) => {
    console.log('hitting');
    const authorization = req.headers.authorization;
    console.log(authorization);
    if (!authorization) {
        return res.status(403).send({ error: true, message: 'unauthorized access' })
    }
    const token = authorization.split(' ')[1];
    console.log(token);
    jwt.verify(token, process.env.ACCESS_TOKEN, (error, decoded) => {
        console.log(error, decoded);
        if (error) {
            return res.status(403).send({ error: true, message: 'unauthorized access' })
        }
        req.decoded = decoded;
        next();
    })
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        const serviceCollection = client.db('carDoctor').collection('services');
        const bookingCollection = client.db('carDoctor').collection('bookings');

        // jwt
        app.post('/jwt', (req, res) => {
            const user = req.body;
            console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN, {
                expiresIn: '1d'
            });
            res.send({ token })
        })

        // service route
        app.get('/services', async (req, res) => {
            // sorting- need: sort and query
            const sort = req.query.sort;
            const search = req.query.search;
            const query = { title: { $regex: search, $options: "i" } }
            const options = {
                sort: {
                    "price": sort === 'asce' ? 1 : -1
                }
            }
            const cursor = serviceCollection.find(query, options);
            const result = await cursor.toArray();
            res.send(result);
        })

        app.get('/services/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const options = {
                // Include only the `title`, service_id and `price` fields in each returned document
                // _id default included
                projection: { title: 1, price: 1, service_id: 1, img: 1 },
            }
            const result = await serviceCollection.findOne(query, options);
            res.send(result)
        })
        // bookings
        app.get('/bookings', verifyJwt, async (req, res) => {
            // console.log(req.headers.authorization);
            let query = {}
            if (req.query?.email) {
                query = {
                    email: req.query.email
                }
            }
            const result = await bookingCollection.find(query).toArray();
            res.send(result);
        })
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            console.log(booking);
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        })
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            console.log({ id });
            const query = { _id: new ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result);
        })
        app.patch('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const updatedBooking = req.body;
            console.log(updatedBooking);
            const updateDoc = {
                $set: {
                    status: updatedBooking.status
                },
            };
            const result = await bookingCollection.updateOne(filter, updateDoc);
            res.send(result)
        })


        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.listen(port, () => {
    console.log(`car doctor is running on port ${port}`);
})