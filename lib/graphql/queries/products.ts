export const PRODUCTS_INDEX_WOO_GQL = /* GraphQL */ `
  query ProductsIndex($first: Int!, $after: String, $search: String, $category: String) {
    products(
      first: $first
      after: $after
      where: {
        search: $search
        category: $category
        orderby: { field: DATE, order: DESC }
        status: PUBLISH
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        databaseId
        slug
        name
        sku
        price
        stockStatus
        image {
          sourceUrl
          altText
        }
      }
    }
    productCategories(first: 50) {
      nodes {
        databaseId
        name
        slug
      }
    }
  }
`;

export const PRODUCT_BY_SLUG_WOO_GQL = /* GraphQL */ `
  query ProductBySlug($slug: ID!) {
    product(id: $slug, idType: SLUG) {
      databaseId
      slug
      name
      sku
      price
      stockStatus
      shortDescription
      description
      image {
        sourceUrl
        altText
      }
      galleryImages(first: 10) {
        nodes {
          sourceUrl
          altText
        }
      }
      attributes {
        nodes {
          name
          options
        }
      }
      variations(first: 50) {
        nodes {
          databaseId
          name
          price
          stockStatus
          attributes {
            nodes {
              name
              value
            }
          }
        }
      }
      related(first: 4) {
        nodes {
          slug
          name
          price
          image { sourceUrl altText }
        }
      }
    }
  }
`;
