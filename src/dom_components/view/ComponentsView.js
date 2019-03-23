import Backbone from 'backbone';
import { isUndefined } from 'underscore';

module.exports = Backbone.View.extend({
  initialize(o) {
    this.opts = o || {};
    this.config = o.config || {};
    const coll = this.collection;
    this.listenTo(coll, 'add', this.addTo);
    this.listenTo(coll, 'reset', this.resetChildren);
    this.listenTo(coll, 'remove', this.removeChildren);
  },

  removeChildren(removed, coll, opts = {}) {
    const em = this.config.em;
    const view = removed.view;
    const tempComp = removed.opt.temporary;
    const tempRemove = opts.temporary;
    if (!view) return;
    view.remove.apply(view);
    const children = view.childrenView;
    children && children.stopListening();
    removed.components().forEach(it => this.removeChildren(it, coll, opts));

    if (em && !tempRemove) {
      // Remove the component from the global list
      const id = removed.getId();
      const domc = em.get('DomComponents');
      delete domc.componentsById[id];

      // Remove all related CSS rules
      const allRules = em.get('CssComposer').getAll();
      allRules.remove(
        allRules.filter(
          rule => rule.getSelectors().getFullString() === `#${id}`
        )
      );

      if (!tempComp) {
        const cm = em.get('Commands');
        const hasSign = removed.get('style-signature');
        const optStyle = { target: removed };
        hasSign && cm.run('core:component-style-clear', optStyle);
        removed.removed();
        em.trigger('component:remove', removed);
      }
    }
  },

  /**
   * Add to collection
   * @param {Model} model
   * @param {Collection} coll
   * @param {Object} opts
   * @private
   * */
  addTo(model, coll = {}, opts = {}) {
    const em = this.config.em;
    const i = this.collection.indexOf(model);
    this.addToCollection(model, null, i);

    if (em && !opts.temporary) {
      em.trigger('component:add', model);
    }
  },

  /**
   * Add new object to collection
   * @param  {Object}  Model
   * @param  {Object}   Fragment collection
   * @param  {Integer}  Index of append
   *
   * @return   {Object}   Object rendered
   * @private
   * */
  addToCollection(model, fragmentEl, index) {
    if (!this.compView) this.compView = require('./ComponentView');
    var fragment = fragmentEl || null,
      viewObject = this.compView;

    var dt = this.opts.componentTypes;

    var type = model.get('type');

    for (var it = 0; it < dt.length; it++) {
      var dtId = dt[it].id;
      if (dtId == type) {
        viewObject = dt[it].view;
        break;
      }
    }
    //viewObject = dt[type] ? dt[type].view : dt.default.view;

    var view = new viewObject({
      model,
      config: this.config,
      componentTypes: dt
    });
    var rendered = view.render().el;
    if (view.model.get('type') == 'textnode')
      rendered = document.createTextNode(view.model.get('content'));

    if (fragment) {
      fragment.appendChild(rendered);
    } else {
      const parent = this.parentEl;
      const children = parent.childNodes;

      if (!isUndefined(index)) {
        const lastIndex = children.length == index;

        // If the added model is the last of collection
        // need to change the logic of append
        if (lastIndex) {
          index--;
        }

        // In case the added is new in the collection index will be -1
        if (lastIndex || !children.length) {
          parent.appendChild(rendered);
        } else {
          parent.insertBefore(rendered, children[index]);
        }
      } else {
        parent.appendChild(rendered);
      }
    }

    return rendered;
  },

  resetChildren() {
    this.parentEl.innerHTML = '';
    this.collection.each(model => this.addToCollection(model));
  },

  render(parent) {
    const el = this.el;
    const frag = document.createDocumentFragment();
    this.parentEl = parent || this.el;
    this.collection.each(model => this.addToCollection(model, frag));
    el.innerHTML = '';
    el.appendChild(frag);
    return this;
  }
});
