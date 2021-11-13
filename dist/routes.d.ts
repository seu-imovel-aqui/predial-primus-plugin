import { Request, RequestQueue } from "apify";
import { Page } from "puppeteer";
import { Ad } from "@seu-imovel-aqui/plugin-types";
export declare const handlePagination: (queue: RequestQueue, { request, page }: {
    request: Request;
    page: Page;
}) => Promise<void>;
export declare const handleDetail: ({ request, page }: {
    request: Request;
    page: Page;
}) => Promise<Ad>;
export declare const handlePage: ({ request, page }: {
    request: Request;
    page: Page;
}) => Promise<void>;
