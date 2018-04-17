import languageSchema from './language';

const videoSchema = {
  title: 'Video',
  type: 'object',
  properties: {
    post_id: { type: 'integer' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    author: { type: 'string' },
    duration: { type: 'number' },
    thumbnail: {
      type: 'object',
      properties: {
        small: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'string' },
            height: { type: 'string' },
            orientation: { type: 'string' }
          }
        },
        medium: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'string' },
            height: { type: 'string' },
            orientation: { type: 'string' }
          }
        },
        large: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'string' },
            height: { type: 'string' },
            orientation: { type: 'string' }
          }
        },
        full: {
          type: ['object', 'null'],
          properties: {
            url: { type: 'string' },
            width: { type: 'string' },
            height: { type: 'string' },
            orientation: { type: 'string' }
          }
        }
      }
    },
    categories: {
      type: 'array',
      default: [],
      items: { type: 'string' }
    },
    unit: {
      type: 'array',
      default: [{ source: [] }],
      items: {
        type: 'object',
        properties: {
          language: languageSchema,
          title: { type: 'string' },
          desc: { type: 'string' },
          categories: {
            type: 'array',
            items: { type: 'string' }
          },
          tags: {
            type: 'array',
            items: { type: 'string' }
          },
          source: {
            type: 'array',
            default: [],
            items: {
              type: 'object',
              properties: {
                burnedInCaptions: { type: 'string' },
                downloadUrl: { type: 'string' },
                streamUrl: {
                  type: 'array',
                  default: [],
                  items: {
                    type: 'object',
                    properties: {
                      url: { type: 'string' },
                      site: { type: 'string' }
                    }
                  }
                },
                stream: {
                  type: 'object',
                  default: {
                    url: '',
                    uid: ''
                  },
                  properties: {
                    url: { type: 'string' },
                    uid: { type: 'string' },
                    thumbnail: { type: 'string' }
                  }
                },
                filetype: { type: 'string' },
                md5: { type: 'string' },
                size: {
                  type: ['object', 'null'],
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                    filesize: { type: 'number' },
                    bitrate: { type: 'number' }
                  }
                },
                duration: {
                  type: 'string'
                }
              }
            }
          },
          transcript: {
            type: 'object',
            properties: {
              srcUrl: { type: 'string' },
              md5: { type: 'string' },
              text: { type: 'string' }
            }
          },
          srt: {
            type: 'object',
            properties: {
              srcUrl: { type: 'string' },
              md5: { type: 'string' }
            }
          }
        }
      }
    }
  },
  required: ['post_id', 'site']
};

export default videoSchema;
