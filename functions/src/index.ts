import * as functions from 'firebase-functions';
import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as moment from 'moment';

firebase.initializeApp();
import { categoryRouter } from './routes/categories';
import { newsRouter } from './routes/news';
import { GhanaMotionService } from './service/GhanaMotionService';

const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

//routers
app.use('/categories', categoryRouter);
app.use('/news', newsRouter)

app.get("/", (req, res) => {
    res.send("Cloud functions set up!!!!");
});

async function deleteAllItems(path: string) {
    try {
        // Get a new write batch
        const batch = firebase.firestore().batch();
        const documents = await firebase.firestore().collection(path).listDocuments();
        documents.map((val) => {
            batch.delete(val);
        });
        await batch.commit();
        console.log("All records deleted!");
    } catch (error) {
        console.log("error");
    }
}


async function refreshNews() {
    const time = moment().format("dddd: MMMM D, YYYY HH:mm:SS");
    console.log('Refreshing news items on: ' + time);

    try {
        //always clear database before adding new entries
        await deleteAllItems('news');
        console.log("database cleared");
    } catch (error) {
        console.log('Error cleaning the database' + error);
    }

    await new GhanaMotionService().main();
    console.log("News Refreshed");
}

export const refreshNewsScheduler = functions.pubsub.schedule('every 30 minutes')
    .onRun(async () => refreshNews());

export const myApp = functions.runWith(
    {
        timeoutSeconds: 300,
        memory: '1GB'
    }
).https.onRequest(app);