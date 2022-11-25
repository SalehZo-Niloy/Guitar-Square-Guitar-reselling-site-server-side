const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const productCollection = client.db('guitar-square').collection('products');

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

        app.get('/user', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            res.send(user);
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

        app.get('/products', async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const filter = { sellerEmail: email };
            const products = await productCollection.find(filter).toArray();
            res.send(products);
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = { categoryId: id };
            const products = await productCollection.find(filter).toArray();
            res.send(products);
        })

        app.post('/products', async (req, res) => {
            const product = req.body;
            product.postedAt = new Date();
            // console.log(product);
            const result = await productCollection.insertOne(product);
            res.send(result);

        })

        app.delete('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await productCollection.deleteOne(query);
            res.send(result);
        })

        app.get('/advertise', async (req, res) => {
            const query = {
                isAdvertised: true,
                isSold: false
            };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })

        app.patch('/advertise/:id', async (req, res) => {
            const id = req.params.id;
            const state = req.body.state;
            // console.log(id);
            // console.log(state);
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: {
                    isAdvertised: state
                },
            };
            const result = await productCollection.updateOne(query, updateDoc);
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