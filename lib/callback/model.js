module.exports = function Callback(module, method, data, key) {
  this.module = module;
  this.method = method;
  this.data = data || {};
  this.key = key;
};