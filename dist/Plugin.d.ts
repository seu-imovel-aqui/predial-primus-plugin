import { Plugin } from "@seu-imovel-aqui/plugin";
import { Ad } from "@seu-imovel-aqui/plugin-types";
export declare class PredialPrimusPlugin implements Plugin {
    private stackData;
    executeScraping(): Promise<Ad[]>;
}
