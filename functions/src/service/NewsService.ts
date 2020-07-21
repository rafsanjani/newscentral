interface NewsService {
    getNews(): string;
    getNewsItem(newsUrl: string, categoryUrl: string): Promise<News>;
}

export { NewsService }