import * as bcrypt from 'bcrypt';
import * as Request from 'request';
import * as Cheerio from 'cheerio'
import * as firebase from 'firebase-admin';

class MyJoyOnlineService {
    private url = "https://www.myjoyonline.com/category/news/";
    private db = firebase.firestore().collection("news");

    async fetchNews(): Promise<void> {
        const newsItems: News[] = [];
        try {
            const newsUrls = await this.getUrls();

            for (const url of newsUrls) {
                const news = await this.getNewsItem(url);
                newsItems.push(news);
            }

            await this.saveNewsItems(newsItems);
        } catch (error) {
            console.log(error);
        }
    }

    private async saveNewsItems(newsItems: News[]) {
        for (const news of newsItems) {
            try {
                const savedNews = await this.db.doc().set(news);
                console.log("Saved", savedNews.writeTime);
            } catch (error) {
                console.log("Failed: ", error)
            }
        }

    }

    private async getNewsItem(url: string): Promise<News> {
        return new Promise<News>((resolve, reject) => {
            Request(url, (error, response, html) => {
                if (!error && response.statusCode === 200) {

                    const $ = Cheerio.load(html);

                    const title = $('.article-title > a > h1').first().text();
                    const date = $('.article-meta > div').first().text();
                    const imageUrl = $('.img-holder > a').first().attr('data-src')?.toString()!;
                    let content = '';

                    $('#article-text > p').each(function (this: CheerioStatic) {
                        const paragraph = $(this).text();
                        content = content.concat(paragraph, '\n'); //append a newline character after each paragraph
                    });

                    const news: News = {
                        id: bcrypt.hashSync(imageUrl, 3),
                        content: content,
                        headline: title,
                        date: date,
                        category: 'politics',
                        imageUrl: imageUrl
                    }

                    resolve(news);
                } else {
                    console.log(error);
                    reject(error);
                }
            })
        });
    }

    private async getUrls(): Promise<string[]> {
        const newsUrls: string[] = [];

        return new Promise((resolve, reject) => {
            Request(this.url, function (error, response, html) {
                if (!error && response.statusCode === 200) {

                    const $ = Cheerio.load(html);

                    $('.most-popular-list > li > a').each(function (i, element) {
                        newsUrls.push($(this).attr('href')!);
                    });

                    $('.home-latest-list > li > a').each(function (i, element) {
                        newsUrls.push($(this).attr('href')!);
                    });

                } else {
                    reject(error)
                    console.log(error);
                }

                resolve(newsUrls);
            });
        }
        )
    }
}

export { MyJoyOnlineService }