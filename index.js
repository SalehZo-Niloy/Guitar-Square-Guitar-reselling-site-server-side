const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SK);


app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.MONGO_USER}:${process.env.MONGO_PASS}@cluster0.yarpj5v.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

//----------------------------
// jwt middlewire
//----------------------------
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' });
    }
    const token = authHeader.split(' ')[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(401).send({ message: 'unauthorized access' });
        }
        req.decoded = decoded;
        next();
    })
}

const run = async () => {
    try {
        //----------------------------
        // all collections
        //----------------------------
        const categoryCollection = client.db('guitar-square').collection('product-category');
        const userCollection = client.db('guitar-square').collection('users');
        const productCollection = client.db('guitar-square').collection('products');
        const bookingCollection = client.db('guitar-square').collection('bookings');
        const paymentCollection = client.db('guitar-square').collection('payments');
        const reportCollection = client.db('guitar-square').collection('reports');
        const feedbackCollection = client.db('guitar-square').collection('feedbacks');

        //----------------------------
        // jwt token creation api
        //----------------------------
        app.post('/jwt', (req, res) => {
            const user = req.body;
            // console.log(user);
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: "30d" });
            res.send({ token });
        })

        //----------------------------
        // category get api
        //----------------------------
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

        //----------------------------
        // user crud operation apis start from here,and the first one is to check user role
        //----------------------------
        app.get('/user/role/:email', verifyJWT, async (req, res) => {
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
            if (!user) {
                return res.send({ isDeleted: false });
            }
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
            user.isDeleted = false;
            const result = await userCollection.insertOne(user);
            res.send(result);
        })

        app.patch('/user', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const query = { email: email };
            const updateDoc = {
                $set: {
                    isVerified: true
                },
            };
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        //----------------------------
        // this delete api deletes all product of buyer, and updates user as deleted so that he can't login again
        //----------------------------
        app.delete('/user', verifyJWT, async (req, res) => {
            const email = req.query.email;

            const filter = { sellerEmail: email };
            const deletedProducts = await productCollection.deleteMany(filter);

            const query = { email: email };
            const updateDoc = {
                $set: {
                    isDeleted: true
                },
            };
            const result = await userCollection.updateOne(query, updateDoc);
            res.send(result);
        })

        //----------------------------
        // all product apis start from here
        //----------------------------
        app.get('/products', verifyJWT, async (req, res) => {
            const email = req.query.email;
            // console.log(email);
            const filter = { sellerEmail: email };
            const products = await productCollection.find(filter).toArray();
            res.send(products);
        })

        app.get('/products/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const filter = {
                categoryId: id,
                isSold: false
            };
            const products = await productCollection.find(filter).toArray();
            res.send(products);
        })

        app.post('/products', verifyJWT, async (req, res) => {
            const product = req.body;
            product.postedAt = new Date();
            // console.log(product);
            const result = await productCollection.insertOne(product);
            res.send(result);

        })

        app.delete('/products/:id', verifyJWT, async (req, res) => {
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

        //----------------------------
        // api for advertising product
        //----------------------------
        app.get('/advertise', verifyJWT, async (req, res) => {
            const query = {
                isAdvertised: true,
                isSold: false
            };
            const products = await productCollection.find(query).toArray();
            res.send(products);
        })

        app.patch('/advertise/:id', verifyJWT, async (req, res) => {
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

        //----------------------------
        // apis for handling bookings
        //----------------------------
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = { email: email };

            const orders = await bookingCollection.find(query).toArray();
            res.send(orders);
        })

        app.post('/bookings', verifyJWT, async (req, res) => {
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

        //----------------------------
        // api to get a specific product details
        //----------------------------
        app.get('/specificProduct/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productCollection.findOne(query);
            res.send(product);
        })

        //----------------------------
        // payment intent api
        //----------------------------
        app.post('/create-payment-intent', verifyJWT, async (req, res) => {
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

        //----------------------------
        // payment info storing api
        //----------------------------
        app.post('/payment', verifyJWT, async (req, res) => {
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

        //----------------------------
        // apis for reporting items
        //----------------------------
        app.post('/report', verifyJWT, async (req, res) => {
            const reportedProduct = req.body;
            // console.log(reportedProduct);
            const query = {};
            const result = await reportCollection.insertOne(reportedProduct);
            res.send(result);
        })

        app.get('/report', verifyJWT, async (req, res) => {
            const query = {};
            const reportedProducts = await reportCollection.find(query).toArray();
            res.send(reportedProducts);
        })

        app.delete('/report/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: ObjectId(id) };
            const deletedProduct = await productCollection.deleteOne(query);
            const filter = { productId: id };
            const deleteReport = await reportCollection.deleteMany(filter);
            res.send(deleteReport);
        })

        //----------------------------
        // api to get sellers
        //----------------------------
        app.get('/sellers', verifyJWT, async (req, res) => {
            const query = {
                role: 'seller',
                isDeleted: false
            }

            const sellers = await userCollection.find(query).toArray();
            res.send(sellers);
        })

        //----------------------------
        // api to get buyers
        //----------------------------
        app.get('/buyers', verifyJWT, async (req, res) => {
            const query = {
                role: 'buyer',
                isDeleted: false
            }

            const buyers = await userCollection.find(query).toArray();
            res.send(buyers);
        })

        //----------------------------
        // feedback storing api
        //----------------------------
        app.post('/feedback', async (req, res) => {
            const feedback = req.body;
            // console.log(feedback);
            const result = await feedbackCollection.insertOne(feedback);
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