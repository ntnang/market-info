const LodashArray = require("lodash/array");
const ProductOrigin = require("../constants/ProductOrigin");
const TikiProductService = require("./tiki/ProductService");
const ShopeeProductService = require("./shopee/ProductService");

const fetchProduct = (origin, itemId, shopId) => {
  if (origin == ProductOrigin.TIKI_VN) {
    return TikiProductService.getProduct(itemId);
  } else if (origin == ProductOrigin.SHOPEE_VN) {
    return ShopeeProductService.getProduct(itemId, shopId);
  } else {
    return new Promise((resolve, _) => {
      resolve(null);
    });
  }
};

const checkProductChanges = (persistedProduct) => {
  fetchProduct(
    persistedProduct.origin,
    persistedProduct.id,
    persistedProduct.sellers[0].id
  ).then((fetchedProduct) => {
    const currentDateTime = new Date();
    const isChanged = updateVariants(
      fetchedProduct,
      persistedProduct,
      currentDateTime
    );
    if (isChanged) {
      persistedProduct.lastTrackedDate = currentDateTime;
    }
    persistedProduct.save();
  });
};

const updateProductMetadata = (fetchedProduct, persistedProduct) => {
  persistedProduct.name = fetchedProduct.name;
  persistedProduct.thumbnailUrl = fetchedProduct.thumbnailUrl;
  persistedProduct.imagesUrls = fetchedProduct.imagesUrls;
  persistedProduct.minPrice = fetchedProduct.minPrice;
  persistedProduct.maxPrice = fetchedProduct.maxPrice;

  const newOptions = LodashArray.difference(
    fetchedProduct.options.map((option) => option.name),
    persisted.options.map((option) => option.name)
  );

  persistedProduct.options.push(
    fetchProduct.options.filter((option) => newOptions.includes(option.name))
  );

  persistedProduct.options.forEach((persistedOption) =>
    LodashArray.union(
      persistedOption.values,
      fetchProduct.options.find(
        (fetchedOption) => fetchedOption.name === persistedOption.name
      ).values
    )
  );
};

const updateVariantMetadata = (fetchedVariant, persistedVariant) => {
  persistedVariant.name = fetchedVariant.name;
  persistedVariant.imagesUrls = fetchedVariant.imagesUrls;
};

const updateSellers = (fetchedProduct, persistedProduct) => {
  const fetchedSellers = fetchedProduct.sellers;
  const fetchedSellerIds = fetchedSellers.map((seller) => seller.id);

  const persistedSellers = persistedProduct.sellers;
  const persistedSellerIds = persistedSellers.map((seller) => seller.id);

  const newSellerIds = LodashArray.difference(
    fetchedSellerIds,
    persistedSellerIds
  );
  persistedSellers.push(
    fetchedSellers.filter((seller) => newSellerIds.includes(seller.id))
  );
};

const updateVariants = (fetchedProduct, persistedProduct, currentDateTime) => {
  const fetchedVariants = fetchedProduct.variants;
  const fetchedVariantIds = fetchedVariants.map((variant) => variant.id);

  const persistedVariants = persistedProduct.variants;
  const persistedVariantIds = persistedVariants.map((variant) => variant.id);

  const newVariantIds = LodashArray.difference(
    fetchedVariantIds,
    persistedVariantIds
  );
  persistedProduct.variants.push(
    fetchedVariants.filter((variant) => newVariantIds.includes(variant.id))
  );

  const suspendedVariantIds = LodashArray.difference(
    persistedVariantIds,
    fetchedVariantIds
  );
  persistedVariants
    .filter((variant) => suspendedVariantIds.includes(variant.id))
    .forEach((variant) =>
      variant.sellers.forEach((seller) =>
        seller.priceHistories.push({
          price: null,
          trackedDate: currentDateTime,
        })
      )
    );

  const stillOnSaleVariantIds = LodashArray.intersection(
    fetchedVariantIds,
    persistedVariantIds
  );
  const isPriceChanged = fetchedVariants
    .filter((variant) => stillOnSaleVariantIds.includes(variant.id))
    .map((fetchedVariant) => {
      const persistedVariant = persistedVariants.filter(
        (variant) => variant.id === fetchedVariant.id
      );
      return updatePriceHistories(
        fetchedVariant,
        persistedVariant,
        currentDateTime
      );
    })
    .some((isChanged) => isChanged);
  return (
    isPriceChanged || newVariantIds.length > 0 || suspendedVariantIds.length > 0
  );
};

const updatePriceHistories = (
  fetchedVariant,
  persistedVariant,
  currentDateTime
) => {
  let anySellerPriceChanged = false;

  const fetchedSellers = fetchedVariant.sellers;
  const fetchedSellerIds = fetchedSellers.map((seller) => seller.id);

  const persistedSellers = persistedVariant.sellers;
  const persistedSellerIds = persistedSellers.map((seller) => seller.id);

  const ongoingSellerIds = fetchedSellerIds.filter((sellerId) =>
    persistedSellerIds.includes(sellerId)
  );
  const openSellerIds = fetchedSellerIds.filter(
    (sellerId) => !persistedSellerIds.includes(sellerId)
  );
  const closedSellerIds = persistedSellerIds.filter(
    (sellerId) => !fetchedSellerIds.includes(sellerId)
  );

  ongoingSellerIds.forEach((sellerId) => {
    const priceHistories = persistedSellers.filter(
      (seller) => seller.id === sellerId
    ).priceHistories;
    const lastPriceHistory = priceHistories[priceHistories.length - 1];
    const newPriceHistory = fetchedSellers.filter(
      (seller) => seller.id === sellerId
    ).priceHistories[0];
    if (newPriceHistory.price !== lastPriceHistory.price) {
      priceHistories.push({
        price: newPriceHistory.price,
        trackedDate: currentDateTime,
      });
      anySellerPriceChanged = true;
    }
  });

  openSellerIds.forEach((sellerId) => {
    const newSeller = fetchedSellers.get.filter(
      (seller) => seller.id === sellerId
    );
    persistedSellers.push({
      id: sellerId,
      name: newSeller.name,
      logoUrl: newSeller.logoUrl,
      priceHistories: [
        {
          price: newSeller.priceHistories[0].price,
          trackedDate: currentDateTime,
        },
      ],
    });
  });

  closedSellerIds.forEach((sellerId) => {
    persistedSellers
      .filter((seller) => seller.id === sellerId)
      .priceHistories.push({
        price: null,
        trackedDate: currentDateTime,
      });
  });

  return (
    anySellerPriceChanged ||
    openSellerIds.length > 0 ||
    closedSellerIds.length > 0
  );
};

// TODO: set tracked dates for configurable products
const setTrackedDate = (originalProduct) => {
  const trackedProduct = Object.assign({}, originalProduct);
  const currentDateTime = new Date();
  trackedProduct.lastTrackedDate = currentDateTime;
  const sellersValue = new Map(originalProduct.sellers.value);
  for (let seller of sellersValue.values()) {
    seller.priceHistories[0].trackedDate = currentDateTime;
  }
  trackedProduct.sellers = sellersValue;
  return trackedProduct;
};

const convertPersistedProductModelToProductResponse = (persistedProduct) => {
  return {
    id: persistedProduct.id,
    name: persistedProduct.name,
    thumbnailUrl: persistedProduct.thumbnailUrl,
    imagesUrls: persistedProduct.imagesUrls,
    origin: persistedProduct.origin,
    sellers: Array.from(persistedProduct.sellers, ([sellerId, seller]) =>
      convertPersistedSellerToSellerResponse(sellerId, seller)
    ),
    lastTrackedDate: persistedProduct.lastTrackedDate,
  };
};

const convertPersistedSellerToSellerResponse = (
  persistedSellerId,
  persistedSeller
) => {
  return [
    persistedSellerId,
    {
      name: persistedSeller.name,
      logoUrl: persistedSeller.logoUrl,
      priceHistories: Array.from(
        persistedSeller.priceHistories,
        (priceHistory) =>
          convertPersistedPriceHistoryToPriceHistoryResponse(priceHistory)
      ),
    },
  ];
};

const convertPersistedPriceHistoryToPriceHistoryResponse = (
  persistedPriceHistory
) => {
  return {
    price: persistedPriceHistory.price,
    trackedDate: persistedPriceHistory.trackedDate,
  };
};

module.exports = {
  fetchProduct: fetchProduct,
  checkProductChanges: checkProductChanges,
  updateProductMetadata: updateProductMetadata,
  updateVariantMetadata: updateVariantMetadata,
  updateVariants: updateVariants,
  updatePriceHistories: updatePriceHistories,
  updateSellers: updateSellers,
  setTrackedDate: setTrackedDate,
  convertPersistedProductModelToProductResponse:
    convertPersistedProductModelToProductResponse,
  convertPersistedSellerToSellerResponse:
    convertPersistedSellerToSellerResponse,
  convertPersistedPriceHistoryToPriceHistoryResponse:
    convertPersistedPriceHistoryToPriceHistoryResponse,
};
