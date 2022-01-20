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
Object.defineProperty(exports, "__esModule", { value: true });
exports.handlePage = exports.handleDetail = exports.handlePagination = void 0;
const utils_1 = require("apify/build/utils");
const constants_1 = require("./constants");
const plugin_types_1 = require("@seu-imovel-aqui/plugin-types");
const SELECTORS = {
    LINKS: "div > a[href^='/imovel']",
    TITLE: "div.MuiContainer-root.MuiContainer-maxWidthLg > h6",
    DESCRIPTION: "div > p.MuiTypography-root.MuiTypography-body1",
    PRICE: "div > h6.MuiTypography-root.MuiTypography-h6.MuiTypography-alignRight",
    CITY_NEIGHBORHOOD: "p.MuiTypography-root.MuiTypography-body2",
    IPTU_COND: "div > p.MuiTypography-root.MuiTypography-body1.MuiTypography-colorTextSecondary.MuiTypography-alignRight",
    DETAILS: "div.MuiGrid-root.MuiGrid-container.MuiGrid-spacing-xs-2.MuiGrid-align-items-xs-center.MuiGrid-justify-xs-space-evenly",
    DETAILS_INNER: "div.MuiGrid-container > div.MuiGrid-root.MuiGrid-item > p",
    PROPERTY_ITEMS: "p.MuiTypography-root.MuiTypography-subtitle2.MuiTypography-colorSecondary.MuiTypography-paragraph + div > .MuiGrid-item",
    IMAGE: "span.image-gallery-thumbnail-inner > img.image-gallery-thumbnail-image"
};
const handlePagination = (queue, { request, page }) => __awaiter(void 0, void 0, void 0, function* () {
    const nextPage = (request.userData.page || 1) + 1;
    const links = yield page.$$eval(SELECTORS.LINKS, (elements, selectors) => elements.map((element) => {
        const url = element.href;
        const [city, neighborhood] = Array.from(element.parentNode.nextSibling
            .querySelectorAll(selectors.CITY_NEIGHBORHOOD))
            .slice(0, 2)
            .map(element => element.textContent);
        return {
            url,
            payload: {
                partialAddress: {
                    city,
                    neighborhood
                }
            }
        };
    }), SELECTORS);
    for (const { url, payload } of links) {
        yield (0, utils_1.sleep)(3000);
        queue.addRequest({
            url,
            userData: Object.assign(Object.assign({}, request.userData), { label: constants_1.PAGE_TYPE.DETAIL, payload })
        });
    }
    const hasNextPage = yield page.$$eval(`button[aria-label*='page ${nextPage}']`, button => !!button.length);
    if (hasNextPage) {
        queue.addRequest({
            url: (request.userData.typeAd === plugin_types_1.TypeAd.BUY
                ? constants_1.SELL_URL
                : constants_1.RENT_URL).replace("{{page}}", nextPage.toString()),
            userData: Object.assign(Object.assign({}, request.userData), { page: nextPage })
        });
    }
});
exports.handlePagination = handlePagination;
const handleDetail = ({ request, page }) => __awaiter(void 0, void 0, void 0, function* () {
    const link = page.url();
    const type = (yield page.$eval(SELECTORS.TITLE, element => element.textContent.trim()))
        .replace(/^(.*?)\s.*/, "$1")
        .trim();
    const typeAd = request.userData.typeAd;
    let description = yield page.$eval(SELECTORS.DESCRIPTION, (element) => element.textContent);
    if (description.length === 0) {
        description = yield page.$eval(SELECTORS.TITLE, (element) => element.textContent.split("|")[0]);
    }
    const price = yield page.$eval(SELECTORS.PRICE, (element) => {
        const value = element.textContent.replace(/[^0-9,]/g, "").replace(/,/g, ".");
        return Number(value).toFixed(2);
    });
    const images = [];
    const state = { name: "Rio de Janeiro", uf: "RJ" };
    const address = Object.assign(Object.assign({}, request.userData.payload.partialAddress), { state });
    const characteristics = yield getCharacteristics(page);
    yield page.waitForSelector(SELECTORS.IMAGE)
        .then(() => __awaiter(void 0, void 0, void 0, function* () {
        images.push(...yield page.$$eval(SELECTORS.IMAGE, (elements) => elements.map((element) => {
            return {
                alt: "description",
                link: element.src
            };
        })));
    }))
        .catch((e) => {
        console.log(e.message);
    });
    const ad = {
        price,
        link,
        property: {
            description,
            address,
            characteristics,
            images,
            type
        },
        typeAd
    };
    return ad;
});
exports.handleDetail = handleDetail;
const getCharacteristics = (page) => __awaiter(void 0, void 0, void 0, function* () {
    const characteristics = [];
    characteristics.push(...yield page.$$eval(SELECTORS.IPTU_COND, (elements) => {
        const [condominiumElement, IPTUEelement] = elements.slice(0, 2);
        return [
            {
                name: "Condomínio",
                value: condominiumElement.textContent
            },
            {
                name: "iptu",
                value: IPTUEelement.textContent
            }
        ];
    }));
    characteristics.push(...yield page.$eval(SELECTORS.DETAILS, (element, selectors) => Array.from(element.querySelectorAll(selectors.DETAILS_INNER))
        .map((element) => {
        const [value, ...key] = element.textContent.split(" ");
        return {
            name: key.join(" "),
            value
        };
    }), SELECTORS));
    characteristics.push(...yield page.$$eval(SELECTORS.PROPERTY_ITEMS, (elements) => elements.map((element) => {
        return {
            name: element.textContent,
            value: 1
        };
    })));
    return convertsToDefaultSeuImovelAqui(characteristics);
});
const handlePage = ({ request, page }) => __awaiter(void 0, void 0, void 0, function* () {
    console.log("DEFAULT", request.url);
});
exports.handlePage = handlePage;
const convertsToDefaultSeuImovelAqui = (characteristics) => {
    const characteristicsAux = [];
    characteristics.forEach((characteristic) => {
        if (characteristic.name === "de Área") {
            characteristic.name = plugin_types_1.CharacteristicMain.AREA;
        }
        if (characteristic.name === "Banheiro(s)") {
            characteristic.name = plugin_types_1.CharacteristicMain.BATHROOM;
        }
        if (characteristic.name === "Quarto(s)") {
            characteristic.name = plugin_types_1.CharacteristicMain.BEDROOM;
        }
        if (characteristic.name === "Vaga de Garagem") {
            characteristic.name = plugin_types_1.CharacteristicMain.PARKING_SPACE;
        }
        if (characteristic.name === "Suíte") {
            characteristic.name = plugin_types_1.CharacteristicMain.SUITE;
        }
        characteristicsAux.push(characteristic);
    });
    return characteristicsAux;
};
