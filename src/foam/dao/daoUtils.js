/**
 * @license
 * Copyright 2016 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

foam.CLASS({
  package: 'foam.dao',
  name: 'ProxyDAO',
  extends: 'foam.dao.AbstractDAO',

  documentation: 'Proxy implementation for the DAO interface.',

  properties: [
    {
      class: 'Proxy',
      of: 'foam.dao.DAO',
      name: 'delegate',
      forwards: [ 'put', 'remove', 'find', 'select', 'removeAll', 'listen' ]
    },
    {
      name: 'of',
      factory: function() {
        return this.delegate.of;
      }
    },
    {
      class: 'Map',
      name: 'daoListeners_'
    }
  ],
  methods: [
    function listen(sink, skip, limit, order, predicate) {
      var innerSub = this.delegate.listen(sink, skip, limit, order, predicate);
      var args = [sink, skip, limit, order, predicate];

      var pc = this.sub('propertyChange', 'delegate', function(s, _, _, slot, value) {
        innerSub.detach();
        value && value.listen.apply(value, args);
        if ( slot.getPrev() ) {
          // If we had an old value, then fire a reset event.
          sink.reset && sink.reset();
        }
      });

      var sub = foam.core.FObject.create();

      sub.onDetach(pc);
      sub.onDetach(innerSub);

      return sub;
    }
  ]
});

foam.CLASS({
  package: 'foam.dao',
  name: 'ArraySink',
  extends: 'foam.dao.AbstractSink',

  properties: [
    {
      class: 'Array',
      name: 'a'
    }
  ],

  methods: [
    function put(sub, o) {
      this.a.push(o);
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'PromisedDAO',
  implements: ['foam.dao.DAO'],

  properties: [
    {
      class: 'Promised',
      of: 'foam.dao.DAO',
      methods: [ 'put', 'remove', 'find', 'select', 'removeAll', 'listen' ],
      name: 'promise'
    }
  ]
});


foam.CLASS({
  package: 'foam.dao',
  name: 'LocalStorageDAO',
  extends: 'foam.dao.ArrayDAO',

  properties: [
    {
      name:  'name',
      label: 'Store Name',
      class:  'foam.core.String'
    }
  ],

  methods: [
    function init() {
      var objs = localStorage.getItem(this.name);
      if ( objs ) this.array = foam.json.parseString(objs, this);

      this.on.put.sub(this.updated);
      this.on.remove.sub(this.updated);

      // TODO: base on an indexed DAO
    }
  ],

  listeners: [
    {
      name: 'updated',
      isMerged: true,
      mergeDelay: 100,
      code: function() {
        localStorage.setItem(this.name, foam.json.stringify(this.array));
      }
    }
  ]
});


foam.LIB({
  name: 'foam.String',
  methods: [
    {
      name: 'daoize',
      code: foam.Function.memoize1(function(str) {
        // Turns SomeClassName into someClassNameDAO,
        // of package.ClassName into package.ClassNameDAO
        return str.substring(0, 1).toLowerCase() + str.substring(1) + 'DAO';
      })
    }
  ]
});

foam.CLASS({
  package: 'foam.dao',
  name: 'InvalidArgumentException',
  extends: 'foam.dao.ExternalException',
  properties: [
    {
      class: 'String',
      name: 'message'
    }
  ]
});
