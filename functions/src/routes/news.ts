import * as express from 'express';
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import {News} from "../model/News";

const newsRouter = express.Router();

newsRouter.get('/', async (req, res, next) => {
    req.url = '/page/1'
    next()
});

newsRouter.get('/page/:pageNumber', async (req, res) => {
    const ref = firebase
        .firestore()
        .collection("news")
        .where('date', '<=', new Date())
        .orderBy("date", "desc")
        .offset(Number(req.params.pageNumber) * 10 - 10)
        .limit(10);

    try {
        const snapshot = await ref.get();
        const newsItems: News[] = [];

        snapshot.docs.forEach(document => {
            newsItems.push(
                {
                    headline: document.get('headline'),
                    content: document.get('content'),
                    imageUrl: document.get('imageUrl'),
                    id: document.id.toString(),
                    category: document.get('category'),
                    date: new Date(document.get('date').toDate())
                }
            )
            // items.push(document.data());
        });

        if (newsItems.length === 0) {
            res.status(200).send({
                status: "OK",
                message: "No news item found",
            })
        } else {
            const response: any = {
                status: "OK",
                message: `Fetch successful! ${newsItems.length} items`,
                news: newsItems
            };

            res.status(200).send(response);
        }

    } catch (error) {
        functions.logger.error(error);
        res.status(401).send(error);
    }

})


export { newsRouter };