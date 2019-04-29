import languageSchema from './language';
import thumbnailSchema from './thumbnail';

const videoSchema = {
  title: 'Video',
  type: 'object',
  properties: {
    post_id: { type: 'string' },
    site: { type: 'string' },
    type: { type: 'string' },
    published: { type: 'string' },
    modified: { type: 'string' },
    owner: { type: 'string' },
    author: { type: 'string' },
    duration: { type: 'number' },
    thumbnail: thumbnailSchema,
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
          thumbnail: thumbnailSchema,
          categories: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
          },
          tags: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                id: { type: 'string' },
                name: { type: 'string' }
              }
            }
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
                    uid: { type: 'string' },
                    url: { type: 'string' },
                    link: { type: 'string' },
                    site: { type: 'string' },
                    thumbnail: { type: 'string' }
                  }
                },
                duration: {
                  type: 'string'
                },
                filetype: { type: 'string' },
                video_quality: { type: 'string' },
                md5: { type: 'string' },
                size: {
                  type: ['object', 'null'],
                  properties: {
                    width: { type: 'number' },
                    height: { type: 'number' },
                    filesize: { type: 'number' },
                    bitrate: { type: 'number' }
                  }
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
