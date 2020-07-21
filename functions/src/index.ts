import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';

firebase.initializeApp();
import { categoryRouter } from './routes/categories';
import { newsRouter } from './routes/news';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use('/categories', categoryRouter);
app.use('/news', newsRouter)

app.get("/", (req, res) => {
    res.send("Cloud functions running correctly");
});


export const myApp = functions.https.onRequest(app);
