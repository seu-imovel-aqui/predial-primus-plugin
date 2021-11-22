import { Request, RequestQueue } from "apify";
import { sleep } from "apify/build/utils";
import { Page } from "puppeteer";
import { PAGE_TYPE, RENT_URL, SELL_URL } from "./constants";
import { Ad, Address, Characteristic, Property, PropertyImage, State, TypeAd } from "@seu-imovel-aqui/plugin-types";

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

export const handlePagination = async (queue: RequestQueue, { request, page }: { request: Request, page: Page } ) => {
   const nextPage: number = (request.userData.page || 1) + 1;
   const links = await page.$$eval<{ url: string, payload: { partialAddress: { city: string, neighborhood: string } } }[]>(
      SELECTORS.LINKS,
      (elements: Element[], selectors: any) =>
         elements.map((element: Element) => {
            const url = (element as HTMLAnchorElement).href;
            const [ city, neighborhood ]: string[] = Array.from((element.parentNode.nextSibling as Element)
               .querySelectorAll(selectors.CITY_NEIGHBORHOOD))
               .slice(0, 2)
               .map(element => (element as Element).textContent);

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

   for(const { url, payload } of links) {
      await sleep(3000);
      queue.addRequest({
         url,
         userData: {
            ...request.userData,
            label: PAGE_TYPE.DETAIL,
            payload
         }
      });
   }

   const hasNextPage = await page.$$eval<boolean>(`button[aria-label*='page ${ nextPage }']`, button => !!button.length);

   if (hasNextPage) {
      queue.addRequest({
         url: (
            request.userData.typeAd === TypeAd.BUY
               ? SELL_URL
               : RENT_URL
         ).replace("{{page}}", nextPage.toString()),
         userData: {
            ...request.userData,
            page: nextPage
         }
      });
   }
};

export const handleDetail = async ({ request, page }: { request: Request, page: Page }) => {
   const link: string = page.url();
   const type: string = (await page.$eval<string>(SELECTORS.TITLE, element => element.textContent.trim()))
      .replace(/^(.*?)\s.*/, "$1")
      .trim();
   const typeAd: TypeAd = request.userData.typeAd;
   let description: string = await page.$eval<string>(SELECTORS.DESCRIPTION, (element: Element) => element.textContent);
   if(description.length === 0) {
      description = await page.$eval<string>(SELECTORS.TITLE, (element: Element) => element.textContent.split("|")[0]);
   }
   const price: string = await page.$eval<string>(SELECTORS.PRICE, (element: Element) => {
      const value: string = element.textContent.replace(/[^0-9,]/g, "").replace(/,/g, ".");
      return Number(value).toFixed(2);
   });
   const images: PropertyImage[] = [];
   const state: State = { name: "Rio de Janeiro", uf: "RJ" };
   const address: Address = { ...request.userData.payload.partialAddress, state };
   const characteristics = await getCharacteristics(page);

   await page.waitForSelector(SELECTORS.IMAGE)
      .then(async () => {
         images.push(...await page.$$eval<PropertyImage[]>(
            SELECTORS.IMAGE,
            (elements: Element[]) => elements.map((element: Element) => {
               return {
                  alt: "description",
                  link: (element as HTMLImageElement).src
               } as PropertyImage;
            })
         ));
      })
      .catch(() => {
         images.push({
            alt: "not found",
            link: "not found"
         } as PropertyImage);
      });

   const ad: Ad = {
      price,
      link,
      property: {
         description,
         address,
         characteristics,
         images,
         type
      } as Property,
      typeAd
   };

   return ad;
};

const getCharacteristics = async (page: Page): Promise<Characteristic[]> => {
   const characteristics: Characteristic[] = [];

   characteristics.push(...await page.$$eval<Characteristic<string>[]>(
      SELECTORS.IPTU_COND,
      (elements: Element[]) => {
         const [ condominiumElement, IPTUEelement ] = elements.slice(0, 2);
         return [
            {
               name: "Condomínio",
               value: condominiumElement.textContent
            } as Characteristic<string>,
            {
               name: "iptu",
               value: IPTUEelement.textContent
            } as Characteristic<string>
         ];
      }
   ));

   characteristics.push(...await page.$eval<Characteristic<string>[]>(
      SELECTORS.DETAILS,
      (element: Element, selectors: unknown) =>
         Array.from(element.querySelectorAll((selectors as Record<string, string>).DETAILS_INNER))
            .map((element: Element) => {
               const [ value, ...key ]: string[] = element.textContent.split(" ");
               return {
                  name: key.join(" "),
                  value
               } as Characteristic<string>;
            }), SELECTORS
   ));

   characteristics.push(...await page.$$eval<Characteristic<number>[]>(
      SELECTORS.PROPERTY_ITEMS,
      (elements: Element[]) =>
         elements.map((element: Element) => {
            return {
               name: element.textContent,
               value: 1
            } as Characteristic<number>;
         })
   ));

   return characteristics;
};

export const handlePage = async ({ request, page }: { request: Request, page: Page }) => {
   console.log("DEFAULT", request.url);
};
