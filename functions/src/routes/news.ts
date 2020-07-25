import * as express from 'express';
import * as firebase from 'firebase-admin';



const newsRef = firebase.firestore().collection("news");

const newsRouter = express.Router();

newsRouter.get('/', async (req, res) => {
    const items: FirebaseFirestore.DocumentData[] = [];

    try {
        const snapshot = await newsRef.get();
        snapshot.docs.forEach(element => {
            items.push(element.data());
        });

        if (items.length === 0) {
            res.status(400).send({
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
        res.status(401).send(error);
    }
});

// //only used for debugging news should be added automatically by cloud logging function
// newsRouter.get("/add", async (req, res) => {
//     try {
//         const result = await new GhanaMotionService().main();
//         res.status(200).send(result);
//     } catch (error) {
//         res.status(401).send(error);
//     }
// });

export { newsRouter };