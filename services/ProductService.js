const LodashArray = require("lodash/array");
const ProductOrigin = require("../constants/ProductOrigin");
const TikiProductService = require("./tiki/ProductService");
const ShopeeProductService = require("./shopee/ProductService");

const fetchProduct = (origin, itemId, shopId) => {
  if (!origin || !itemId) {
    return new Promise((resolve, _) => {
      resolve(null);
    });
  } else if (origin == ProductOrigin.TIKI_VN) {
    return TikiProductService.getProduct(itemId);
  } else if (origin == ProductOrigin.SHOPEE_VN && !shopId) {
    return ShopeeProductService.getProduct(itemId, shopId);
  } else {
    return new Promise((resolve, _) => {
      resolve(null);
    });
  }
};

const checkProductChanges = (persistedProduct) => {
  return fetchProduct(
    persistedProduct.origin,
    persistedProduct.id,
    persistedProduct.sellers[0].id
  ).then((fetchedProduct) => {
    if (!fetchedProduct) {
      return false;
    }
    const currentDateTime = new Date();
    const isChanged = updateVariants(
      fetchedProduct,
      persistedProduct,
      currentDateTime
    );
    if (isChanged) {
      persistedProduct.lastTrackedDate = currentDateTime;
    }
    updateProductMetadata(fetchedProduct, persistedProduct);
    updateSellers(fetchedProduct, persistedProduct);
    persistedProduct.save();
    return isChanged;
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
    persistedProduct.options.map((option) => option.name)
  );

  fetchedProduct.options
    .filter((option) => newOptions.includes(option.name))
    .forEach((option) => {
      persistedProduct.options.push(option);
    });

  persistedProduct.options.forEach((persistedOption) =>
    LodashArray.union(
      persistedOption.values,
      fetchedProduct.options.find(
        (fetchedOption) => fetchedOption.name === persistedOption.name
      )?.values
    )
  );
};

const updateVariantMetadata = (fetchedVariant, persistedVariant) => {
  persistedVariant.name = fetchedVariant.name;
  persistedVariant.imagesUrls = fetchedVariant.imagesUrls;
};

const updateSellers = (fetchedProduct, persistedProduct) => {
  const fetchedSellers = fetchedProduct.sellers;
  const fetchedSellerIds = fetchedSellers
    .filter((seller) => !!seller)
    .map((seller) => seller.id);

  const persistedSellers = persistedProduct.sellers;
  const persistedSellerIds = persistedSellers.map((seller) => seller.id);

  const newSellerIds = LodashArray.difference(
    fetchedSellerIds,
    persistedSellerIds
  );
  fetchedSellers
    .filter((seller) => !!seller)
    .filter((seller) => newSellerIds.includes(seller.id))
    .forEach((seller) => {
      persistedSellers.push(seller);
    });
};

const updateVariants = (fetchedProduct, persistedProduct, currentDateTime) => {
  const fetchedVariants = fetchedProduct.variants;
  const fetchedVariantIds = fetchedVariants?.map((variant) =>
    variant.id.toString()
  );

  const persistedVariants = persistedProduct.variants;
  const persistedVariantIds = persistedVariants.map((variant) => variant.id);

  const newVariantIds = LodashArray.difference(
    fetchedVariantIds,
    persistedVariantIds
  );

  if (fetchedVariants) {
    fetchedVariants
      .filter((variant) => newVariantIds.includes(variant.id))
      .forEach((variant) => {
        persistedVariants.push(variant);
      });
  }

  let suspendedVariantIds = LodashArray.difference(
    persistedVariantIds,
    fetchedVariantIds
  );

  persistedVariants
    .filter((variant) => suspendedVariantIds.includes(variant?.id))
    .forEach((persistedVariant) =>
      persistedVariant.sellers.forEach((seller) => {
        if (fetchedVariants) {
          updateVariantMetadata(
            fetchedVariants.find(
              (fetchedVariant) => fetchedVariant.id === persistedVariant.id
            ),
            persistedVariant
          );
        }
        if (seller.priceHistories[seller.priceHistories.length - 1].price) {
          seller.priceHistories.push({
            price: null,
            trackedDate: currentDateTime,
          });
        } else {
          suspendedVariantIds = LodashArray.without(
            suspendedVariantIds,
            persistedVariant.id
          );
        }
      })
    );

  const stillOnSaleVariantIds = LodashArray.intersection(
    fetchedVariantIds,
    persistedVariantIds
  );

  const isPriceChanged = fetchedVariants
    ?.filter((variant) => stillOnSaleVariantIds.includes(variant.id.toString()))
    .map((fetchedVariant) => {
      const persistedVariant = persistedVariants.find(
        (variant) => variant.id == fetchedVariant.id
      );
      updateVariantMetadata(fetchedVariant, persistedVariant);
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
  const fetchedSellerIds = fetchedSellers.map((seller) => seller.id.toString());

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
    const priceHistories = persistedSellers.find(
      (seller) => seller.id == sellerId
    ).priceHistories;
    const lastPriceHistory = priceHistories[priceHistories.length - 1];
    const newPriceHistory = fetchedSellers.find(
      (seller) => seller.id == sellerId
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
    const newSeller = fetchedSellers.find((seller) => seller.id == sellerId);
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
      .find((seller) => seller.id == sellerId)
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
  trackedProduct.variants.forEach((variant) =>
    variant.sellers.forEach((seller) =>
      seller.priceHistories.forEach(
        (priceHistory) => (priceHistory.trackedDate = currentDateTime)
      )
    )
  );
  return trackedProduct;
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
};
