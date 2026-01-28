export const PAGE_BY_URI_QUERY = /* GraphQL */ `
  query PageByUri($uri: String!) {
    pageBy(uri: $uri) {
      id
      slug
      title
      excerpt
      content
      modified
      status
    }
  }
`;

export const PAGE_BY_SLUG_QUERY = /* GraphQL */ `
  query PageBySlug($slug: ID!) {
    page(id: $slug, idType: URI) {
      id
      slug
      title
      content
      modified
      status
    }
  }
`;