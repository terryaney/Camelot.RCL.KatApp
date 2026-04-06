var PetiteVue = (function (exports) {
    'use strict';

    /**
     * Make a map and return a function for checking if a key
     * is in that map.
     * IMPORTANT: all calls of this function must be prefixed with
     * \/\*#\_\_PURE\_\_\*\/
     * So that rollup can tree-shake them if necessary.
     */
    function makeMap(str, expectsLowerCase) {
        const map = Object.create(null);
        const list = str.split(',');
        for (let i = 0; i < list.length; i++) {
            map[list[i]] = true;
        }
        return expectsLowerCase ? val => !!map[val.toLowerCase()] : val => !!map[val];
    }

    function normalizeStyle(value) {
        if (isArray(value)) {
            const res = {};
            for (let i = 0; i < value.length; i++) {
                const item = value[i];
                const normalized = isString(item)
                    ? parseStringStyle(item)
                    : normalizeStyle(item);
                if (normalized) {
                    for (const key in normalized) {
                        res[key] = normalized[key];
                    }
                }
            }
            return res;
        }
        else if (isString(value)) {
            return value;
        }
        else if (isObject(value)) {
            return value;
        }
    }
    const listDelimiterRE = /;(?![^(]*\))/g;
    const propertyDelimiterRE = /:(.+)/;
    function parseStringStyle(cssText) {
        const ret = {};
        cssText.split(listDelimiterRE).forEach(item => {
            if (item) {
                const tmp = item.split(propertyDelimiterRE);
                tmp.length > 1 && (ret[tmp[0].trim()] = tmp[1].trim());
            }
        });
        return ret;
    }
    function normalizeClass(value) {
        let res = '';
        if (isString(value)) {
            res = value;
        }
        else if (isArray(value)) {
            for (let i = 0; i < value.length; i++) {
                const normalized = normalizeClass(value[i]);
                if (normalized) {
                    res += normalized + ' ';
                }
            }
        }
        else if (isObject(value)) {
            for (const name in value) {
                if (value[name]) {
                    res += name + ' ';
                }
            }
        }
        return res.trim();
    }

    function looseCompareArrays(a, b) {
        if (a.length !== b.length)
            return false;
        let equal = true;
        for (let i = 0; equal && i < a.length; i++) {
            equal = looseEqual(a[i], b[i]);
        }
        return equal;
    }
    function looseEqual(a, b) {
        if (a === b)
            return true;
        let aValidType = isDate(a);
        let bValidType = isDate(b);
        if (aValidType || bValidType) {
            return aValidType && bValidType ? a.getTime() === b.getTime() : false;
        }
        aValidType = isSymbol(a);
        bValidType = isSymbol(b);
        if (aValidType || bValidType) {
            return a === b;
        }
        aValidType = isArray(a);
        bValidType = isArray(b);
        if (aValidType || bValidType) {
            return aValidType && bValidType ? looseCompareArrays(a, b) : false;
        }
        aValidType = isObject(a);
        bValidType = isObject(b);
        if (aValidType || bValidType) {
            /* istanbul ignore if: this if will probably never be called */
            if (!aValidType || !bValidType) {
                return false;
            }
            const aKeysCount = Object.keys(a).length;
            const bKeysCount = Object.keys(b).length;
            if (aKeysCount !== bKeysCount) {
                return false;
            }
            for (const key in a) {
                const aHasKey = a.hasOwnProperty(key);
                const bHasKey = b.hasOwnProperty(key);
                if ((aHasKey && !bHasKey) ||
                    (!aHasKey && bHasKey) ||
                    !looseEqual(a[key], b[key])) {
                    return false;
                }
            }
        }
        return String(a) === String(b);
    }
    function looseIndexOf(arr, val) {
        return arr.findIndex(item => looseEqual(item, val));
    }
    const extend = Object.assign;
    const remove = (arr, el) => {
        const i = arr.indexOf(el);
        if (i > -1) {
            arr.splice(i, 1);
        }
    };
    const hasOwnProperty = Object.prototype.hasOwnProperty;
    const hasOwn = (val, key) => hasOwnProperty.call(val, key);
    const isArray = Array.isArray;
    const isMap = (val) => toTypeString(val) === '[object Map]';
    const isDate = (val) => toTypeString(val) === '[object Date]';
    const isString = (val) => typeof val === 'string';
    const isSymbol = (val) => typeof val === 'symbol';
    const isObject = (val) => val !== null && typeof val === 'object';
    const objectToString = Object.prototype.toString;
    const toTypeString = (value) => objectToString.call(value);
    const toRawType = (value) => {
        // extract "RawType" from strings like "[object RawType]"
        return toTypeString(value).slice(8, -1);
    };
    const isIntegerKey = (key) => isString(key) &&
        key !== 'NaN' &&
        key[0] !== '-' &&
        '' + parseInt(key, 10) === key;
    const cacheStringFunction = (fn) => {
        const cache = Object.create(null);
        return ((str) => {
            const hit = cache[str];
            return hit || (cache[str] = fn(str));
        });
    };
    const camelizeRE = /-(\w)/g;
    /**
     * @private
     */
    const camelize = cacheStringFunction((str) => {
        return str.replace(camelizeRE, (_, c) => (c ? c.toUpperCase() : ''));
    });
    const hyphenateRE = /\B([A-Z])/g;
    /**
     * @private
     */
    const hyphenate = cacheStringFunction((str) => str.replace(hyphenateRE, '-$1').toLowerCase());
    // compare whether a value has changed, accounting for NaN.
    const hasChanged = (value, oldValue) => !Object.is(value, oldValue);
    const toNumber = (val) => {
        const n = parseFloat(val);
        return isNaN(n) ? val : n;
    };

    let activeEffectScope;
    function recordEffectScope(effect, scope = activeEffectScope) {
        if (scope && scope.active) {
            scope.effects.push(effect);
        }
    }

    const createDep = (effects) => {
        const dep = new Set(effects);
        dep.w = 0;
        dep.n = 0;
        return dep;
    };
    const wasTracked = (dep) => (dep.w & trackOpBit) > 0;
    const newTracked = (dep) => (dep.n & trackOpBit) > 0;
    const initDepMarkers = ({ deps }) => {
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].w |= trackOpBit; // set was tracked
            }
        }
    };
    const finalizeDepMarkers = (effect) => {
        const { deps } = effect;
        if (deps.length) {
            let ptr = 0;
            for (let i = 0; i < deps.length; i++) {
                const dep = deps[i];
                if (wasTracked(dep) && !newTracked(dep)) {
                    dep.delete(effect);
                }
                else {
                    deps[ptr++] = dep;
                }
                // clear bits
                dep.w &= ~trackOpBit;
                dep.n &= ~trackOpBit;
            }
            deps.length = ptr;
        }
    };

    const targetMap = new WeakMap();
    // The number of effects currently being tracked recursively.
    let effectTrackDepth = 0;
    let trackOpBit = 1;
    /**
     * The bitwise track markers support at most 30 levels of recursion.
     * This value is chosen to enable modern JS engines to use a SMI on all platforms.
     * When recursion depth is greater, fall back to using a full cleanup.
     */
    const maxMarkerBits = 30;
    let activeEffect;
    const ITERATE_KEY = Symbol('');
    const MAP_KEY_ITERATE_KEY = Symbol('');
    class ReactiveEffect {
        constructor(fn, scheduler = null, scope) {
            this.fn = fn;
            this.scheduler = scheduler;
            this.active = true;
            this.deps = [];
            this.parent = undefined;
            recordEffectScope(this, scope);
        }
        run() {
            if (!this.active) {
                return this.fn();
            }
            let parent = activeEffect;
            let lastShouldTrack = shouldTrack;
            while (parent) {
                if (parent === this) {
                    return;
                }
                parent = parent.parent;
            }
            try {
                this.parent = activeEffect;
                activeEffect = this;
                shouldTrack = true;
                trackOpBit = 1 << ++effectTrackDepth;
                if (effectTrackDepth <= maxMarkerBits) {
                    initDepMarkers(this);
                }
                else {
                    cleanupEffect(this);
                }
                return this.fn();
            }
            finally {
                if (effectTrackDepth <= maxMarkerBits) {
                    finalizeDepMarkers(this);
                }
                trackOpBit = 1 << --effectTrackDepth;
                activeEffect = this.parent;
                shouldTrack = lastShouldTrack;
                this.parent = undefined;
                if (this.deferStop) {
                    this.stop();
                }
            }
        }
        stop() {
            // stopped while running itself - defer the cleanup
            if (activeEffect === this) {
                this.deferStop = true;
            }
            else if (this.active) {
                cleanupEffect(this);
                if (this.onStop) {
                    this.onStop();
                }
                this.active = false;
            }
        }
    }
    function cleanupEffect(effect) {
        const { deps } = effect;
        if (deps.length) {
            for (let i = 0; i < deps.length; i++) {
                deps[i].delete(effect);
            }
            deps.length = 0;
        }
    }
    function effect$1(fn, options) {
        if (fn.effect) {
            fn = fn.effect.fn;
        }
        const _effect = new ReactiveEffect(fn);
        if (options) {
            extend(_effect, options);
            if (options.scope)
                recordEffectScope(_effect, options.scope);
        }
        if (!options || !options.lazy) {
            _effect.run();
        }
        const runner = _effect.run.bind(_effect);
        runner.effect = _effect;
        return runner;
    }
    function stop(runner) {
        runner.effect.stop();
    }
    let shouldTrack = true;
    const trackStack = [];
    function pauseTracking() {
        trackStack.push(shouldTrack);
        shouldTrack = false;
    }
    function resetTracking() {
        const last = trackStack.pop();
        shouldTrack = last === undefined ? true : last;
    }
    function track(target, type, key) {
        if (shouldTrack && activeEffect) {
            let depsMap = targetMap.get(target);
            if (!depsMap) {
                targetMap.set(target, (depsMap = new Map()));
            }
            let dep = depsMap.get(key);
            if (!dep) {
                depsMap.set(key, (dep = createDep()));
            }
            trackEffects(dep);
        }
    }
    function trackEffects(dep, debuggerEventExtraInfo) {
        let shouldTrack = false;
        if (effectTrackDepth <= maxMarkerBits) {
            if (!newTracked(dep)) {
                dep.n |= trackOpBit; // set newly tracked
                shouldTrack = !wasTracked(dep);
            }
        }
        else {
            // Full cleanup mode.
            shouldTrack = !dep.has(activeEffect);
        }
        if (shouldTrack) {
            dep.add(activeEffect);
            activeEffect.deps.push(dep);
        }
    }
    function trigger$1(target, type, key, newValue, oldValue, oldTarget) {
        const depsMap = targetMap.get(target);
        if (!depsMap) {
            // never been tracked
            return;
        }
        let deps = [];
        if (type === "clear" /* TriggerOpTypes.CLEAR */) {
            // collection being cleared
            // trigger all effects for target
            deps = [...depsMap.values()];
        }
        else if (key === 'length' && isArray(target)) {
            depsMap.forEach((dep, key) => {
                if (key === 'length' || key >= newValue) {
                    deps.push(dep);
                }
            });
        }
        else {
            // schedule runs for SET | ADD | DELETE
            if (key !== void 0) {
                deps.push(depsMap.get(key));
            }
            // also run for iteration key on ADD | DELETE | Map.SET
            switch (type) {
                case "add" /* TriggerOpTypes.ADD */:
                    if (!isArray(target)) {
                        deps.push(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    else if (isIntegerKey(key)) {
                        // new index added to array -> length changes
                        deps.push(depsMap.get('length'));
                    }
                    break;
                case "delete" /* TriggerOpTypes.DELETE */:
                    if (!isArray(target)) {
                        deps.push(depsMap.get(ITERATE_KEY));
                        if (isMap(target)) {
                            deps.push(depsMap.get(MAP_KEY_ITERATE_KEY));
                        }
                    }
                    break;
                case "set" /* TriggerOpTypes.SET */:
                    if (isMap(target)) {
                        deps.push(depsMap.get(ITERATE_KEY));
                    }
                    break;
            }
        }
        if (deps.length === 1) {
            if (deps[0]) {
                {
                    triggerEffects(deps[0]);
                }
            }
        }
        else {
            const effects = [];
            for (const dep of deps) {
                if (dep) {
                    effects.push(...dep);
                }
            }
            {
                triggerEffects(createDep(effects));
            }
        }
    }
    function triggerEffects(dep, debuggerEventExtraInfo) {
        // spread into array for stabilization
        const effects = isArray(dep) ? dep : [...dep];
        for (const effect of effects) {
            if (effect.computed) {
                triggerEffect(effect);
            }
        }
        for (const effect of effects) {
            if (!effect.computed) {
                triggerEffect(effect);
            }
        }
    }
    function triggerEffect(effect, debuggerEventExtraInfo) {
        if (effect !== activeEffect || effect.allowRecurse) {
            if (effect.scheduler) {
                effect.scheduler();
            }
            else {
                effect.run();
            }
        }
    }

    const isNonTrackableKeys = /*#__PURE__*/ makeMap(`__proto__,__v_isRef,__isVue`);
    const builtInSymbols = new Set(
    /*#__PURE__*/
    Object.getOwnPropertyNames(Symbol)
        // ios10.x Object.getOwnPropertyNames(Symbol) can enumerate 'arguments' and 'caller'
        // but accessing them on Symbol leads to TypeError because Symbol is a strict mode
        // function
        .filter(key => key !== 'arguments' && key !== 'caller')
        .map(key => Symbol[key])
        .filter(isSymbol));
    const get = /*#__PURE__*/ createGetter();
    const readonlyGet = /*#__PURE__*/ createGetter(true);
    const arrayInstrumentations = /*#__PURE__*/ createArrayInstrumentations();
    function createArrayInstrumentations() {
        const instrumentations = {};
        ['includes', 'indexOf', 'lastIndexOf'].forEach(key => {
            instrumentations[key] = function (...args) {
                const arr = toRaw(this);
                for (let i = 0, l = this.length; i < l; i++) {
                    track(arr, "get" /* TrackOpTypes.GET */, i + '');
                }
                // we run the method using the original args first (which may be reactive)
                const res = arr[key](...args);
                if (res === -1 || res === false) {
                    // if that didn't work, run it again using raw values.
                    return arr[key](...args.map(toRaw));
                }
                else {
                    return res;
                }
            };
        });
        ['push', 'pop', 'shift', 'unshift', 'splice'].forEach(key => {
            instrumentations[key] = function (...args) {
                pauseTracking();
                const res = toRaw(this)[key].apply(this, args);
                resetTracking();
                return res;
            };
        });
        return instrumentations;
    }
    function createGetter(isReadonly = false, shallow = false) {
        return function get(target, key, receiver) {
            if (key === "__v_isReactive" /* ReactiveFlags.IS_REACTIVE */) {
                return !isReadonly;
            }
            else if (key === "__v_isReadonly" /* ReactiveFlags.IS_READONLY */) {
                return isReadonly;
            }
            else if (key === "__v_isShallow" /* ReactiveFlags.IS_SHALLOW */) {
                return shallow;
            }
            else if (key === "__v_raw" /* ReactiveFlags.RAW */ &&
                receiver ===
                    (isReadonly
                        ? shallow
                            ? shallowReadonlyMap
                            : readonlyMap
                        : shallow
                            ? shallowReactiveMap
                            : reactiveMap).get(target)) {
                return target;
            }
            const targetIsArray = isArray(target);
            if (!isReadonly && targetIsArray && hasOwn(arrayInstrumentations, key)) {
                return Reflect.get(arrayInstrumentations, key, receiver);
            }
            const res = Reflect.get(target, key, receiver);
            if (isSymbol(key) ? builtInSymbols.has(key) : isNonTrackableKeys(key)) {
                return res;
            }
            if (!isReadonly) {
                track(target, "get" /* TrackOpTypes.GET */, key);
            }
            if (shallow) {
                return res;
            }
            if (isRef(res)) {
                // ref unwrapping - skip unwrap for Array + integer key.
                return targetIsArray && isIntegerKey(key) ? res : res.value;
            }
            if (isObject(res)) {
                // Convert returned value into a proxy as well. we do the isObject check
                // here to avoid invalid value warning. Also need to lazy access readonly
                // and reactive here to avoid circular dependency.
                return isReadonly ? readonly(res) : reactive(res);
            }
            return res;
        };
    }
    const set = /*#__PURE__*/ createSetter();
    function createSetter(shallow = false) {
        return function set(target, key, value, receiver) {
            let oldValue = target[key];
            if (isReadonly(oldValue) && isRef(oldValue) && !isRef(value)) {
                return false;
            }
            if (!shallow) {
                if (!isShallow(value) && !isReadonly(value)) {
                    oldValue = toRaw(oldValue);
                    value = toRaw(value);
                }
                if (!isArray(target) && isRef(oldValue) && !isRef(value)) {
                    oldValue.value = value;
                    return true;
                }
            }
            const hadKey = isArray(target) && isIntegerKey(key)
                ? Number(key) < target.length
                : hasOwn(target, key);
            const result = Reflect.set(target, key, value, receiver);
            // don't trigger if target is something up in the prototype chain of original
            if (target === toRaw(receiver)) {
                if (!hadKey) {
                    trigger$1(target, "add" /* TriggerOpTypes.ADD */, key, value);
                }
                else if (hasChanged(value, oldValue)) {
                    trigger$1(target, "set" /* TriggerOpTypes.SET */, key, value);
                }
            }
            return result;
        };
    }
    function deleteProperty(target, key) {
        const hadKey = hasOwn(target, key);
        target[key];
        const result = Reflect.deleteProperty(target, key);
        if (result && hadKey) {
            trigger$1(target, "delete" /* TriggerOpTypes.DELETE */, key, undefined);
        }
        return result;
    }
    function has(target, key) {
        const result = Reflect.has(target, key);
        if (!isSymbol(key) || !builtInSymbols.has(key)) {
            track(target, "has" /* TrackOpTypes.HAS */, key);
        }
        return result;
    }
    function ownKeys(target) {
        track(target, "iterate" /* TrackOpTypes.ITERATE */, isArray(target) ? 'length' : ITERATE_KEY);
        return Reflect.ownKeys(target);
    }
    const mutableHandlers = {
        get,
        set,
        deleteProperty,
        has,
        ownKeys
    };
    const readonlyHandlers = {
        get: readonlyGet,
        set(target, key) {
            return true;
        },
        deleteProperty(target, key) {
            return true;
        }
    };

    const reactiveMap = new WeakMap();
    const shallowReactiveMap = new WeakMap();
    const readonlyMap = new WeakMap();
    const shallowReadonlyMap = new WeakMap();
    function targetTypeMap(rawType) {
        switch (rawType) {
            case 'Object':
            case 'Array':
                return 1 /* TargetType.COMMON */;
            case 'Map':
            case 'Set':
            case 'WeakMap':
            case 'WeakSet':
                return 2 /* TargetType.COLLECTION */;
            default:
                return 0 /* TargetType.INVALID */;
        }
    }
    function getTargetType(value) {
        return value["__v_skip" /* ReactiveFlags.SKIP */] || !Object.isExtensible(value)
            ? 0 /* TargetType.INVALID */
            : targetTypeMap(toRawType(value));
    }
    function reactive(target) {
        // if trying to observe a readonly proxy, return the readonly version.
        if (isReadonly(target)) {
            return target;
        }
        return createReactiveObject(target, false, mutableHandlers, null, reactiveMap);
    }
    /**
     * Creates a readonly copy of the original object. Note the returned copy is not
     * made reactive, but `readonly` can be called on an already reactive object.
     */
    function readonly(target) {
        return createReactiveObject(target, true, readonlyHandlers, null, readonlyMap);
    }
    function createReactiveObject(target, isReadonly, baseHandlers, collectionHandlers, proxyMap) {
        if (!isObject(target)) {
            return target;
        }
        // target is already a Proxy, return it.
        // exception: calling readonly() on a reactive object
        if (target["__v_raw" /* ReactiveFlags.RAW */] &&
            !(isReadonly && target["__v_isReactive" /* ReactiveFlags.IS_REACTIVE */])) {
            return target;
        }
        // target already has corresponding Proxy
        const existingProxy = proxyMap.get(target);
        if (existingProxy) {
            return existingProxy;
        }
        // only specific value types can be observed.
        const targetType = getTargetType(target);
        if (targetType === 0 /* TargetType.INVALID */) {
            return target;
        }
        const proxy = new Proxy(target, targetType === 2 /* TargetType.COLLECTION */ ? collectionHandlers : baseHandlers);
        proxyMap.set(target, proxy);
        return proxy;
    }
    function isReadonly(value) {
        return !!(value && value["__v_isReadonly" /* ReactiveFlags.IS_READONLY */]);
    }
    function isShallow(value) {
        return !!(value && value["__v_isShallow" /* ReactiveFlags.IS_SHALLOW */]);
    }
    function toRaw(observed) {
        const raw = observed && observed["__v_raw" /* ReactiveFlags.RAW */];
        return raw ? toRaw(raw) : observed;
    }
    function isRef(r) {
        return !!(r && r.__v_isRef === true);
    }

    let queued = false;
    const queue = [];
    const p = Promise.resolve();
    const nextTick = (fn) => p.then(fn);
    const queueJob = (job) => {
      if (!queue.includes(job))
        queue.push(job);
      if (!queued) {
        queued = true;
        nextTick(flushJobs);
      }
    };
    const flushJobs = () => {
      for (const job of queue) {
        job();
      }
      queue.length = 0;
      queued = false;
    };

    const forceAttrRE = /^(spellcheck|draggable|form|list|type|onclick)$/;
    const bind = ({
      el,
      get,
      effect,
      arg,
      modifiers
    }) => {
      let prevValue;
      if (arg === "class") {
        el._class = el.className;
      }
      effect(() => {
        let value = get();
        if (arg) {
          if (modifiers?.camel) {
            arg = camelize(arg);
          }
          setProp(el, arg, value, prevValue);
        } else {
          for (const key in value) {
            setProp(el, key, value[key], prevValue && prevValue[key]);
          }
          for (const key in prevValue) {
            if (!value || !(key in value)) {
              setProp(el, key, null);
            }
          }
        }
        prevValue = value;
      });
    };
    const setProp = (el, key, value, prevValue) => {
      if (key === "class") {
        el.setAttribute(
          "class",
          normalizeClass(el._class ? [el._class, value] : value) || ""
        );
      } else if (key === "style") {
        value = normalizeStyle(value);
        const { style } = el;
        if (!value) {
          el.removeAttribute("style");
        } else if (isString(value)) {
          if (value !== prevValue)
            style.cssText = value;
        } else {
          for (const key2 in value) {
            setStyle(style, key2, value[key2]);
          }
          if (prevValue && !isString(prevValue)) {
            for (const key2 in prevValue) {
              if (value[key2] == null) {
                setStyle(style, key2, "");
              }
            }
          }
        }
      } else if (!(el instanceof SVGElement) && key in el && !forceAttrRE.test(key)) {
        el[key] = value;
        if (key === "value") {
          el._value = value;
        }
      } else {
        if (key === "true-value") {
          el._trueValue = value;
        } else if (key === "false-value") {
          el._falseValue = value;
        } else if (value != null) {
          el.setAttribute(key, value);
        } else {
          el.removeAttribute(key);
        }
      }
    };
    const importantRE = /\s*!important$/;
    const setStyle = (style, name, val) => {
      if (isArray(val)) {
        val.forEach((v) => setStyle(style, name, v));
      } else {
        if (name.startsWith("--")) {
          style.setProperty(name, val);
        } else {
          if (importantRE.test(val)) {
            style.setProperty(
              hyphenate(name),
              val.replace(importantRE, ""),
              "important"
            );
          } else {
            style[name] = val;
          }
        }
      }
    };

    const checkAttr = (el, name) => {
      const val = el.getAttribute(name);
      if (val != null)
        el.removeAttribute(name);
      return val;
    };
    const listen = (el, event, handler, options) => {
      el.addEventListener(event, handler, options);
    };

    const simplePathRE = /^[A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*|\['[^']*?']|\["[^"]*?"]|\[\d+]|\[[A-Za-z_$][\w$]*])*$/;
    const systemModifiers = ["ctrl", "shift", "alt", "meta"];
    const modifierGuards = {
      stop: (e) => e.stopPropagation(),
      prevent: (e) => e.preventDefault(),
      self: (e) => e.target !== e.currentTarget,
      ctrl: (e) => !e.ctrlKey,
      shift: (e) => !e.shiftKey,
      alt: (e) => !e.altKey,
      meta: (e) => !e.metaKey,
      left: (e) => "button" in e && e.button !== 0,
      middle: (e) => "button" in e && e.button !== 1,
      right: (e) => "button" in e && e.button !== 2,
      exact: (e, modifiers) => systemModifiers.some((m) => e[`${m}Key`] && !modifiers[m])
    };
    const on = ({ el, get, exp, arg, modifiers }) => {
      if (!arg) {
        return;
      }
      let handler = simplePathRE.test(exp) ? get(`(e => ${exp}(e))`) : get(`($event => { ${exp} })`);
      if (arg === "vue:mounted") {
        nextTick(handler);
        return;
      } else if (arg === "vue:unmounted") {
        return () => handler();
      }
      if (modifiers) {
        if (arg === "click") {
          if (modifiers.right)
            arg = "contextmenu";
          if (modifiers.middle)
            arg = "mouseup";
        }
        const raw = handler;
        handler = (e) => {
          if ("key" in e && !(hyphenate(e.key) in modifiers)) {
            return;
          }
          for (const key in modifiers) {
            const guard = modifierGuards[key];
            if (guard && guard(e, modifiers)) {
              return;
            }
          }
          return raw(e);
        };
      }
      listen(el, arg, handler, modifiers);
    };

    const show = ({ el, get, effect }) => {
      const initialDisplay = el.style.display;
      effect(() => {
        el.style.display = get() ? initialDisplay : "none";
      });
    };

    const text = ({ el, get, effect }) => {
      effect(() => {
        el.textContent = toDisplayString(get());
      });
    };
    const toDisplayString = (value) => value == null ? "" : isObject(value) ? JSON.stringify(value, null, 2) : String(value);

    const html = ({ el, get, effect }) => {
      effect(() => {
        el.innerHTML = get();
      });
    };

    const model = ({ el, exp, get, effect, modifiers }) => {
      const type = el.type;
      const assign = get(`(val) => { ${exp} = val }`);
      const { trim, number = type === "number" } = modifiers || {};
      if (el.tagName === "SELECT") {
        const sel = el;
        listen(el, "change", () => {
          const selectedVal = Array.prototype.filter.call(sel.options, (o) => o.selected).map(
            (o) => number ? toNumber(getValue(o)) : getValue(o)
          );
          assign(sel.multiple ? selectedVal : selectedVal[0]);
        });
        effect(() => {
          const value = get();
          const isMultiple = sel.multiple;
          for (let i = 0, l = sel.options.length; i < l; i++) {
            const option = sel.options[i];
            const optionValue = getValue(option);
            if (isMultiple) {
              if (isArray(value)) {
                option.selected = looseIndexOf(value, optionValue) > -1;
              } else {
                option.selected = value.has(optionValue);
              }
            } else {
              if (looseEqual(getValue(option), value)) {
                if (sel.selectedIndex !== i)
                  sel.selectedIndex = i;
                return;
              }
            }
          }
          if (!isMultiple && sel.selectedIndex !== -1) {
            sel.selectedIndex = -1;
          }
        });
      } else if (type === "checkbox") {
        listen(el, "change", () => {
          const modelValue = get();
          const checked = el.checked;
          if (isArray(modelValue)) {
            const elementValue = getValue(el);
            const index = looseIndexOf(modelValue, elementValue);
            const found = index !== -1;
            if (checked && !found) {
              assign(modelValue.concat(elementValue));
            } else if (!checked && found) {
              const filtered = [...modelValue];
              filtered.splice(index, 1);
              assign(filtered);
            }
          } else {
            assign(getCheckboxValue(el, checked));
          }
        });
        let oldValue;
        effect(() => {
          const value = get();
          if (isArray(value)) {
            el.checked = looseIndexOf(value, getValue(el)) > -1;
          } else if (value !== oldValue) {
            el.checked = looseEqual(
              value,
              getCheckboxValue(el, true)
            );
          }
          oldValue = value;
        });
      } else if (type === "radio") {
        listen(el, "change", () => {
          assign(getValue(el));
        });
        let oldValue;
        effect(() => {
          const value = get();
          if (value !== oldValue) {
            el.checked = looseEqual(value, getValue(el));
          }
        });
      } else {
        const resolveValue = (val) => {
          if (trim)
            return val.trim();
          if (number)
            return toNumber(val);
          return val;
        };
        listen(el, "compositionstart", onCompositionStart);
        listen(el, "compositionend", onCompositionEnd);
        listen(el, modifiers?.lazy ? "change" : "input", () => {
          if (el.composing)
            return;
          assign(resolveValue(el.value));
        });
        if (trim) {
          listen(el, "change", () => {
            el.value = el.value.trim();
          });
        }
        effect(() => {
          if (el.composing) {
            return;
          }
          const curVal = el.value;
          const newVal = get();
          if (document.activeElement === el && resolveValue(curVal) === newVal) {
            return;
          }
          if (curVal !== newVal) {
            el.value = newVal;
          }
        });
      }
    };
    const getValue = (el) => "_value" in el ? el._value : el.value;
    const getCheckboxValue = (el, checked) => {
      const key = checked ? "_trueValue" : "_falseValue";
      return key in el ? el[key] : checked;
    };
    const onCompositionStart = (e) => {
      e.target.composing = true;
    };
    const onCompositionEnd = (e) => {
      const target = e.target;
      if (target.composing) {
        target.composing = false;
        trigger(target, "input");
      }
    };
    const trigger = (el, type) => {
      const e = document.createEvent("HTMLEvents");
      e.initEvent(type, true, true);
      el.dispatchEvent(e);
    };

    const evalCache = /* @__PURE__ */ Object.create(null);
    const evaluate = (scope, exp, el) => execute(scope, `return(${exp})`, el);
    const execute = (scope, exp, el) => {
      const fn = evalCache[exp] || (evalCache[exp] = toFunction(exp));
      try {
        return fn(scope, el);
      } catch (e) {
        console.error(e);
      }
    };
    const toFunction = (exp) => {
      try {
        return new Function(`$data`, `$el`, `with($data){${exp}}`);
      } catch (e) {
        console.error(`${e.message} in expression: ${exp}`);
        return () => {
        };
      }
    };

    const effect = ({ el, ctx, exp, effect: effect2 }) => {
      nextTick(() => effect2(() => execute(ctx.scope, exp, el)));
    };

    const builtInDirectives = {
      bind,
      on,
      show,
      text,
      html,
      model,
      effect
    };

    const _if = (el, exp, ctx) => {
      const parent = el.parentElement;
      const anchor = new Comment("v-if");
      parent.insertBefore(anchor, el);
      const branches = [
        {
          exp,
          el
        }
      ];
      let elseEl;
      let elseExp;
      while (elseEl = el.nextElementSibling) {
        elseExp = null;
        if (checkAttr(elseEl, "v-else") === "" || (elseExp = checkAttr(elseEl, "v-else-if"))) {
          parent.removeChild(elseEl);
          branches.push({ exp: elseExp, el: elseEl });
        } else {
          break;
        }
      }
      const nextNode = el.nextSibling;
      parent.removeChild(el);
      let block;
      let activeBranchIndex = -1;
      const removeActiveBlock = () => {
        if (block) {
          parent.insertBefore(anchor, block.el);
          block.remove();
          block = void 0;
        }
      };
      ctx.effect(() => {
        for (let i = 0; i < branches.length; i++) {
          const { exp: exp2, el: el2 } = branches[i];
          if (!exp2 || evaluate(ctx.scope, exp2)) {
            if (i !== activeBranchIndex) {
              removeActiveBlock();
              block = new Block(el2, ctx);
              block.insert(parent, anchor);
              parent.removeChild(anchor);
              activeBranchIndex = i;
            }
            return;
          }
        }
        activeBranchIndex = -1;
        removeActiveBlock();
      });
      return nextNode;
    };

    const forAliasRE = /([\s\S]*?)\s+(?:in|of)\s+([\s\S]*)/;
    const forIteratorRE = /,([^,\}\]]*)(?:,([^,\}\]]*))?$/;
    const stripParensRE = /^\(|\)$/g;
    const destructureRE = /^[{[]\s*((?:[\w_$]+\s*,?\s*)+)[\]}]$/;
    const _for = (el, exp, ctx) => {
      const inMatch = exp.match(forAliasRE);
      if (!inMatch) {
        return;
      }
      const nextNode = el.nextSibling;
      const parent = el.parentElement;
      const anchor = new Text("");
      parent.insertBefore(anchor, el);
      parent.removeChild(el);
      const sourceExp = inMatch[2].trim();
      let valueExp = inMatch[1].trim().replace(stripParensRE, "").trim();
      let destructureBindings;
      let isArrayDestructure = false;
      let indexExp;
      let objIndexExp;
      let keyAttr = "key";
      let keyExp = el.getAttribute(keyAttr) || el.getAttribute(keyAttr = ":key") || el.getAttribute(keyAttr = "v-bind:key");
      if (keyExp) {
        el.removeAttribute(keyAttr);
        if (keyAttr === "key")
          keyExp = JSON.stringify(keyExp);
      }
      let match;
      if (match = valueExp.match(forIteratorRE)) {
        valueExp = valueExp.replace(forIteratorRE, "").trim();
        indexExp = match[1].trim();
        if (match[2]) {
          objIndexExp = match[2].trim();
        }
      }
      if (match = valueExp.match(destructureRE)) {
        destructureBindings = match[1].split(",").map((s) => s.trim());
        isArrayDestructure = valueExp[0] === "[";
      }
      let mounted = false;
      let blocks;
      let childCtxs;
      let keyToIndexMap;
      const createChildContexts = (source) => {
        const map = /* @__PURE__ */ new Map();
        const ctxs = [];
        if (isArray(source)) {
          for (let i = 0; i < source.length; i++) {
            ctxs.push(createChildContext(map, source[i], i));
          }
        } else if (typeof source === "number") {
          for (let i = 0; i < source; i++) {
            ctxs.push(createChildContext(map, i + 1, i));
          }
        } else if (isObject(source)) {
          let i = 0;
          for (const key in source) {
            ctxs.push(createChildContext(map, source[key], i++, key));
          }
        }
        return [ctxs, map];
      };
      const createChildContext = (map, value, index, objKey) => {
        const data = {};
        if (destructureBindings) {
          destructureBindings.forEach(
            (b, i) => data[b] = value[isArrayDestructure ? i : b]
          );
        } else {
          data[valueExp] = value;
        }
        if (objKey) {
          indexExp && (data[indexExp] = objKey);
          objIndexExp && (data[objIndexExp] = index);
        } else {
          indexExp && (data[indexExp] = index);
        }
        const childCtx = createScopedContext(ctx, data);
        const key = keyExp ? evaluate(childCtx.scope, keyExp) : index;
        map.set(key, index);
        childCtx.key = key;
        return childCtx;
      };
      const mountBlock = (ctx2, ref) => {
        const block = new Block(el, ctx2);
        block.key = ctx2.key;
        block.insert(parent, ref);
        return block;
      };
      ctx.effect(() => {
        const source = evaluate(ctx.scope, sourceExp);
        const prevKeyToIndexMap = keyToIndexMap;
        [childCtxs, keyToIndexMap] = createChildContexts(source);
        if (!mounted) {
          blocks = childCtxs.map((s) => mountBlock(s, anchor));
          mounted = true;
        } else {
          for (let i2 = 0; i2 < blocks.length; i2++) {
            if (!keyToIndexMap.has(blocks[i2].key)) {
              blocks[i2].remove();
            }
          }
          const nextBlocks = [];
          let i = childCtxs.length;
          let nextBlock;
          let prevMovedBlock;
          while (i--) {
            const childCtx = childCtxs[i];
            const oldIndex = prevKeyToIndexMap.get(childCtx.key);
            let block;
            if (oldIndex == null) {
              block = mountBlock(
                childCtx,
                nextBlock ? nextBlock.el : anchor
              );
            } else {
              block = blocks[oldIndex];
              Object.assign(block.ctx.scope, childCtx.scope);
              if (oldIndex !== i) {
                if (blocks[oldIndex + 1] !== nextBlock || prevMovedBlock === nextBlock) {
                  prevMovedBlock = block;
                  block.insert(parent, nextBlock ? nextBlock.el : anchor);
                }
              }
            }
            nextBlocks.unshift(nextBlock = block);
          }
          blocks = nextBlocks;
        }
      });
      return nextNode;
    };

    const ref = ({
      el,
      ctx: {
        scope: { $refs }
      },
      get,
      effect
    }) => {
      let prevRef;
      effect(() => {
        const ref2 = get();
        $refs[ref2] = el;
        if (prevRef && ref2 !== prevRef) {
          delete $refs[prevRef];
        }
        prevRef = ref2;
      });
      return () => {
        prevRef && delete $refs[prevRef];
      };
    };

    const dirRE = /^(?:v-|:|@)/;
    const modifierRE = /\.([\w-]+)/g;
    let inOnce = false;
    const walk = (node, ctx) => {
      const type = node.nodeType;
      if (type === 1) {
        const el = node;
        if (el.hasAttribute("v-pre")) {
          return;
        }
        checkAttr(el, "v-cloak");
        let exp;
        if (exp = checkAttr(el, "v-if")) {
          return _if(el, exp, ctx);
        }
        if (exp = checkAttr(el, "v-for")) {
          return _for(el, exp, ctx);
        }
        if ((exp = checkAttr(el, "v-scope")) || exp === "") {
          const scope = exp ? evaluate(ctx.scope, exp) : {};
          ctx = createScopedContext(ctx, scope);
          if (scope.$template) {
            resolveTemplate(el, scope.$template);
          }
        }
        const hasVOnce = checkAttr(el, "v-once") != null;
        if (hasVOnce) {
          inOnce = true;
        }
        if (exp = checkAttr(el, "ref")) {
          applyDirective(el, ref, `"${exp}"`, ctx);
        }
        walkChildren(el, ctx);
        const deferred = [];
        for (const { name, value } of [...el.attributes]) {
          if (dirRE.test(name) && name !== "v-cloak") {
            if (name === "v-model") {
              deferred.unshift([name, value]);
            } else if (name[0] === "@" || /^v-on\b/.test(name)) {
              deferred.push([name, value]);
            } else {
              processDirective(el, name, value, ctx);
            }
          }
        }
        for (const [name, value] of deferred) {
          processDirective(el, name, value, ctx);
        }
        if (hasVOnce) {
          inOnce = false;
        }
      } else if (type === 3) {
        const data = node.data;
        if (data.includes(ctx.delimiters[0])) {
          let segments = [];
          let lastIndex = 0;
          let match;
          while (match = ctx.delimitersRE.exec(data)) {
            const leading = data.slice(lastIndex, match.index);
            if (leading)
              segments.push(JSON.stringify(leading));
            segments.push(`$s(${match[1]})`);
            lastIndex = match.index + match[0].length;
          }
          if (lastIndex < data.length) {
            segments.push(JSON.stringify(data.slice(lastIndex)));
          }
          applyDirective(node, text, segments.join("+"), ctx);
        }
      } else if (type === 11) {
        walkChildren(node, ctx);
      }
    };
    const walkChildren = (node, ctx) => {
      let child = node.firstChild;
      while (child) {
        child = walk(child, ctx) || child.nextSibling;
      }
    };
    const processDirective = (el, raw, exp, ctx) => {
      let dir;
      let arg;
      let modifiers;
      const attrName = raw;
      raw = raw.replace(modifierRE, (_, m) => {
        (modifiers || (modifiers = {}))[m] = true;
        return "";
      });
      if (raw[0] === ":") {
        dir = bind;
        arg = raw.slice(1);
      } else if (raw[0] === "@") {
        dir = on;
        arg = raw.slice(1);
      } else {
        const argIndex = raw.indexOf(":");
        const dirName = argIndex > 0 ? raw.slice(2, argIndex) : raw.slice(2);
        dir = builtInDirectives[dirName] || ctx.dirs[dirName];
        arg = argIndex > 0 ? raw.slice(argIndex + 1) : void 0;
      }
      if (dir) {
        if (dir === bind && arg === "ref")
          dir = ref;
        applyDirective(el, dir, exp, ctx, arg, modifiers);
        el.removeAttribute(attrName);
      }
    };
    const applyDirective = (el, dir, exp, ctx, arg, modifiers) => {
      const get = (e = exp) => evaluate(ctx.scope, e, el);
      const cleanup = dir({
        el,
        get,
        effect: ctx.effect,
        ctx,
        exp,
        arg,
        modifiers
      });
      if (cleanup) {
        ctx.cleanups.push(cleanup);
      }
    };
    const resolveTemplate = (el, template) => {
      if (template[0] === "#") {
        const templateEl = document.querySelector(template);
        el.appendChild(templateEl.content.cloneNode(true));
        return;
      }
      el.innerHTML = template;
    };

    const createContext = (parent) => {
      const ctx = {
        delimiters: ["{{", "}}"],
        delimitersRE: /\{\{([^]+?)\}\}/g,
        ...parent,
        scope: parent ? parent.scope : reactive({}),
        dirs: parent ? parent.dirs : {},
        effects: [],
        blocks: [],
        cleanups: [],
        effect: (fn) => {
          if (inOnce) {
            queueJob(fn);
            return fn;
          }
          const e = effect$1(fn, {
            scheduler: () => queueJob(e)
          });
          ctx.effects.push(e);
          return e;
        }
      };
      return ctx;
    };
    const createScopedContext = (ctx, data = {}) => {
      const parentScope = ctx.scope;
      const mergedScope = Object.create(parentScope);
      Object.defineProperties(mergedScope, Object.getOwnPropertyDescriptors(data));
      mergedScope.$refs = Object.create(parentScope.$refs);
      const reactiveProxy = reactive(
        new Proxy(mergedScope, {
          set(target, key, val, receiver) {
            if (receiver === reactiveProxy && !target.hasOwnProperty(key)) {
              return Reflect.set(parentScope, key, val);
            }
            return Reflect.set(target, key, val, receiver);
          }
        })
      );
      bindContextMethods(reactiveProxy);
      return {
        ...ctx,
        scope: reactiveProxy
      };
    };
    const bindContextMethods = (scope) => {
      for (const key of Object.keys(scope)) {
        if (typeof scope[key] === "function") {
          scope[key] = scope[key].bind(scope);
        }
      }
    };

    class Block {
      get el() {
        return this.start || this.template;
      }
      constructor(template, parentCtx, isRoot = false) {
        this.isFragment = template instanceof HTMLTemplateElement;
        if (isRoot) {
          this.template = template;
        } else if (this.isFragment) {
          this.template = template.content.cloneNode(
            true
          );
        } else {
          this.template = template.cloneNode(true);
        }
        if (isRoot) {
          this.ctx = parentCtx;
        } else {
          this.parentCtx = parentCtx;
          parentCtx.blocks.push(this);
          this.ctx = createContext(parentCtx);
        }
        walk(this.template, this.ctx);
      }
      insert(parent, anchor = null) {
        if (this.isFragment) {
          if (this.start) {
            let node = this.start;
            let next;
            while (node) {
              next = node.nextSibling;
              parent.insertBefore(node, anchor);
              if (node === this.end)
                break;
              node = next;
            }
          } else {
            this.start = new Text("");
            this.end = new Text("");
            parent.insertBefore(this.end, anchor);
            parent.insertBefore(this.start, this.end);
            parent.insertBefore(this.template, this.end);
          }
        } else {
          parent.insertBefore(this.template, anchor);
        }
      }
      remove() {
        if (this.parentCtx) {
          remove(this.parentCtx.blocks, this);
        }
        if (this.start) {
          const parent = this.start.parentNode;
          let node = this.start;
          let next;
          while (node) {
            next = node.nextSibling;
            parent.removeChild(node);
            if (node === this.end)
              break;
            node = next;
          }
        } else {
          try {
            if (this.template.isConnected) {
              this.template.parentNode.removeChild(this.template);
            }
          } catch (error) {
            console.log("petite-vue: Unable to remove template");
            console.log(error);
            console.log(this.template);
          }
        }
        this.teardown();
      }
      teardown() {
        this.ctx.blocks.forEach((child) => {
          child.teardown();
        });
        this.ctx.effects.forEach(stop);
        this.ctx.cleanups.forEach((fn) => fn());
      }
    }

    const escapeRegex = (str) => str.replace(/[-.*+?^${}()|[\]\/\\]/g, "\\$&");
    const createApp = (initialData) => {
      const ctx = createContext();
      if (initialData) {
        ctx.scope = reactive(initialData);
        bindContextMethods(ctx.scope);
        if (initialData.$delimiters) {
          const [open, close] = ctx.delimiters = initialData.$delimiters;
          ctx.delimitersRE = new RegExp(
            escapeRegex(open) + "([^]+?)" + escapeRegex(close),
            "g"
          );
        }
      }
      ctx.scope.$s = toDisplayString;
      ctx.scope.$nextTick = nextTick;
      ctx.scope.$refs = /* @__PURE__ */ Object.create(null);
      let rootBlocks;
      return {
        directive(name, def) {
          if (def) {
            ctx.dirs[name] = def;
            return this;
          } else {
            return ctx.dirs[name];
          }
        },
        mount(el) {
          if (typeof el === "string") {
            el = document.querySelector(el);
            if (!el) {
              return;
            }
          }
          el = el || document.documentElement;
          let roots;
          if (el.hasAttribute("v-scope")) {
            roots = [el];
          } else {
            roots = [...el.querySelectorAll(`[v-scope]`)].filter(
              (root) => !root.matches(`[v-scope] [v-scope]`)
            );
          }
          if (!roots.length) {
            roots = [el];
          }
          rootBlocks = roots.map((el2) => new Block(el2, ctx, true));
          return this;
        },
        unmount() {
          rootBlocks.forEach((block) => block.teardown());
        }
      };
    };

    const s = document.currentScript;
    if (s && s.hasAttribute("init")) {
      createApp().mount();
    }

    exports.createApp = createApp;
    exports.nextTick = nextTick;
    exports.reactive = reactive;

    Object.defineProperties(exports, { __esModule: { value: true }, [Symbol.toStringTag]: { value: 'Module' } });

    return exports;

})({});
