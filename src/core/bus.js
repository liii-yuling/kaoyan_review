/*!
 * bus.js —— 极简事件总线
 * 挂载：KY.bus
 * 约定事件名：'<领域>:<动作>'，如 'wrongbook:changed'、'route:after'
 */
(function (global) {
  'use strict';
  var KY = (global.KY = global.KY || {});

  var handlers = Object.create(null);

  var bus = {
    on: function (evt, fn) {
      (handlers[evt] || (handlers[evt] = [])).push(fn);
      return function off() { bus.off(evt, fn); };
    },

    once: function (evt, fn) {
      var off = bus.on(evt, function () {
        off();
        fn.apply(null, arguments);
      });
      return off;
    },

    off: function (evt, fn) {
      var list = handlers[evt];
      if (!list) return;
      var i = list.indexOf(fn);
      if (i >= 0) list.splice(i, 1);
    },

    emit: function (evt, payload) {
      var list = handlers[evt];
      if (!list || !list.length) return;
      // 复制一份，避免回调里增删监听造成遍历错乱
      list.slice().forEach(function (fn) {
        try { fn(payload); }
        catch (e) { console.error('[bus] 监听器异常 @' + evt, e); }
      });
    },

    clear: function (evt) {
      if (evt) delete handlers[evt];
      else handlers = Object.create(null);
    }
  };

  KY.bus = bus;
})(window);
