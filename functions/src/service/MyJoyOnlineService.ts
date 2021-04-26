import * as bcrypt from 'bcrypt';
import * as Request from 'request';
import * as Cheerio from 'cheerio'
import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import moment = require('moment');

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
            functions.logger.error(error);
            throw (error)
        }
    }

    private async saveNewsItems(newsItems: News[]) {
        for (const news of newsItems) {
            try {
                //check if a similar news item with the same title exists before attempting to save it
                const query = this.db.where("headline", "==", news.headline);

                const data = await query.get();

                if (data.size >= 1) {
                    functions.logger.debug(`Title: ${news.headline} exists. Skipping!`)
                    return
                } 

                const savedNews = await this.db.doc().set(news);
                functions.logger.debug("Saved", savedNews.writeTime);
                
            } catch (error) {
                functions.logger.error(error);
            }
        }

    }

    private async getNewsItem(url: string): Promise<News> {
        return new Promise<News>((resolve, reject) => {
            Request(url, (error, response, html) => {
                if (!error && response.statusCode === 200) {
                    const $ = Cheerio.load(html);

                    const title = $('.article-title > a > h1').first().text();
                    const date = $('.article-meta > div').first().text().trim();


                    const imageUrl = $('.img-holder > a').first().attr('data-src')?.toString()!;
                    let content = '';

                    $('#article-text > p').each(function (this: cheerio.Cheerio) {
                        const paragraph = $(this).text();
                        content = content.concat(paragraph, '\n'); //append a newline character after each paragraph
                    });

                    const news: News = {
                        id: bcrypt.hashSync(imageUrl, 3),
                        content: content,
                        headline: title.trim(),
                        date: moment(date, "DD MMM YYYY hh:mma").format(),
                        category: 'politics',
                        imageUrl: imageUrl
                    }

                    resolve(news);
                } else {
                    functions.logger.error(error);
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

                    // $('.most-popular-list > li > a').each(function (i, element) {
                    //     newsUrls.push($(this).attr('href')!);
                    // });

                    $('.home-latest-list > li > a').each(function (i, element) {
                        newsUrls.push($(this).attr('href')!);
                    });

                } else {
                    reject(error)
                    functions.logger.log(error);
                }

                resolve(newsUrls);
            });
        }
        )
    }
}

export { MyJoyOnlineService }