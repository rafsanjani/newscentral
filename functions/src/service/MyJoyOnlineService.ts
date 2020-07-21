import { NewsService } from "./NewsService";

class MyJoyOnlineService implements NewsService{
    getNewsItem(newsUrl: string, categoryUrl: string): Promise<News> {
        throw new Error("Method not implemented.");
    }
    getNews(): string {
        throw new Error("Method not implemented.");
    }
}

export {MyJoyOnlineService}