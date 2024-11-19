const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.port || 5000;
require('dotenv').config()
let jwt = require('jsonwebtoken');


//middlewar
app.use(cors());
app.use(express.json())




const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.olvofey.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();
        const database = client.db('footwear')
        const productCollection = database.collection("products")
        const categoryCollection = database.collection("category")
        const brandCollection = database.collection("brand")
        const cartCollection = database.collection("cart")
        const reviewsCollection = database.collection("reviews")
        const usersCollection = database.collection("users")
        const wishlistCollection = database.collection("wishlist")
        const orderCollection = database.collection("order")


        // jwt related api
        app.post('/jwt', async (req, res) => {
            const user = req.body;
            // console.log(user);
            if (!user) {
                return res.status(400).json({ error: 'User data is required' });
            }
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' });
            // console.log(token);
            res.json({ token });
        })
     
        

        // middlewares 
        const veryfyToken = (req, res, next) => {
            // console.log('inside verify token', req.headers.authorization);
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' });
            }
            const token = req.headers.authorization.split(' ')[1];
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded;
                next();
            })
        }

        // use verify admin after verifyToken
        const veryfyAdmin = async (req, res, next) => {
            const email = req.decoded.email;
            // console.log(email);
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const isAdmin = user?.role === 'Admin';
            // console.log(isAdmin);
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' });
            }
            next();
        }


        //start users api

        app.post('/users', async (req, res) => {
            const user = req.body;
            const email = { email: user?.email }
            const existEmail = await usersCollection.findOne(email)
            if (existEmail) {
                return res.send({ message: "Email already exists" })
            } else {
                const rslt = await usersCollection.insertOne(user)
                res.send(rslt)
            }

        })

        app.get('/users', veryfyToken, veryfyAdmin, async (req, res) => {
            try {
                const rslt = await usersCollection.find().toArray()
                if (!rslt) {
                    return res.status(404).json({ message: 'No User Found' })
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching users', error });
            }
        })

        app.get('/api/users/profile/:email', veryfyToken, async (req, res) => {
            const email = req.params.email
            const query = { email: email }
            try {
                const rslt = await usersCollection.findOne(query)
                if (!rslt) {
                    return res.status(404).json({ message: 'No User Profile Found' })
                }
                res.send(rslt)

            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching users', error });
            }
        })

        app.patch('/users/:email', veryfyToken, veryfyAdmin, async (req, res) => {
            const email = req.params.email;
            const userInfo = req.body;
            const query = { email: email }
            const updateDoc = {
                $set: {
                    name: userInfo.name,
                    image: userInfo.image,
                }
            }
            try {
                const rslt = await usersCollection.updateOne(query, updateDoc)
                if (!rslt) {
                    return res.status(500).json({ message: 'User  Update Failed' })
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error updating users', error });
            }
        })

        app.patch('/users/role/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const userRole = req.body;
            // console.log(userRole);
            const query = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    role: userRole.role
                }
            }
            try {
                const rslt = await usersCollection.updateOne(query, updateDoc)
                if (!rslt) {
                    return res.status(404).json({ message: 'User Role Update Failed' })
                }
                res.send(rslt)
            }

            catch (error) {
                res.status(500).json({ message: 'Error updating users role', error });
            }
        })


        app.delete('/users', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            try {
                const rslt = await usersCollection.deleteOne(query)
                if (!rslt) {
                    return res.send({ message: "user delete failed" })
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error delete users', error });
            }

        })

        //admin check 
        app.get('/users/admin/:email', veryfyToken, async (req, res) => {
            const email = req.params.email;
            if (!email == req.decoded.email) {
                return res.status(403).send('Unauthorized access')
            }
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'Admin'
            }
            // console.log(admin);
            res.send({ admin })
        })

        //end users api

        // ===============================
        // start Admin side api
        // ===============================

        app.get('/getCategoryBrand', veryfyToken, veryfyAdmin, async (req, res) => {
            const category = await categoryCollection.find().sort({ _id: -1 }).toArray()
            const brand = await brandCollection.find().sort({ _id: -1 }).toArray()
            res.send([category, brand])
        })

        // get brand

        app.get('/brand/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            try {
                const result = await brandCollection.findOne(query)
                if (!result) {
                    return res.status(404).send('Brand not found')
                }
                res.send(result)
            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching brand', error });
            }

        })

        // get category

        app.get('/category/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            try {
                const result = await categoryCollection.findOne(query)
                if (!result) {
                    return res.status(404).send('Category not found')
                }
                res.send(result)
            }
            catch (error) {
                res.status(500).json({ message: 'Error fetching category', error });
            }
        })

        //update brand

        app.patch('/updateBrand/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const data = req.body
            const updateDoc = {
                $set: {
                    brand: data.brand,
                    status: data.status
                }
            }
            try {
                const result = await brandCollection.updateOne(query, updateDoc)
                if (!result) {
                    return res.status(404).send('update Brand Failed')
                }
                res.send(result)
            }
            catch (error) {
                res.status(500).json({ message: 'Error update Brand', error });
            }

        })

        //update category

        app.patch('/updateCategory/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const data = req.body
            const updateDoc = {
                $set: {
                    category: data.category,
                    status: data.status
                }
            }
            try {
                const result = await categoryCollection.updateOne(query, updateDoc)
                if (!result) {
                    return res.status(404).send('update category Failed')
                }
                res.send(result)
            }
            catch (error) {
                res.status(500).json({ message: 'Error update category', error });
            }

        })

        app.post('/addCategory', veryfyToken, veryfyAdmin, async (req, res) => {
            const category = req.body;
            try {
                const rslt = await categoryCollection.insertOne(category)
                if (!rslt) {
                    return res.status(500).send('Add category Failed')
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error add category', error });
            }

        })

        app.delete('/dltCategory/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const rslt = await categoryCollection.deleteOne(query)
            res.send(rslt)
        })

        app.post('/addBrand', veryfyToken, veryfyAdmin, async (req, res) => {
            const brand = req.body;
            try {
                const rslt = await brandCollection.insertOne(brand)
                if (!rslt) {
                    return res.status(500).send('Add brand Failed')
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error add brand', error });
            }

        })

        app.delete('/dltBrand/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const rslt = await brandCollection.deleteOne(query)
            res.send(rslt)
        })

        //product credentials start----------------

        //add products

        app.post('/addItem', veryfyToken, veryfyAdmin, async (req, res) => {
            const products = req.body;
            try {
                const rslt = await productCollection.insertOne(products);
                if (!rslt) {
                    return res.status(500).send('Add Products Failed')
                }
                res.send(rslt)
            }
            catch (error) {
                res.status(500).json({ message: 'Error add Products', error });
            }

        })

        app.get('/products', async (req, res) => {
            try {
                const products = await productCollection.find().sort({ _id: -1 }).toArray()
                if (!products) {
                    return res.status(404).send('No Products Failed')
                }
                res.send(products)
            }
            catch (error) {
                res.status(500).json({ message: 'Error Fetching Products', error });
            }
        })

        // Filter products endpoint

        app.get('/filter', veryfyToken, veryfyAdmin, async (req, res) => {

            const { name, minprice, maxprice, category, type, status, brand, color } = req.query;

            // Build the query based on the provided parameters
            const query = {};
            if (name) query.name = { $regex: name, $options: 'i' }; // Case-insensitive match
            // if (name) query.name = name;
            if (category) query.category = category;
            if (type) query.type = type;
            if (status) query.status = status;
            if (brand) query.brand = brand;
            if (color) query.color = color;
            // Filter by price range
            if (minprice && maxprice) {
                query.price = {
                    $gte: Number(minprice),
                    $lte: Number(maxprice)
                };
            }
            try {
                // Fetch the filtered products
                const products = await productCollection.find(query).toArray();
                if (!products) {
                    return res.status(404).json({ message: 'No products found' });
                }
                res.status(200).json(products);
                console.log('filter products:', products);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching products', error });
            }
        });
        app.get('/editProduct/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            // Check if the ID is a valid ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid product ID" });
            }
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.findOne(query)
            res.send(result)
        })
        app.patch('/editProduct/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const product = req.body;
            const filter = { _id: new ObjectId(id) }
            const updateDoc = {
                $set: {
                    name: product.name,
                    price: product.price,
                    category: product.category,
                    color: product.color,
                    brand: product.brand,
                    type: product.type,
                    status: product.status,
                    quantity: product.quantity,
                    description: product.description,
                    image: product.image,
                }
            }
            const rslt = await productCollection.updateOne(filter, updateDoc)
            res.send(rslt)

        })
        app.delete('/product/:id', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const rslt = await productCollection.deleteOne(query)
            res.send(rslt)
        })

        app.get('/product/:status', async (req, res) => {
            const status = req.params.status;
            const query = { status: status }
            const result = await productCollection.find(query).toArray();
            res.send(result);
        })

        //product credentials end-----------------------


        app.get('/category', async (req, res) => {
            const query = { status: "Published" }
            const result = await categoryCollection.find(query).toArray();
            res.send(result);
        })
        app.get('/brand', async (req, res) => {
            const query = { status: "Published" }
            const result = await brandCollection.find(query).toArray();
            res.send(result);
        })

        //find orders
        app.get('/orders', veryfyToken, veryfyAdmin, async (req, res) => {
            try {
                const result = await orderCollection.find().toArray();
                if (!result) {
                    return res.status(500).send('No orders found')
                }
                res.send(result)
            }
            catch (error) {
                res.status(500).send({ message: 'Failed to fetch orders', error: error.message })
            }

        })
        app.get('/orderDetails/:cusId', veryfyToken, veryfyAdmin, async (req, res) => {
            const id = req.params.cusId
            const query = { _id: new ObjectId(id) }
            const result = await orderCollection.findOne(query)
            res.send(result)
        })
        app.patch('/orderStatus', veryfyToken, veryfyAdmin, async (req, res) => {
            const orderStatus = req.body;
            const query = { orderId: orderStatus.orderId }
            const updateDoc = {
                $set: {
                    status: orderStatus.status,
                    quantity: orderStatus.quantity,
                    orderTransection: orderStatus.orderTransection,
                    comment: orderStatus.comment
                }
            }
            try {
                const result = await orderCollection.updateOne(query, updateDoc)
                if (!result) {
                    return res.status(500).send({ message: "update failed" })
                }
                res.send(result)
            } catch (error) {
                res.status(500).send('Update data not found', error)
            }
        })
        // const { ObjectId } = require('mongodb'); // Ensure you import ObjectId from mongodb

        // ===============================
        // start front end-------------------------
        // ===============================

        app.get('/productDetails/:id', async (req, res) => {
            const id = req.params.id;
            // Check if the ID is a valid ObjectId
            if (!ObjectId.isValid(id)) {
                return res.status(400).send({ message: "Invalid product ID" });
            }
            const query = { _id: new ObjectId(id) };
            try {
                const result = await productCollection.findOne(query);
                if (!result) {
                    return res.status(404).send({ message: "Product not found" });
                }
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: "An error occurred", error });
            }
        });

        //reviews adding

        app.post('/reviews', async (req, res) => {
            const reviews = req.body;
            try {
                const result = await reviewsCollection.insertOne(reviews)
                res.send(result)
            } catch (error) {
                res.status(500).send({ message: "An Error occured", error })
            }
        })

        //reviews fetching
        app.get(`/reviews/:id`, async (req, res) => {
            const id = req.params.id
            const query = { pId: id }
            try {
                const result = await reviewsCollection.find(query).toArray()
                if (!result) {
                    return res.status(404).send({ message: "Review not found" })
                }
                res.send(result)
            } catch (error) {
                res.status(500).send({ message: "An Error occured", error })
            }
        })

        //filter products
        app.get('/productsFilter', async (req, res) => {
            // const { brand, color, minPrice, maxPrice } = req.query;
            const { category, brand, color, minPrice, maxPrice } = req.query;

            // Build the query object
            let query = {};

            // Filter by category
            if (category) {
                query.category = category;
            }

            // Filter by brand
            if (brand) {
                query.brand = brand;
            }

            // Filter by color
            if (color) {
                query.color = color;
            }

            // Filter by price range
            if (minPrice && maxPrice) {
                query.price = {
                    $gte: Number(minPrice),
                    $lte: Number(maxPrice)
                };
            }

            try {
                // Fetch the filtered products
                const products = await productCollection.find(query).toArray();
                if (!products) {
                    return res.status(404).json({ message: 'No products found' });
                }
                res.status(200).json(products);
            } catch (error) {
                res.status(500).json({ message: 'Error fetching products', error });
            }
        });
        app.get('/search', async (req, res) => {
            const { name } = req.query
            const search = { name: { $regex: new RegExp(name, 'i') } }
            const result = await productCollection.find(search).toArray()
            res.send(result)
        })

        // Send a ping to confirm a successful 
        //cart button data
        app.get('/cartButton/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            try {
                const result = await productCollection.findOne(query);
                if (!result) {

                    return res.status(404).json({ message: 'Products not found' })
                }
                res.status(200).json(result)
            } catch (error) {
                res.status(500).json({ message: 'Error fetching products', error })
            }
        })

        app.post('/api/addtocart', veryfyToken, async (req, res) => {
            try {
                const cartInfo = req.body;
                console.log(cartInfo);
                // Insert the new item into the cart collection
                const result = await cartCollection.insertOne(cartInfo);

                // Send the result back to the client
                res.status(200).send({
                    message: 'Item successfully added to cart',
                    result: result,
                });
            } catch (error) {
                console.error('Error inserting item into cart:', error);

                // Send an error response
                res.status(500).send({
                    message: 'Error adding item to cart',
                    error: error.message,
                });
            }
        });

        app.post('/api/addWishlist', veryfyToken, async (req, res) => {
            try {
                const wishlistInfo = req.body;
                console.log(wishlistInfo);
                const query = { pId: wishlistInfo.pId }
                // Insert the new item into the cart collection
                const result = await wishlistCollection.insertOne(wishlistInfo);
                // Send the result back to the client
                res.status(200).send({
                    message: 'Item successfully added to wishlist',
                    result: result,
                });
            } catch (error) {
                console.error('Error inserting item into wishlist:', error);
                // Send an error response
                res.status(500).send({
                    message: 'Error adding item to wishlist',
                    error: error.message,
                });
            }
        });

        //remove from wishlist

        app.delete('/api/removeWishlist/:id', veryfyToken, async (req, res) => {
            try {
                const wishlistId = req.params.id;
                console.log(wishlistId);
                const query = { pId: wishlistId }
                const removeFromWishlist = await wishlistCollection.deleteOne(query)
                res.status(200).send({
                    message: 'Item successfully remove to wishlist',
                    result: removeFromWishlist,
                });

            } catch (error) {
                console.error('Error Removing item into wishlist:', error);
                // Send an error response
                res.status(500).send({
                    message: 'Error removing item to wishlist',
                    error: error.message,
                });
            }
        })

        //get wishlist data

        app.get('/wishlist/:email', veryfyToken, async (req, res) => {
            const email = req.params.email;
            // console.log(email);
            try {
                const wishlist = await wishlistCollection.aggregate([
                    // Match the wishlist by email
                    {
                        $match: { email: email }
                    },
                    // Add a step to convert 'pId' to ObjectId (if it's stored as a string)
                    {
                        $addFields: {
                            pId: { $toObjectId: '$pId' }
                        }
                    },
                    // Perform a lookup to join with the product collection
                    {
                        $lookup: {
                            from: 'products', // Name of the product collection
                            localField: 'pId', // Field in wishlist to match
                            foreignField: '_id', // Field in product collection to match
                            as: 'productDetails' // Alias for joined data
                        }
                    },
                    // Flatten the productDetails array
                    {
                        $unwind: '$productDetails'
                    }
                ]).toArray(); // Convert the cursor to an array

                // console.log('Wishlist:', wishlist);
                res.status(200).json(wishlist); // Send response to client
            } catch (error) {
                console.error('Error fetching wishlist:', error);
                res.status(500).json({ message: 'Server error', error: error.message });
            }
        });

        //get cart data

        app.get('/api/cart/:email', veryfyToken, async (req, res) => {
            const email = req.params.email;
            const query = { customer_email: email }; // Proper query

            try {
                // Fetch the cart data for the given customer email
                const cartData = await cartCollection.find(query).toArray();

                // If no cart data is found, send a 404 response
                if (!cartData.length) {
                    return res.status(404).json({ message: "No cart data found for this email." });
                }

                // Send the cart data in the response
                res.status(200).send(cartData);
            } catch (error) {
                console.error('Error fetching cart data:', error);
                // Send an error response
                res.status(500).send({
                    message: 'Error fetching cart data',
                    error: error.message,
                });
            }
        });

        //get my orders data

        app.get('/api/myOrders/:email', veryfyToken, async (req, res) => {
            const email = req.params.email;
            const query = { email: email }; // Proper query
            try {
                // Fetch the cart data for the given customer email
                const myOrdersData = await orderCollection.find(query).toArray();

                // If no cart data is found, send a 404 response
                if (!myOrdersData.length) {
                    return res.status(404).json({ message: "No orders data found for this email." });
                }

                // Send the cart data in the response
                res.status(200).send(myOrdersData);
            } catch (error) {
                console.error('Error fetching myOrders data:', error);

                // Send an error response
                res.status(500).send({
                    message: 'Error fetching myOrders data',
                    error: error.message,
                });
            }
        });

        //delete cart item

        app.delete('/api/deleteCartItem/:id', veryfyToken, async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        //complete purchase

        app.post('/checkoutOrder', veryfyToken, async (req, res) => {
            const purchaseProduct = req.body;
            const result = await orderCollection.insertOne(purchaseProduct)
            res.send(result)
        })

        // ===============================
        // end front end api-------------------------
        // ===============================

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('footwear is running');
});

app.listen(port, () => {
    console.log(`footwear is running on port ${port}`);
})
