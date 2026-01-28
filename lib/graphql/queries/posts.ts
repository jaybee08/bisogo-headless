export const POSTS_INDEX_QUERY = /* GraphQL */ `
  query PostsIndex($first: Int!, $after: String, $search: String, $category: String, $tag: String) {
    posts(
      first: $first
      after: $after
      where: {
        search: $search
        categoryName: $category
        tag: $tag
        orderby: { field: DATE, order: DESC }
        status: PUBLISH
      }
    ) {
      pageInfo {
        hasNextPage
        endCursor
      }
      nodes {
        id
        slug
        title
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
    categories(first: 50) {
      nodes {
        id
        name
        slug
      }
    }
    tags(first: 50) {
      nodes {
        id
        name
        slug
      }
    }
  }
`;

export const POST_BY_SLUG_QUERY = /* GraphQL */ `
  query PostBySlug($slug: String!) {
    posts(where: { name: $slug, status: PUBLISH }, first: 1) {
      nodes {
        id
        slug
        title
        excerpt
        content
        date
        modified
        author {
          node {
            name
          }
        }
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
        categories {
          nodes {
            name
            slug
          }
        }
        tags {
          nodes {
            name
            slug
          }
        }
      }
    }
  }
`;

export const RELATED_POSTS_QUERY = /* GraphQL */ `
  query RelatedPosts($notIn: [ID]!) {
    posts(first: 6, where: { notIn: $notIn, orderby: { field: DATE, order: DESC }, status: PUBLISH }) {
      nodes {
        id
        slug
        title
        excerpt
        date
        featuredImage {
          node {
            sourceUrl
            altText
          }
        }
      }
    }
  }
`;
