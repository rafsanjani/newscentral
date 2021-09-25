import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';

const admin = firebase
const firestore = admin.firestore

admin.initializeApp();

import { categoryRouter } from './routes/categories';
import { newsRouter } from './routes/news';
import { MyJoyOnlineService } from './service/MyJoyOnlineService';

import moment = require('moment');


const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use('/categories', categoryRouter);
app.use('/news', newsRouter);

app.get("/refresh", async (req, res) => {
    functions.logger.info("Refresh Job manually triggered!");

    try {
        await refreshNews();
        res.send("Refreshing news, please wait");
    } catch (error) {
        functions.logger.error(error);
        res.send(error);
    }
});

app.get("/cleanup", async (req, res) => {
    await deleteOldItems();
});

app.get("/", (req, res) => {
    res.send("Cloud functions running!");
})

async function deleteOldItems() {
    try {
        functions.logger.info("Deleting all items older than 1 week");

        const documents = firebase
            .firestore()
            .collection("news")
            .where("date", '<=', firestore.Timestamp.fromDate(moment().subtract(7, "days").toDate()));


        await deleteQueryBatch(documents, (count) => {
            functions.logger.log(`Deleted ${count} older items. Good job!`)
        });

    } catch (error) {
        functions.logger.error(error);
    }
}

let deletedItems = 0;

async function deleteQueryBatch(query: FirebaseFirestore.Query, callback: (numbers: number) => void) {
    const snapshot = await query.get();

    const batchSize = snapshot.size;

    if (batchSize === 0) {
        callback(deletedItems);
        return;
    } else {
        deletedItems = batchSize
    }

    const batch = firebase.firestore().batch();

    snapshot.docs.forEach((doc) => {
        batch.delete(doc.ref);
    });
    await batch.commit();

    process.nextTick(async () => {
        await deleteQueryBatch(query, callback);
    });
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

export const Refresh = functions.pubsub.schedule('every 50 minutes')
    .onRun(async () => refreshNews());

export const DeleteOldItems = functions.pubsub.schedule('every 20 hours')
    .timeZone("Europe/London")
    .onRun(async () => deleteOldItems())

export const myApp = functions.runWith(
    {
        timeoutSeconds: 300,
        memory: '1GB'
    }
).https.onRequest(app);
