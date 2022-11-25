const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.yarpj5v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        const categoryCollection = client.db('guitar-square').collection('product-category');
        const userCollection = client.db('guitar-square').collection('users');

        app.get('/categories', async (req, res) => {
            let query = {};

            const categoryName = req.query.category;
            if (categoryName) {
                query = { categoryName: categoryName }
                const category = await categoryCollection.findOne(query);
                return res.send(category);
            }
            const categories = await categoryCollection.find(query).toArray();
            res.send(categories);
        })

        app.get('/user/role/:email', async (req, res) => {
            const email = req.params.email;
            // console.log(email);
            const query = { email: email };
            const user = await userCollection.findOne(query);
            // console.log(user);
            res.send({ role: user?.role });
        })

        app.post('/user', async (req, res) => {
            const user = req.body;
            // console.log(user);
            const email = user.email;
            // console.log(email);
            const query = { email: email };
            const existsUser = await userCollection.findOne(query);
            if (existsUser) {
                return res.send({ message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        })
    }
    finally {

    }
}
run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Guitar Square running');
})

app.listen(port, () => {
    console.log('Guitar Square running on port:', port);
})