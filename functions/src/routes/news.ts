import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';

const newsRouter = express.Router();

newsRouter.get('/', async (req, res, next) => {
    req.url = '/page/1'
    next()
});

newsRouter.get('/page/:pageNumber', async (req, res) => {
    const ref = firebase
        .firestore()
        .collection("news")
        .orderBy("date", "desc")
        .offset(Number(req.params.pageNumber) * 10 - 10)
        .limit(10);

    const items: FirebaseFirestore.DocumentData[] = [];

    try {
        const snapshot = await ref.get();

        snapshot.docs.forEach(element => {
            items.push(element.data());
        });

        if (items.length === 0) {
            res.status(200).send({
                status: "OK",
                message: "No news item found",
            })
        } else {
            const response: any = {
                status: "OK",
                message: `Fetch successful! ${items.length} items`,
                news: items
            };

            res.status(200).send(response);
        }

    } catch (error) {
        functions.logger.error(error);
        res.status(401).send(error);
    }

})


export { newsRouter };