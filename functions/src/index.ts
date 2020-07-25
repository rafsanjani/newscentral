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
    functions.logger.info(`Refreshing news`);

    try {
        //always clear database before adding new entries
        await deleteAllItems('news');
        functions.logger.info("database cleared");
        await new MyJoyOnlineService().fetchNews();
        functions.logger.info("News Refreshed");
    } catch (error) {
        functions.logger.error('Error cleaning the database' + error);
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