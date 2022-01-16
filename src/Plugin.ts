import Apify from "apify";
import{ handlePagination, handleDetail, handlePage } from "./routes";
import{ PAGE_TYPE, RENT_URL, SELL_URL } from "./constants";
import{ Plugin } from "@seu-imovel-aqui/plugin";
import{ Ad, TypeAd } from "@seu-imovel-aqui/plugin-types";
import rimraf from "rimraf";

export class PredialPrimusPlugin implements Plugin {
   private stackData: Ad[] = [];

   executeScraping() {
      return new Promise<Ad[]>((resolve, reject) => {
         (async () => {
            const queue = await Apify.openRequestQueue();

            queue.addRequest({
               url: SELL_URL.replace("{{page}}", "1"),
               userData: { typeAd: TypeAd.BUY }
            });

            queue.addRequest({
               url: RENT_URL.replace("{{page}}", "1"),
               userData: { typeAd: TypeAd.RENT }
            });

            const crawler = new Apify.PuppeteerCrawler({
               requestQueue: queue,
               launchContext: {
                  useChrome: true,
                  stealth: true,
                  launchOptions: {
                     headless: true
                  } as any
               },
               handlePageFunction: async (context) => {
                  const label: PAGE_TYPE = context.request.userData.label || PAGE_TYPE.PAGINATION;
                  switch(label) {
                     case PAGE_TYPE.PAGINATION:
                        return handlePagination(queue, context);
                     case PAGE_TYPE.DETAIL:
                        return handleDetail(context).then((ad: Ad) => {
                           this.stackData.push(ad);
                        });
                     default: return handlePage(context);
                  }
               },
               navigationTimeoutSecs: 120
            });

            await crawler.run();
            await queue.drop();
            rimraf.sync("./apify_storage");
            resolve(this.stackData);
         })();
      });
   }
}

// (async () => {
//    const plugin = new PredialPrimusPlugin();
//    const result = await plugin.executeScraping();
//    console.log(result);
// })();

