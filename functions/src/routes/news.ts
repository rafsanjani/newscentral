import * as express from 'express';
import * as firebase from 'firebase-admin';
import { GhanaMotionService } from '../service/GhanaMotionService';


const newsRef = firebase.firestore().collection("news");

const newsRouter = express.Router();

newsRouter.get('/', async (req, res) => {
    const items: FirebaseFirestore.DocumentData[] = [];
    try {
        const snapshot = await newsRef.get();
        snapshot.docs.forEach(element => {
            items.push(element.data());
        });
        res.status(200).send(items);
    } catch (error) {
        res.status(401).send(error);
    }
});

//only used for debugging
newsRouter.get("/add", async (req, res) => {
    try {
        const result = await new GhanaMotionService().main();
        res.status(200).send(result);
    } catch (error) {
        res.status(401).send(error);
    }
});

export { newsRouter };