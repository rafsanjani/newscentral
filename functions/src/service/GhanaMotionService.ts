import * as Request from 'request';
import * as Cheerio from 'cheerio';
import * as firebase from 'firebase-admin';
import * as bcrypt from 'bcrypt';
import { NewsService } from './NewsService';


const PAGE_LENGTH: Number = 3;


const CategoryUrls = {
    music: 'https://news.ghanamotion.com/category/music/',
    sport: 'https://news.ghanamotion.com/category/sport/',
    showbiz: 'https://news.ghanamotion.com/category/showbiz/',
    lifestyle: 'https://news.ghanamotion.com/category/lifestyle/',
    regional: 'https://news.ghanamotion.com/category/news/regional-news/',
    business: 'https://news.ghanamotion.com/category/business/'
};

const db = firebase.firestore().collection("news");

class GhanaMotionService implements NewsService {
    getNews(): string {
        throw new Error("Method not implemented.");
    }

    getNewsItem(newsUrl: string, categoryUrl: string): Promise<News> {
        return new Promise<News>((resolve, reject) => {
            Request(newsUrl, async function (error, response, html) {
                if (error && response.statusCode !== 200) {
                    console.log(error);
                    reject(error);
                }

                const $ = Cheerio.load(html);
                const headline = $('.post-title').first().text().trim();
                const date = $('.post-meta > span').first().text();
                const imageUrl = $('.single-post-thumb > img').first().attr('src');
                let content = ' ';

                //grab individual paragraphs from article, concatenate them together and separate them using a newline character
                $('.entry > p').each(function (this: cheerio.Cheerio) {
                    const paragraph = $(this).text();
                    content = content.concat(paragraph, '\n'); //append a newline character after each paragraph
                });

                //some articles may contain quotes
                $('.entry > blockquote > p').each(function (this: cheerio.Cheerio) {
                    const paragraph = $(this).text().trim();

                    if (paragraph.length !== 0)
                        content = content.concat(paragraph, '\n');
                });


                try {
                    const newsItem: News = {
                        id: bcrypt.hashSync(imageUrl, 3),
                        headline: headline,
                        content: content.trimLeft().trimRight(),
                        date: date,
                        imageUrl: imageUrl!,
                        category: 'politics'
                    };
                    resolve(newsItem);

                } catch (error) {
                    reject(error);
                }

            });
        });
    }

    getKeyByValue(obj: Object, val: String) {
        return Object.entries(obj).find(i => i[1] === val);
    }


    public async main(): Promise<string> {
        for (const [title, url] of Object.entries(CategoryUrls)) {
            console.log("Getting Base Urls For: " + title);
            try {
                await this.fetchNews(url);
            } catch (e) {
                console.log(`Error fetching News: ${e}`)
                return "Failure";
            }
        }

        return "Success";
    }

    async saveNewsItem(newsItem: News) {
        try {
            const savedNews = await db.doc().set(newsItem);
            console.log("Saved", savedNews.writeTime);
        } catch (error) {
            console.log("Failed: ", error)
        }
    }

    validateNews(newsItem: News): boolean {
        return (newsItem.content === "" || newsItem.imageUrl === "")
    }

    async fetchNews(pageUrl: string): Promise<void> {
        const newsUrls = await this.getUrls(pageUrl);
        console.log(newsUrls.length + " News Item Urls in Page: " + pageUrl + "...");

        for (const url of newsUrls) {
            try {
                const newsItem = await this.getNewsItem(url, pageUrl);
                await this.saveNewsItem(newsItem);
            } catch (error) {
                console.log("Bad news item");
            }
        }
    }

    buildUrls(url: String, length: Number) {
        const urls = [];
        for (let i = 1; i <= length; i++) {
            urls.push(url.concat('page/', i.toString()));
        }
        return urls;
    }

    async getUrls(category: string): Promise<string[]> {
        const newsPageUrls = this.buildUrls(category, PAGE_LENGTH);
        const newsUrls: string[] = [];

        return new Promise((resolve, reject) => {
            let count = 0;
            newsPageUrls.forEach(function (url) {
                Request(url, function (error, response, html) {
                    count++;
                    if (!error && response.statusCode === 200) {
                        const $ = Cheerio.load(html);

                        $('.post-box-title > a').each(function (this: cheerio.Cheerio) {
                            const newsItemUrl: string = $(this).attr('href')!;
                            newsUrls.push(newsItemUrl);
                        });

                        //stop the process when PAGE_LENGTH number of pages are processed. We don't want to go all the way to infinity
                        if (count === PAGE_LENGTH)
                            resolve(newsUrls);
                    } else {
                        reject(error)
                        console.log(error);
                    }
                });
            });
        }
        )
    }
}

export { GhanaMotionService };