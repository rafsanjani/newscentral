import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';

const newsRef = firebase.firestore().collection("news").orderBy("date", "desc");

const newsRouter = express.Router();

newsRouter.get('/', async (req, res) => {
    const items: FirebaseFirestore.DocumentData[] = [];

    try {
        const snapshot = await newsRef.get();
        snapshot.docs.forEach(element => {
            items.push(element.data());
        });

        if (items.length === 0) {
            res.status(204).send({
                status: "OK",
                message: "No news item found",
                news: items
            })
        } else {
            res.status(200).send({
                status: "OK",
                message: `Fetch successful! ${items.length} items`,
                news: items
            });
        }

    } catch (error) {
        functions.logger.error(error);
        res.status(401).send(error);
    }
});

export { newsRouter };