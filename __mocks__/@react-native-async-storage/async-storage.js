const storage = {};

const mockAsyncStorage = {
  setItem: jest.fn((key, value) => {
    storage[key] = String(value);
    return Promise.resolve(null);
  }),
  getItem: jest.fn((key) => {
    return Promise.resolve(storage[key] !== undefined ? storage[key] : null);
  }),
  removeItem: jest.fn((key) => {
    delete storage[key];
    return Promise.resolve(null);
  }),
  clear: jest.fn(() => {
    Object.keys(storage).forEach((k) => delete storage[k]);
    return Promise.resolve(null);
  }),
  getAllKeys: jest.fn(() => {
    return Promise.resolve(Object.keys(storage));
  }),
};

module.exports = mockAsyncStorage;
module.exports.default = mockAsyncStorage;
