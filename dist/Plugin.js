"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PredialPrimusPlugin = void 0;
const apify_1 = __importDefault(require("apify"));
const routes_1 = require("./routes");
const constants_1 = require("./constants");
const plugin_types_1 = require("@seu-imovel-aqui/plugin-types");
const rimraf_1 = __importDefault(require("rimraf"));
class PredialPrimusPlugin {
    constructor() {
        this.stackData = [];
        this.cont = 0;
    }
    executeScraping(indexToScraping = 0) {
        return new Promise((resolve, reject) => {
            (() => __awaiter(this, void 0, void 0, function* () {
                const queue = yield apify_1.default.openRequestQueue();
                queue.addRequest({
                    url: constants_1.SELL_URL.replace("{{page}}", "1"),
                    userData: { typeAd: plugin_types_1.TypeAd.BUY }
                });
                queue.addRequest({
                    url: constants_1.RENT_URL.replace("{{page}}", "1"),
                    userData: { typeAd: plugin_types_1.TypeAd.RENT }
                });
                const crawler = new apify_1.default.PuppeteerCrawler({
                    requestQueue: queue,
                    launchContext: {
                        useChrome: true,
                        stealth: true,
                        launchOptions: {
                            headless: true
                        }
                    },
                    handlePageFunction: (context) => __awaiter(this, void 0, void 0, function* () {
                        const label = context.request.userData.label || constants_1.PAGE_TYPE.PAGINATION;
                        switch (label) {
                            case constants_1.PAGE_TYPE.PAGINATION:
                                return (0, routes_1.handlePagination)(queue, context);
                            case constants_1.PAGE_TYPE.DETAIL:
                                // full import
                                if (indexToScraping == 0) {
                                    return (0, routes_1.handleDetail)(context).then((ad) => {
                                        this.stackData.push(ad);
                                    });
                                    // import in parts
                                }
                                else {
                                    this.cont++;
                                    if (indexToScraping > 0 && this.cont >= indexToScraping) {
                                        return (0, routes_1.handleDetail)(context).then((ad) => {
                                            this.stackData.push(ad);
                                        });
                                    }
                                }
                                break;
                            default: return (0, routes_1.handlePage)(context);
                        }
                    }),
                    navigationTimeoutSecs: 120
                });
                yield crawler.run();
                yield queue.drop();
                rimraf_1.default.sync("./apify_storage");
                resolve(this.stackData);
            }))();
        });
    }
}
exports.PredialPrimusPlugin = PredialPrimusPlugin;
// (async () => {
//    const plugin = new PredialPrimusPlugin();
//    const result = await plugin.executeScraping();
//    console.log(result);
// })();
