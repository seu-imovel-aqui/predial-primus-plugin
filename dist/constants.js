"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RENT_URL = exports.SELL_URL = exports.PAGE_TYPE = void 0;
var PAGE_TYPE;
(function (PAGE_TYPE) {
    PAGE_TYPE["PAGINATION"] = "pagination";
    PAGE_TYPE["DETAIL"] = "detail";
})(PAGE_TYPE = exports.PAGE_TYPE || (exports.PAGE_TYPE = {}));
exports.SELL_URL = "https://www.predialprimus.com.br/busca?tipo=vendas&page={{page}}";
exports.RENT_URL = "https://www.predialprimus.com.br/busca?tipo=locacao&page={{page}}&taxa=com";
