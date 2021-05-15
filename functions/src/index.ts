import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';

firebase.initializeApp();

import { categoryRouter } from './routes/categories';
import { newsRouter } from './routes/news';
import { MyJoyOnlineService } from './service/MyJoyOnlineService';
import moment = require('moment');
// import moment = require('moment');


const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use('/categories', categoryRouter);
app.use('/news', newsRouter)

app.get("/refresh", async (req, res) => {
    functions.logger.info("Refresh Job manually triggered!")

    try {
        await refreshNews();
        res.send("Refreshing news, please wait");
    } catch (error) {
        functions.logger.error(error)
        res.send(error);
    }
});

app.get("/", (req, res) => {
    res.send("Cloud functions running!")
})

async function deleteOldItems() {
    try {
        functions.logger.info("Deleting all items older than 1 week")

        // Get a new write batch
        const batch = firebase.firestore().batch();

        const documents = firebase
            .firestore()
            .collection("news")
            .where("date", '<=', moment().subtract(7, 'days'))

        documents.get()
            .then(snapshot => {
                snapshot.docs.forEach(doc => {
                    batch.delete(doc.ref);
                })
            })
            .catch(error => {
                functions.logger.error(error);
            })

        await batch.commit();

        functions.logger.info("Deleted all items older than 1 week")
    } catch (error) {
        functions.logger.error(error);
    }
}


async function refreshNews() {
    functions.logger.info(`Refreshing news contents`);

    try {
        //always clear database before adding new entries
        // await deleteAllItems('news');
        await new MyJoyOnlineService().fetchNews();
        functions.logger.info("News Refreshed");
    } catch (error) {
        functions.logger.error('Error cleaning the database' + error);
        throw (error)
    }
}

export const Refresh = functions.pubsub.schedule('every 25 minutes')
    .onRun(async () => refreshNews());

export const DeleteOldItems = functions.pubsub.schedule('6 10 * * *')
    .timeZone("Europe/London")
    .onRun(async () => deleteOldItems())

export const myApp = functions.runWith(
    {
        timeoutSeconds: 300,
        memory: '1GB'
    }
).https.onRequest(app);