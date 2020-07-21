import * as express from 'express';
import {Categories} from '../model/Categories';

const categoryRouter = express.Router();

categoryRouter.get('/', (req, res)=>{
    res.send(Categories);
});

export {categoryRouter};