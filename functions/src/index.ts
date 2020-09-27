import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';

firebase.initializeApp();

import { categoryRouter } from './routes/categories';
import { newsRouter } from './routes/news';
import { MyJoyOnlineService } from './service/MyJoyOnlineService';

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

app.get("/", (req, res)=>{
    res.send("Cloud functions running!")
})

async function deleteAllItems(path: string) {
    try {
        functions.logger.info("Purging Database")
        // Get a new write batch
        const batch = firebase.firestore().batch();
        const documents = await firebase.firestore().collection(path).listDocuments();

        documents.map((val) => {
            batch.delete(val);
        });

        await batch.commit();

        functions.logger.info("Database Purged")
    } catch (error) {
        functions.logger.error(error);
    }
}


async function refreshNews() {
    functions.logger.info(`Refreshing news contents`);

    try {
        //always clear database before adding new entries
        await deleteAllItems('news');
        await new MyJoyOnlineService().fetchNews();
        functions.logger.info("News Refreshed");
    } catch (error) {
        functions.logger.error('Error cleaning the database' + error);
        throw (error)
    }
}

export const refreshNewsScheduler = functions.pubsub.schedule('every 60 minutes')
    .onRun(async () => refreshNews());

export const myApp = functions.runWith(
    {
        timeoutSeconds: 300,
        memory: '1GB'
    }
).https.onRequest(app);