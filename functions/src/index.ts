import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import {categoryRouter} from './routes/categories';
import {newsRouter} from './routes/news';
import {fetchNews} from "./service/news_service";

const admin = firebase
const firestore = admin.firestore


if (admin.apps?.length === 0) {
    admin.initializeApp();
}

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use('/categories', categoryRouter);
app.use('/news', newsRouter);

app.get("/refresh", async (_: express.Request, res: express.Response) => {
    functions.logger.info("Refresh Job manually triggered!");

    try {
        res.send("Refresh command received. News will be refreshed");
        await refreshNews();
    } catch (error) {
        functions.logger.error(error);
        res.send(error);
    }
});

app.get("/cleanup", async () => {
    await deleteOldItems();
});

app.get("/", (req: express.Request, res: express.Response) => {
    res.send("Cloud functions running!");
})

async function deleteOldItems() {
    try {
        functions.logger.info("Deleting all items older than 1 week");

        // Subtract 7 days from today and delete the news items from that day
        const today = new Date()
        today.setDate(today.getDate() - 7)

        const documents = firebase
            .firestore()
            .collection("news")
            .where("date", '<=', firestore.Timestamp.fromDate(today));


        await deleteQueryBatch(documents, (count) => {
            functions.logger.log(
                `Deleted all fetched on ${today}. ${count} older items deleted. Good job!`)
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
        await fetchNews();
        functions.logger.info("News Refreshed");
    } catch (error) {
        functions.logger.error('Error cleaning the database ' + error);
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