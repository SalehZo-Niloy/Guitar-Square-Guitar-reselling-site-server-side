const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.yarpj5v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

const run = async () => {
    try {
        const categoryCollection = client.db('guitar-square').collection('product-category');
        const userCollection = client.db('guitar-square').collection('users');
        const productCollection = client.db('guitar-square').collection('products');
        const bookingCollection = client.db('guitar-square').collection('bookings');
        const paymentCollection = client.db('guitar-square').collection('payments');

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
            const filter = {
                categoryId: id,
                isSold: false
            };
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

        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id),
                isSold: false
            }
            const product = await productCollection.findOne(query);
            // console.log(product);
            if (product) {
                return res.send(product);
            }
            res.send({ message: 'Product Sold' });
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

        app.get('/bookings', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };

            const orders = await bookingCollection.find(query).toArray();
            res.send(orders);
        })

        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            // console.log(booking);
            const query = {
                email: booking?.email,
                productId: booking?.productId
            }

            const alreadyBooked = await bookingCollection.findOne(query);
            // console.log(alreadyBooked);
            if (alreadyBooked) {
                return res.send({ acknowledged: false });
            }
            else {
                const result = await bookingCollection.insertOne(booking);
                return res.send(result);
            }
        })

        app.get('/specificProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const price = req.body.price;
            if (!price) {
                return res.send({ message: 'Product already Sold' });
            }
            const amount = price * 100;
            // console.log(amount);

            const paymentIntent = await stripe.paymentIntents.create({
                amount,
                currency: 'usd',
                "payment_method_types": [
                    "card"
                ],
            });

            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        });

        app.post('/payment', async (req, res) => {
            const payment = req.body;
            const result = await paymentCollection.insertOne(payment);
            const id = payment.productId;
            const filter = {
                _id: ObjectId(id)
            }
            const updateDoc = {
                $set: {
                    isSold: true,
                }
            }
            const updateProduct = await productCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

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