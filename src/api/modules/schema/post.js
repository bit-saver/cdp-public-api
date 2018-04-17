import languageSchema from './language';

const postSchema = {
  title: 'Post',
  type: 'object',
  properties: {
    post_id: { type: 'integer' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    author: {
      type: 'object',
      properties: {
        id: { type: 'integer' },
        name: { type: 'string' }
      }
    },
    link: { type: 'string' },
    title: { type: 'string' },
    slug: { type: 'string' },
    content: { type: 'string' },
    excerpt: { type: 'string' },
    language: languageSchema,
    languages: {
      type: 'array',
      default: [],
      items: {
        type: 'object',
        properties: {
          post_id: { type: 'integer' },
          language: languageSchema
        }
      }
    },
    tags: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    },
    categories: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    }
  }
};

export default postSchema;
