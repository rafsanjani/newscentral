import * as firebase from 'firebase-admin';
import * as functions from 'firebase-functions';
import axios, {AxiosError} from "axios";
import {News} from "../model/News";
import * as Cheerio from "cheerio";
import {v4 as uuidv4} from 'uuid';
import TagElement = cheerio.TagElement;

const admin = firebase

if (admin.apps?.length === 0) {
    admin.initializeApp()
}

// class News_service {
const BASE_NEWS_URL = "http://peacefmonline.com/";

const newsPath = "pages/politics/"

const firestoreCollection = firebase.firestore().collection("news");

export async function fetchNews(): Promise<void> {
    try {
        const newsUrls = await getUrls();

        const newsItems = await Promise.all(
            newsUrls.map(url => getNewsItem(url))
        )

        await saveNewsItems(newsItems);
    } catch (error) {
        functions.logger.error(error);
        throw (error)
    }
}

async function saveNewsItems(newsItems: News[]) {
    const saveItem = async (item: News) => {
        const query = firestoreCollection.where("headline", "==", item.headline);
        const results = await query.get()

        if (!results.empty) {
            functions.logger.debug(`Title: ${item.headline} exists. Skipping!`)
            return
        }

        const savedItem = await firestoreCollection.doc().set(item);
        functions.logger.debug("Saved", savedItem.writeTime);
        return true
    }

    await Promise.all(
        newsItems.map(item => saveItem(item))
    )
}

/**
 * Get a single news item from a specific url
 * @param url The url of the news item
 */
async function getNewsItem(url: string): Promise<News> {

    const response = await axios.get<string>(url)

    if (response instanceof AxiosError) {
        throw response
    }

    const responseData = response.data
    const $ = Cheerio.load(responseData, {lowerCaseAttributeNames: true})

    const headline = $("h1").first().text()
    const imageUrl = $(".wp-image-133").attr("src") ?? ""
    const content = $(".content-inner > p").text()
    const news: News = {
        headline: headline,
        imageUrl: imageUrl,
        date: new Date(),
        id: uuidv4(),
        content: content,
        category: "politics"
    }

    return news
}

async function getUrls(): Promise<string[]> {
    const newsUrls: string[] = []

    const response = await axios.get<string>(`${BASE_NEWS_URL}${newsPath}`)

    if (response instanceof AxiosError) {
        throw response
    }

    const responseData = response.data

    const $ = Cheerio.load(
        responseData, {lowerCaseAttributeNames: true}
    );

    const headlinesSelector = $('.jeg_thumb > a')

    headlinesSelector.each((index: Number, element) => {
        const url = element as TagElement

        if (url !== undefined) {
            newsUrls.push(
                url.attribs['href']
            )
        }
    })

    return newsUrls.filter((item) => item.includes(BASE_NEWS_URL))
}
