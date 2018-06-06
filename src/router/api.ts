import * as Router from 'koa-router';
import * as main from '../controller/main';

const router = new Router();

router.get('/access_token', main.getAccessToken);
router.get('/new_access_token', main.refreshAccessToken);

export default router;
