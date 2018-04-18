const thumbnailSchema = {
  type: 'object',
  properties: {
    small: {
      type: ['object', 'null'],
      properties: {
        url: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        orientation: { type: 'string' }
      }
    },
    medium: {
      type: ['object', 'null'],
      properties: {
        url: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        orientation: { type: 'string' }
      }
    },
    large: {
      type: ['object', 'null'],
      properties: {
        url: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        orientation: { type: 'string' }
      }
    },
    full: {
      type: ['object', 'null'],
      properties: {
        url: { type: 'string' },
        width: { type: 'number' },
        height: { type: 'number' },
        orientation: { type: 'string' }
      }
    }
  }
};

export default thumbnailSchema;
