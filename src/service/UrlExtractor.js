export class UrlExtractor {
  TIKI_VN = "tiki.vn";
  SHOPEE_VN = "shopee.vn";

  extractTikiProductId(url) {
    const start = url.lastIndexOf("-p") + 2;
    const end = url.search(".html");
    const productId = url.substring(start, end);
    return productId;
  }

  extractShopeeProductIds(url) {
    const start = url.lastIndexOf("-i") + 2;
    const end = url.length;
    const idStr = url.substring(start, end);
    const ids = idStr.split(".");
    return { itemId: ids[2], shopId: ids[1] };
  }

  extractHostname(url) {
    var hostname;
    //find & remove protocol (http, ftp, etc.) and get hostname

    if (url.indexOf("//") > -1) {
      hostname = url.split("/")[2];
    } else {
      hostname = url.split("/")[0];
    }

    //find & remove port number
    hostname = hostname.split(":")[0];
    //find & remove "?"
    hostname = hostname.split("?")[0];

    return hostname;
  }
}
